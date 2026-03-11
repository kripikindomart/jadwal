<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import api from '@/lib/api'

const route = useRoute()
const requestData = ref<any>(null)
const loading = ref(true)

const fetchRequestDetails = async () => {
  try {
    if (route.query.public_ticket) {
      // Public route (unauthenticated) fetch
      const res = await api.get(`/public-letters/print/${route.query.public_ticket}`)
      requestData.value = res.data
    } else {
      // Admin route fetch
      const res = await api.get(`/letters/requests/${route.params.id}`)
      requestData.value = res.data
    }
  } catch (e) {
    console.error(e)
    alert('Gagal memuat data surat')
  } finally {
    loading.value = false
    
    // Auto trigger print dialog after small delay to ensure rendering
    setTimeout(() => {
      window.print()
    }, 500)
  }
}

// Format date to local Indonesian format
const formatIndonesianDate = (dateString?: string) => {
  const date = dateString ? new Date(dateString) : new Date()
  const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`
}

// Compute the merged HTML template
const compiledHTML = computed(() => {
  if (!requestData.value || !requestData.value.letterType) return ''
  
  const templateObj = requestData.value.letterType.template
  if (!templateObj || !templateObj.htmlContent) {
    return `
      <div style="font-family: sans-serif; text-align: center; padding: 50px;">
        <h2>Template Surat Belum Diatur</h2>
        <p>Silakan hubungi administrator untuk mengatur <b>Template Cetak Surat</b> pada jenis surat ini.</p>
      </div>
    `
  }

  let templateText = templateObj.htmlContent

  // Render Kop Surat (Header) at the very top if exists
  if (templateObj.headerImageUrl) {
    const headerHtml = `<div style="margin-bottom: 2rem; text-align: center;"><img src="${templateObj.headerImageUrl}" alt="Kop Surat" style="max-width: 100%; height: auto;" /></div>`
    templateText = headerHtml + templateText
  }

  // 1. Core Profile Variables
  templateText = templateText.replace(/\[nama\]/gi, requestData.value.requesterName || '')
  templateText = templateText.replace(/\[nim\]/gi, requestData.value.requesterNim || '')
  templateText = templateText.replace(/\[email\]/gi, requestData.value.requesterEmail || '')
  templateText = templateText.replace(/\[phone\]/gi, requestData.value.requesterPhone || '')
  templateText = templateText.replace(/\[tanggal_surat\]/gi, formatIndonesianDate())

  // Note: Prodi name isn't stored directly on the request entity in our current backend simple shape.
  // It only stores prodiId. So we'll try to replace [prodi] with a placeholder or the ID if the name isn't joined.
  templateText = templateText.replace(/\[prodi\]/gi, requestData.value.prodi?.name || '')

  // 1.5 Explicit Variable Mapping (Mail Merge)
  const data: Record<string, any> = requestData.value.submittedData || {}
  const mappings: Record<string, string> = requestData.value.letterType.variableMapping || {}
  
  for (const [tag, fieldId] of Object.entries(mappings)) {
    if (fieldId && data[fieldId]) {
      // Escape brackets for Regex
      const safeTag = tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      templateText = templateText.replace(new RegExp(safeTag, 'gi'), data[fieldId])
    }
  }

  // 2. Custom Form Data Variables (Implicit Label Matching - Fallbacks)
  // e.g. [Keperluan_Surat] -> mapped from submittedData[field_id] where field.label == 'Keperluan Surat'
  const fields = requestData.value.letterType.fields || []
  
  for (const field of fields) {
    const fieldVal = data[field.id] || ''
    
    // Replace by Field ID: [field_xxxx]
    templateText = templateText.replace(new RegExp(`\\[${field.id}\\]`, 'gi'), fieldVal)
    
    // Replace by Label: [Label_Titik]
    if (field.label) {
      const labelTag = field.label.replace(/[^a-zA-Z0-9]/g, '_')
      templateText = templateText.replace(new RegExp(`\\[${labelTag}\\]`, 'gi'), fieldVal)
      // also try exact match if someone typed [Jenis Surat]
      templateText = templateText.replace(new RegExp(`\\[${field.label}\\]`, 'gi'), fieldVal)
    }
  }

  // Fallback cleanup for remaining unmapped tags
  templateText = templateText.replace(/\[.+?\]/g, '<span style="color:red">[Data Kosong]</span>')

  // Build bottom section: Tembusan (left) + Signature (right)
  let bottomHtml = ''
  const hasSignature = templateObj.signatureType === 'barcode' || templateObj.signatureImageUrl || templateObj.signatureName
  const hasTembusan = templateObj.tembusanText && templateObj.tembusanText.trim()

  if (hasSignature || hasTembusan) {
    bottomHtml += '<div style="margin-top: 40px; display: flex; justify-content: space-between; align-items: flex-start;">'

    // Tembusan (left side)
    if (hasTembusan) {
      const tembusanLines = templateObj.tembusanText.trim().split('\n').map((l: string) => `<li style="margin-bottom: 2px;">${l.replace(/^\d+\.\s*/, '')}</li>`).join('')
      bottomHtml += `
        <div style="width: 50%; text-align: left;">
          <p style="margin-bottom: 5px; font-weight: bold; text-decoration: underline;">Tembusan:</p>
          <ol style="margin: 0; padding-left: 18px; font-size: 12px;">${tembusanLines}</ol>
        </div>`
    } else {
      bottomHtml += '<div></div>'
    }

    // Signature (right side)
    if (hasSignature) {
      const signatureTitle = templateObj.signatureTitle ? templateObj.signatureTitle.replace(/\n/g, '<br>') : 'Mengetahui,'
      const signatureName = templateObj.signatureName || '...................................'
      const signatureLocation = templateObj.signatureLocation || ''

      let signatureImageHtml = ''
      if (templateObj.signatureType === 'barcode' && requestData.value.ticketNumber) {
        const verifyUrl = `${window.location.origin}/layanan-surat/track/${requestData.value.ticketNumber}`
        const barcodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(verifyUrl)}&margin=0`
        signatureImageHtml = `
          <img src="${barcodeUrl}" alt="QR Code" style="display: block; height: 100px; width: 100px; margin: 8px auto 4px auto;" />
          <p style="margin: 0 0 8px 0; font-size: 10px; color: #555; font-style: italic;">Dokumen ini telah ditandatangani secara elektronik</p>
        `
      } else if (templateObj.signatureImageUrl) {
        signatureImageHtml = `<img src="${templateObj.signatureImageUrl}" alt="TTD" style="display: block; max-height: 100px; width: auto; mix-blend-mode: multiply; margin: 8px auto;" />`
      } else {
        signatureImageHtml = '<div style="height: 80px;"></div>'
      }

      bottomHtml += `
        <div style="text-align: center; width: 280px;">
          ${signatureLocation ? `<p style="margin-bottom: 5px; font-size: 14px;">${signatureLocation}</p>` : ''}
          <p style="margin: 0; font-size: 14px;">${signatureTitle}</p>
          ${signatureImageHtml}
          <p style="margin: 0; font-weight: bold; font-size: 14px; text-decoration: underline;">${signatureName}</p>
        </div>`
    }

    bottomHtml += '</div>'
    templateText += bottomHtml
  }

  return templateText
})

onMounted(() => {
  fetchRequestDetails()
})
</script>

<template>
  <div class="print-container">
    <div v-if="loading" class="no-print" style="text-align: center; padding: 50px; font-family: sans-serif;">
      Memuat dokumen...
    </div>
    
    <div v-else class="print-content" v-html="compiledHTML"></div>

    <!-- Print Control Buttons (Hidden during actual printing) -->
    <div v-if="!loading" class="no-print print-controls">
      <button onclick="window.print()" class="print-btn">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M6 14h12v8H6z"/></svg>
        Cetak Dokumen
      </button>
      <button onclick="window.close()" class="close-btn">
        Tutup
      </button>
    </div>
  </div>
</template>

<style>
/* CSS Reset specifically for printing A4 */
body, html {
  margin: 0;
  padding: 0;
  background-color: #f3f4f6;
}

.print-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 2rem;
  min-height: 100vh;
}

.print-content {
  background: white;
  width: 21cm;
  min-height: 29.7cm;
  padding: 2cm;
  box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
  box-sizing: border-box;
}

/* Controls */
.print-controls {
  position: fixed;
  bottom: 2rem;
  right: 2rem;
  display: flex;
  gap: 1rem;
  background: white;
  padding: 1rem;
  border-radius: 0.75rem;
  box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1);
}

.print-btn, .close-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  font-family: system-ui, -apple-system, sans-serif;
  font-weight: 600;
  border-radius: 0.5rem;
  cursor: pointer;
  border: none;
}

.print-btn {
  background-color: #4f46e5;
  color: white;
}
.print-btn:hover { background-color: #4338ca; }

.close-btn {
  background-color: #f3f4f6;
  color: #374151;
}
.close-btn:hover { background-color: #e5e7eb; }

/* ACTUAL PRINT MEDIA QUERIES */
@media print {
  @page {
    size: A4;
    margin: 0; /* Let the content padding handle margins */
  }
  
  body, html {
    background-color: white;
  }
  
  .print-container {
    padding: 0;
  }
  
  .print-content {
    box-shadow: none;
    width: 100%;
    margin: 0;
    /* Use exact padding for print */
    padding: 2cm;
  }
  
  .no-print {
    display: none !important;
  }
}
</style>
