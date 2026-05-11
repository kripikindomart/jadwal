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
    if (!route.query.preview) {
      setTimeout(() => {
        window.print()
      }, 500)
    }
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
  let globalFontFamily = "'Times New Roman', Times, serif"
  let globalFontSize = "12"
  let tembusanFontSize = "10"

  if (templateObj.editorType === 'form') {
    try {
      const formData = JSON.parse(templateText)
      let generatedHtml = ''
      
      if (formData.identityTable) {
        globalFontFamily = formData.identityTable.fontFamily || globalFontFamily
        globalFontSize = formData.identityTable.fontSize || globalFontSize
      }
      if (formData.tembusanFontSize) {
        tembusanFontSize = formData.tembusanFontSize
      }
      
      // 1. Metadata Table
      let metadataRows = []
      if (formData.metadata.showNomor) metadataRows.push({ label: 'Nomor', tag: '[nomor_surat]' })
      if (formData.metadata.showLampiran) metadataRows.push({ label: 'Lampiran', tag: '[lampiran]' })
      if (formData.metadata.showPerihal) metadataRows.push({ label: 'Perihal', tag: '[perihal]' })

      if (metadataRows.length > 0) {
        let metaHtml = `<table style="width:100%; border-collapse:collapse; margin-bottom:8px; border: none; font-family: ${globalFontFamily}; font-size: ${globalFontSize}pt;"><tbody>`
        metadataRows.forEach((row, idx) => {
          let rightCol = ''
          if (idx === 0) {
            rightCol = `<td style="padding:4px 0; width:40%; border:none; vertical-align: top; text-align: right;" rowspan="${metadataRows.length}">Bogor, [tanggal_surat]</td>`
          }
          metaHtml += `<tr><td style="padding:4px 0; width:80px; border:none; vertical-align: top;">${row.label}</td><td style="padding:4px 8px 4px 0; width:15px; border:none; vertical-align: top; text-align: center;">:</td><td style="padding:4px 0; border:none; vertical-align: top;">${row.tag}</td>${rightCol}</tr>`
        })
        metaHtml += `</tbody></table>`
        generatedHtml += metaHtml
      } else {
        generatedHtml += `<div style="text-align:right; margin-bottom: 20px; font-family: ${globalFontFamily}; font-size: ${globalFontSize}pt;">Bogor, [tanggal_surat]</div>`
      }

      let contentHtml = ''

      // Helper: process paragraphs
      const fixParagraphs = (html: string, indent: string = '103px') => {
        // Fix empty paragraphs so Enter shows as gap
        let processedHtml = html.replace(/<p><\/p>/gi, '<p><br></p>')
        processedHtml = processedHtml.replace(/<p>\s*<br\s*\/?>\s*<\/p>/gi, '<p style="min-height: 1.5em;"><br></p>')
        
        // Match ALL <p> tags (with or without attributes) and inject styles
        processedHtml = processedHtml.replace(/<p(\s[^>]*)?>|<p>/gi, (match, attrs) => {
          const baseStyle = `text-align: justify; margin: 0 0 0.5em 0; margin-left: ${indent}; line-height: 1.5; font-family: ${globalFontFamily}; font-size: ${globalFontSize}pt; color: black;`
          if (!attrs || attrs.trim() === '') {
            return `<p style="${baseStyle}">`
          }
          if (/style\s*=/i.test(attrs)) {
            return match.replace(/style\s*=\s*"([^"]*)"/i, (_m: string, existing: string) => `style="${existing}; ${baseStyle}"`)
          }
          return `<p${attrs} style="${baseStyle}">`
        })
        return processedHtml
      }

      if (formData.metadata.tujuan) {
        contentHtml += `
          <div style="text-align:left; margin-top: 0; margin-bottom: 10px; margin-left: 103px; line-height: 1.5; font-family: ${globalFontFamily}; font-size: ${globalFontSize}pt; color: black;">
            Kepada Yth.<br>${formData.metadata.tujuan.replace(/\n/g, '<br>')}
          </div>
        `
      }

      // 2. Opening (Flush with Nomor text)
      if (formData.openingText) {
        contentHtml += `
          <div style="margin-bottom: 12px; line-height: 1.5;">
            ${fixParagraphs(formData.openingText, '103px')}
          </div>
        `
      }

      // 3. Identity Table (Indented relative to Nomor text)
      if (formData.identityTable?.show && formData.identityTable.fields?.length) {
        let idRows = ''
        formData.identityTable.fields.forEach((f: any) => {
          idRows += `
            <tr>
              <td style="padding:4px 8px 4px 0; width:150px; border:none; vertical-align: top;">${f.key}</td>
              <td style="padding:4px 8px 4px 0; width:15px; border:none; vertical-align: top; text-align: center;">:</td>
              <td style="padding:4px 0; border:none; vertical-align: top;">${f.tag}</td>
            </tr>
          `
        })
        contentHtml += `
          <table style="width:calc(100% - 103px - 1.5cm); border-collapse:collapse; margin:12px 0 12px calc(103px + 1.5cm); border: none; font-family: ${globalFontFamily}; font-size: ${globalFontSize}pt;">
            <tbody>${idRows}</tbody>
          </table>
        `
      }

      // 4. Body (Flush with Nomor text)
      if (formData.bodyText) {
        contentHtml += `
          <div style="margin-bottom: 12px; line-height: 1.5;">
            ${fixParagraphs(formData.bodyText, '103px')}
          </div>
        `
      }

      // 5. Closing (Flush with Nomor text)
      if (formData.closingText) {
        contentHtml += `
          <div style="margin-bottom: 12px; line-height: 1.5;">
            ${fixParagraphs(formData.closingText, '103px')}
          </div>
        `
      }

      generatedHtml += contentHtml
      templateText = generatedHtml
    } catch (e) {
      console.error('Failed to parse form data', e)
    }
  }

  // Render Kop Surat (Header) at the very top if exists
  if (templateObj.headerMode === 'form' && templateObj.headerHtmlContent) {
    try {
      const hd = JSON.parse(templateObj.headerHtmlContent)
      let headerHtml = `
        <table style="width: 100%; border-collapse: collapse; font-family: ${hd.fontFamily || "'Times New Roman', Times, serif"};">
          <tr>
            ${hd.logoUrl ? `<td style="width: 110px; vertical-align: middle; text-align: center; padding-bottom: 10px; border: none;">
              <img src="${hd.logoUrl}" style="max-width: 100px; max-height: 100px;" />
            </td>` : ''}
            <td style="vertical-align: middle; text-align: center; padding-bottom: 10px; border: none;">
              ${hd.title1 ? `<div style="font-size: ${hd.title1Size || 14}pt; font-weight: normal; margin-bottom: ${hd.spacing ?? 2}px; line-height: 1.1;">${hd.title1}</div>` : ''}
              ${hd.title2 ? `<div style="font-size: ${hd.title2Size || 16}pt; font-weight: bold; margin-bottom: ${hd.spacing ?? 2}px; line-height: 1.1;">${hd.title2}</div>` : ''}
              ${hd.title3 ? `<div style="font-size: ${hd.title3Size || 14}pt; font-weight: bold; margin-bottom: ${hd.spacing ?? 2}px; line-height: 1.1;">${hd.title3}</div>` : ''}
              ${hd.address ? `<div style="font-size: ${hd.addressSize || 10}pt; font-weight: normal; line-height: 1.1;">${hd.address.replace(/\n/g, '<br>')}</div>` : ''}
            </td>
          </tr>
        </table>
        <hr style="border: none; border-top: 3px solid black; border-bottom: 1px solid black; height: 1px; margin: 0; padding: 0;">
      `
      templateText = headerHtml + templateText
    } catch (e) {
      console.error('Failed to parse header form data', e)
    }
  } else if (templateObj.headerMode === 'editor' && templateObj.headerHtmlContent) {
    const headerHtml = `<div style="margin-bottom: 0.5rem;">${templateObj.headerHtmlContent}</div>`
    templateText = headerHtml + templateText
  } else if (templateObj.headerImageUrl) {
    const headerHtml = `<div style="margin-bottom: 0.5rem; text-align: center;"><img src="${templateObj.headerImageUrl}" alt="Kop Surat" style="max-width: 100%; height: auto;" /></div>`
    templateText = headerHtml + templateText
  }

  // 1. Core Profile Variables
  templateText = templateText.replace(/\[nama\]/gi, requestData.value.requesterName || '')
  templateText = templateText.replace(/\[nim\]/gi, requestData.value.requesterNim || '')
  templateText = templateText.replace(/\[email\]/gi, requestData.value.requesterEmail || '')
  templateText = templateText.replace(/\[phone\]/gi, requestData.value.requesterPhone || '')
  
  // Use admin-set tanggal if available, otherwise auto-generate
  const tanggalSurat = requestData.value.tanggalSurat || formatIndonesianDate()
  templateText = templateText.replace(/\[tanggal_surat\]/gi, tanggalSurat)

  // Metadata variables (admin-filled per request)
  templateText = templateText.replace(/\[nomor_surat\]/gi, requestData.value.nomorSurat || '')
  templateText = templateText.replace(/\[lampiran\]/gi, requestData.value.lampiran || '-')
  templateText = templateText.replace(/\[perihal\]/gi, requestData.value.perihal || '')
  templateText = templateText.replace(/\[tujuan_surat\]/gi, requestData.value.tujuanSurat || '')

  // Note: Prodi name
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

  // Build bottom section: Signature and Tembusan
  let bottomHtml = ''
  const hasSignature = ['barcode', 'both', 'manual'].includes(templateObj.signatureType) || templateObj.signatureImageUrl || templateObj.signatureName
  const hasTembusan = templateObj.tembusanText && templateObj.tembusanText.trim()

  if (hasSignature || hasTembusan) {
    let alignValue = 'flex-end';
    if (templateObj.signatureAlignment === 'left') alignValue = 'flex-start';
    if (templateObj.signatureAlignment === 'center') alignValue = 'center';

    bottomHtml += `<div style="margin-top: 40px; display: flex; justify-content: ${alignValue};">`

    // Signature
    if (hasSignature) {
      const signatureTitle = templateObj.signatureTitle ? templateObj.signatureTitle.replace(/\n/g, '<br>') : 'Mengetahui,'
      const signatureName = templateObj.signatureName || '...................................'
      const signatureLocation = templateObj.signatureLocation || ''

      let signatureImageHtml = ''
      const ticketNum = requestData.value?.ticketNumber || ''
      const watermarkText = ticketNum ? `${ticketNum} • ${ticketNum} • ${ticketNum}` : ''

      if (templateObj.signatureType === 'barcode' && requestData.value.ticketNumber) {
        const verifyUrl = `${window.location.origin}/layanan-surat/track/${requestData.value.ticketNumber}`
        const barcodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${encodeURIComponent(verifyUrl)}&margin=0`
        signatureImageHtml = `
          <img src="${barcodeUrl}" alt="QR Code" style="display: block; height: 70px; width: 70px; margin: 8px auto 4px auto;" />
          <p style="margin: 0 0 8px 0; font-size: 9px; color: #333; font-style: italic;">Dokumen ini telah ditandatangani secara elektronik</p>
        `
      } else if (templateObj.signatureType === 'both') {
        const verifyUrl = requestData.value.ticketNumber ? `${window.location.origin}/layanan-surat/track/${requestData.value.ticketNumber}` : ''
        const barcodeUrl = verifyUrl ? `https://api.qrserver.com/v1/create-qr-code/?size=60x60&data=${encodeURIComponent(verifyUrl)}&margin=0` : ''
        const ttdImgTag = templateObj.signatureImageUrl ? `<img src="${templateObj.signatureImageUrl}" alt="TTD" style="display: block; max-height: 80px; width: auto; mix-blend-mode: multiply;" />` : '<div style="height: 60px; width: 80px;"></div>'
        
        signatureImageHtml = `
          <div style="position: relative; display: flex; align-items: center; justify-content: center; gap: 10px; margin: 8px 0;">
            ${barcodeUrl ? `<img src="${barcodeUrl}" alt="QR Code" style="display: block; height: 60px; width: 60px;" />` : ''}
            <div style="position: relative; display: inline-block;">
              ${ttdImgTag}
              ${watermarkText ? `<div style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; pointer-events: none; overflow: hidden;">
                <span style="font-size: 7px; color: rgba(0,0,0,0.08); transform: rotate(-30deg); white-space: nowrap; letter-spacing: 1px; user-select: none;">${watermarkText}</span>
              </div>` : ''}
            </div>
          </div>
          <p style="margin: 0 0 8px 0; font-size: 9px; color: #333; font-style: italic;">Dokumen ini sah secara elektronik</p>
        `
      } else if (templateObj.signatureImageUrl) {
        signatureImageHtml = `
          <div style="position: relative; display: inline-block; margin: 8px auto;">
            <img src="${templateObj.signatureImageUrl}" alt="TTD" style="display: block; max-height: 100px; width: auto; mix-blend-mode: multiply;" />
            ${watermarkText ? `<div style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; pointer-events: none; overflow: hidden;">
              <span style="font-size: 7px; color: rgba(0,0,0,0.08); transform: rotate(-30deg); white-space: nowrap; letter-spacing: 1px; user-select: none;">${watermarkText}</span>
            </div>` : ''}
          </div>
        `
      } else {
        signatureImageHtml = '<div style="height: 80px;"></div>'
      }

      bottomHtml += `
        <div style="text-align: center; width: 280px; color: black; font-family: ${globalFontFamily};">
          ${signatureLocation ? `<p style="margin-bottom: 5px; font-size: ${globalFontSize}pt; color: black;">${signatureLocation}</p>` : ''}
          <p style="margin: 0; font-size: ${globalFontSize}pt; color: black;">${signatureTitle}</p>
          ${signatureImageHtml}
          <p style="margin: 0; font-weight: bold; font-size: ${globalFontSize}pt; text-decoration: underline; color: black;">${signatureName}</p>
          ${templateObj.signatureNik ? `<p style="margin: 0; font-size: ${globalFontSize}pt; color: black;">NIK: ${templateObj.signatureNik}</p>` : ''}
        </div>`
    }

    bottomHtml += '</div>'

    // Tembusan
    if (hasTembusan) {
      const tembusanLines = templateObj.tembusanText.trim().split('\n').map((l: string) => `<li style="margin-bottom: 2px; color: black;">${l.replace(/^\d+\.\s*/, '')}</li>`).join('')
      bottomHtml += `
        <div style="width: 100%; text-align: left; margin-top: 20px; color: black; font-family: ${globalFontFamily}; font-size: ${tembusanFontSize}pt;">
          <p style="margin-bottom: 5px; color: black;">Tembusan Yth:</p>
          <ol style="margin: 0; padding-left: 18px; color: black; list-style-type: decimal;">${tembusanLines}</ol>
        </div>`
    }

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
    <component :is="'style'">
      @page {
        size: auto;
        margin: 0mm;
      }
    </component>
    
    <div v-if="loading" class="no-print" style="text-align: center; padding: 50px; font-family: sans-serif;">
      Memuat dokumen...
    </div>
    
    <div v-else 
         class="print-content" 
         :style="{
           width: requestData?.letterType?.template?.paperSize === 'F4' ? '21.5cm' : '21cm',
           minHeight: requestData?.letterType?.template?.paperSize === 'F4' ? '33cm' : '29.7cm'
         }"
         v-html="compiledHTML"></div>

    <!-- Print Control Buttons (Hidden during actual printing) -->
    <div v-if="!loading" class="no-print print-controls">
      <template v-if="$route.query.preview">
        <div class="px-4 py-2 bg-yellow-100 text-yellow-800 rounded-lg border border-yellow-200 font-bold flex items-center gap-2">
          Mode Preview
        </div>
        <button onclick="window.close()" class="close-btn border border-gray-300">
          Tutup Preview
        </button>
      </template>
      <template v-else>
        <button onclick="window.print()" class="print-btn">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M6 14h12v8H6z"/></svg>
          Cetak Dokumen
        </button>
        <button onclick="window.close()" class="close-btn border border-gray-300">
          Tutup
        </button>
      </template>
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
  padding: 0.5cm 1.5cm;
  box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
  box-sizing: border-box;
  color: #000;
}

.print-content * {
  color: #000 !important;
}

.print-content table td, .print-content table th {
  vertical-align: top;
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
  body, html {
    background-color: white !important;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  
  #app, .print-container {
    padding: 0 !important;
    margin: 0 !important;
    background-color: white !important;
  }
  
  .print-content {
    background-color: white !important;
    box-shadow: none !important;
    margin: 0 !important;
    width: 100% !important;
    height: 100% !important;
    min-height: 100vh !important;
    /* 1cm top padding provides a professional margin without being "mentok" */
    padding: 1cm 1.5cm 0.5cm 1.5cm !important;
    page-break-inside: avoid;
    break-inside: avoid;
    border: none !important;
  }
  
  /* Aggressively prevent breaking signature/footer apart from the text */
  .print-content > div:last-child {
    page-break-inside: avoid;
    break-inside: avoid;
  }
  
  .no-print {
    display: none !important;
  }
}
</style>
