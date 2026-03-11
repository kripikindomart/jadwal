<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useToast } from '@/composables/useToast'
import api from '@/lib/api'
import { ArrowLeft, Save, Image as ImageIcon, Table2, LayoutList } from 'lucide-vue-next'
import Editor from '@tinymce/tinymce-vue'

// Import TinyMCE locally to bundle it
import 'tinymce/tinymce'
import 'tinymce/models/dom/model'
import 'tinymce/themes/silver/theme'
import 'tinymce/icons/default/icons'
// Import plugins
import 'tinymce/plugins/advlist'
import 'tinymce/plugins/autolink'
import 'tinymce/plugins/lists'
import 'tinymce/plugins/link'
import 'tinymce/plugins/image'
import 'tinymce/plugins/charmap'
import 'tinymce/plugins/preview'
import 'tinymce/plugins/anchor'
import 'tinymce/plugins/searchreplace'
import 'tinymce/plugins/visualblocks'
import 'tinymce/plugins/code'
import 'tinymce/plugins/fullscreen'
import 'tinymce/plugins/insertdatetime'
import 'tinymce/plugins/media'
import 'tinymce/plugins/table'
import 'tinymce/plugins/help'
import 'tinymce/plugins/wordcount'

import 'tinymce/skins/ui/oxide/skin.css'
import contentCss from 'tinymce/skins/content/default/content.css?raw'
import contentUiCss from 'tinymce/skins/ui/oxide/content.css?raw'

import MediaLibraryModal from './MediaLibraryModal.vue'

const router = useRouter()
const route = useRoute()
const toast = useToast()

const loading = ref(true)
const saving = ref(false)
const templateData = ref<any>({
  id: route.params.id,
  title: '',
  htmlContent: '',
  headerImageUrl: '',
  headerMode: 'image',
  headerHtmlContent: '',
  signatureImageUrl: '',
  signatureName: '',
  signatureType: 'manual',
  signatureTitle: 'Mengetahui,',
  signatureLocation: '',
  signatureAlignment: 'right',
  tembusanText: ''
})

const isMediaLibraryOpen = ref(false)
const mediaLibraryTarget = ref<'editor' | 'header' | 'signature'>('editor')
let activeEditorInstance: any = null

const editorInit = {
  height: 800,
  menubar: false,
  promotion: false,
  skin: false,
  content_css: false,
  resize: false,
  object_resizing: true,
  table_resize_bars: true,
  table_column_resizing: 'resizetable',
  draggable_modal: true,
  plugins: [
    'advlist', 'autolink', 'lists', 'link', 'image', 'charmap', 'preview',
    'anchor', 'searchreplace', 'visualblocks', 'code', 'fullscreen',
    'insertdatetime', 'media', 'table', 'help', 'wordcount'
  ],
  toolbar: 'undo redo | blocks | ' +
    'bold italic underline strikethrough | alignleft aligncenter ' +
    'alignright alignjustify | table tablecellprops tablerowprops | bullist numlist outdent indent | ' +
    'removeformat | image | fullscreen code',
  content_style: `
    ${contentCss}
    ${contentUiCss}
    
    body { font-family:Helvetica,Arial,sans-serif; font-size:14px; padding: 1cm 1.5cm; min-height: 800px; }
    table { width: 100%; border-collapse: collapse; }
    table td, table th { border: 1px solid #ccc; padding: 8px; position: relative; }
    td, th { min-width: 30px; }
    .mce-resize-bar-row { cursor: row-resize !important; }
    .mce-resize-bar-col { cursor: col-resize !important; }
    .ephox-snooker-resizer-bar { background-color: #4099ff; opacity: 0; transition: opacity 0.15s ease; }
    .ephox-snooker-resizer-bar:hover { opacity: 0.3; }
  `,
  table_toolbar: 'tableprops tabledelete | tableinsertrowbefore tableinsertrowafter tabledeleterow | tableinsertcolbefore tableinsertcolafter tabledeletecol',
  setup: (editor: any) => {
    activeEditorInstance = editor
  },
  file_picker_callback: (_cb: any, _value: any, meta: any) => {
    if (meta.filetype === 'image') {
      mediaLibraryTarget.value = 'editor'
      isMediaLibraryOpen.value = true
    }
  }
}

const headerEditorInit = {
  height: 200,
  menubar: false,
  promotion: false,
  skin: false,
  content_css: false,
  resize: false,
  plugins: ['lists', 'link', 'image', 'table', 'code'],
  toolbar: 'undo redo | bold italic underline | alignleft aligncenter alignright | fontsize | forecolor | image | code',
  content_style: `
    ${contentCss}
    ${contentUiCss}
    body { font-family: serif; font-size: 14px; padding: 8px; margin: 0; }
    table { border-collapse: collapse; width: 100%; }
    table td, table th { border: none; padding: 2px 4px; }
  `,
  file_picker_callback: (_cb: any, _value: any, meta: any) => {
    if (meta.filetype === 'image') {
      mediaLibraryTarget.value = 'header'
      isMediaLibraryOpen.value = true
    }
  }
}

// ========== TABLE HELPERS ==========
const insertTable = () => {
  if (!activeEditorInstance) return
  const tableHtml = `
    <table style="width:100%; border-collapse:collapse; margin:12px auto;">
      <tbody>
        <tr><td style="border:1px solid #999; padding:6px 10px;">&nbsp;</td><td style="border:1px solid #999; padding:6px 10px;">&nbsp;</td><td style="border:1px solid #999; padding:6px 10px;">&nbsp;</td></tr>
        <tr><td style="border:1px solid #999; padding:6px 10px;">&nbsp;</td><td style="border:1px solid #999; padding:6px 10px;">&nbsp;</td><td style="border:1px solid #999; padding:6px 10px;">&nbsp;</td></tr>
      </tbody>
    </table><p><br/></p>`
  activeEditorInstance.insertContent(tableHtml)
  toast.success('Tabel 3x2 disisipkan!')
}

const insertTableBorderless = () => {
  if (!activeEditorInstance) return
  const tableHtml = `
    <table style="width:100%; border-collapse:collapse; margin:12px auto; border: none;">
      <tbody>
        <tr><td style="padding:4px 8px; width:30%; border:none;">Nama</td><td style="padding:4px 8px; width:3%; border:none;">:</td><td style="padding:4px 8px; border:none;">[nama]</td></tr>
        <tr><td style="padding:4px 8px; border:none;">NIM</td><td style="padding:4px 8px; border:none;">:</td><td style="padding:4px 8px; border:none;">[nim]</td></tr>
        <tr><td style="padding:4px 8px; border:none;">Program Studi</td><td style="padding:4px 8px; border:none;">:</td><td style="padding:4px 8px; border:none;">[prodi]</td></tr>
      </tbody>
    </table><p><br/></p>`
  activeEditorInstance.insertContent(tableHtml)
  toast.success('Layout identitas (tanpa border) disisipkan!')
}

// ========== MEDIA & HEADER ===========
const openHeaderMediaLibrary = () => {
  mediaLibraryTarget.value = 'header'
  isMediaLibraryOpen.value = true
}

const fetchTemplate = async () => {
  try {
    const res = await api.get(`/letters/templates/${route.params.id}`)
    templateData.value = { ...templateData.value, ...res.data }
  } catch (e: any) {
    toast.error(e.response?.data?.message || 'Gagal mengambil data template')
    router.push({ name: 'letters.templates' })
  } finally {
    loading.value = false
  }
}

const saveContent = async () => {
  if (saving.value) return
  saving.value = true
  try {
    await api.patch(`/letters/templates/${route.params.id}`, {
      htmlContent: templateData.value.htmlContent,
      headerImageUrl: templateData.value.headerImageUrl,
      headerMode: templateData.value.headerMode || 'image',
      headerHtmlContent: templateData.value.headerHtmlContent || '',
      signatureImageUrl: templateData.value.signatureImageUrl,
      signatureName: templateData.value.signatureName,
      signatureType: templateData.value.signatureType,
      signatureTitle: templateData.value.signatureTitle,
      signatureLocation: templateData.value.signatureLocation,
      signatureAlignment: templateData.value.signatureAlignment || 'right',
      tembusanText: templateData.value.tembusanText
    })
    toast.success('Format surat berhasil disimpan!')
  } catch (e: any) {
    toast.error('Gagal menyimpan format.')
  } finally {
    saving.value = false
  }
}

const handleMediaSelect = (url: string) => {
  if (mediaLibraryTarget.value === 'header') {
    templateData.value.headerImageUrl = url
    toast.success('Kop surat berhasil diperbarui!')
  } else if (mediaLibraryTarget.value === 'signature') {
    templateData.value.signatureImageUrl = url
    toast.success('Tanda tangan berhasil diperbarui!')
  } else if (mediaLibraryTarget.value === 'editor') {
    if (activeEditorInstance) {
      activeEditorInstance.insertContent(`<img src="${url}" style="max-width:100%; height:auto;" />`)
      toast.success('Gambar berhasil ditambahkan ke editor!')
    }
  }
}

const removeHeader = () => { templateData.value.headerImageUrl = '' }
const removeSignature = () => { templateData.value.signatureImageUrl = '' }
const openSignatureMediaLibrary = () => {
  mediaLibraryTarget.value = 'signature'
  isMediaLibraryOpen.value = true
}

onMounted(() => { fetchTemplate() })

const standardVariables = [
  { label: 'Nama', tag: '[nama]' },
  { label: 'NIM', tag: '[nim]' },
  { label: 'Phone', tag: '[phone]' },
  { label: 'Email', tag: '[email]' },
  { label: 'Prodi', tag: '[prodi]' },
  { label: 'Tgl Surat', tag: '[tanggal_surat]' },
  { label: 'Nomor Surat', tag: '[nomor_surat]' },
  { label: 'Lampiran', tag: '[lampiran]' },
  { label: 'Perihal', tag: '[perihal]' },
]

const insertVariable = (tag: string) => {
  if (activeEditorInstance) {
    activeEditorInstance.insertContent(tag)
    toast.success(`Variabel ${tag} disisipkan!`)
  }
}
</script>

<template>
  <div class="h-[calc(100vh-2rem)] flex flex-col space-y-3">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-4">
        <button @click="router.push({ name: 'letters.templates' })"
          class="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500">
          <ArrowLeft class="w-5 h-5" />
        </button>
        <div>
          <h1 class="text-xl font-bold text-gray-900">
            Editor Template: {{ templateData.title || 'Memuat...' }}
          </h1>
          <p class="text-sm text-gray-500">Gunakan tag dinamis: <code>[nama]</code>, <code>[nim]</code>, <code>[prodi]</code>, <code>[tanggal_surat]</code></p>
        </div>
      </div>
      <div>
        <button @click="saveContent" :disabled="saving"
          class="px-5 py-2.5 font-bold rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50">
          <Save class="w-4 h-4" /> {{ saving ? 'Menyimpan...' : 'Simpan Perubahan' }}
        </button>
      </div>
    </div>

    <!-- Toolbar: Table & Variable Inserter (Combined) -->
    <div class="bg-white border border-gray-200 p-2 rounded-lg flex flex-wrap items-center gap-2 shrink-0 overflow-x-auto shadow-sm">
      <span class="text-xs font-semibold text-gray-500 uppercase tracking-wider px-1">Sisipkan Cepat:</span>
      <button @click="insertTable()"
        class="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-xs font-medium transition-colors border border-gray-300 flex items-center gap-1" title="Sisipkan tabel kosong 3x2">
        <Table2 class="w-3.5 h-3.5" /> Tabel 3x2
      </button>
      <button @click="insertTableBorderless"
        class="px-2.5 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-700 rounded text-xs font-medium transition-colors border border-teal-200 flex items-center gap-1"
        title="Sisipkan tabel identitas tanpa border (Nama:, NIM:, Prodi:)">
        <LayoutList class="w-3.5 h-3.5" /> Layout Identitas
      </button>

      <span class="h-4 w-px bg-gray-300 mx-1"></span>
      <span class="text-xs font-semibold text-indigo-600 uppercase tracking-wider px-1">Variabel:</span>
      <button v-for="variable in standardVariables" :key="variable.tag" @click="insertVariable(variable.tag)"
        class="px-2 py-1 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-800 rounded text-xs font-medium cursor-pointer transition-colors"
        :title="'Sisipkan ' + variable.tag">
        {{ variable.label }}
      </button>
    </div>

    <!-- Core Editor Area -->
    <div class="flex-1 bg-gray-100 rounded-xl shadow-sm border border-gray-200 overflow-y-auto flex flex-col h-full p-2 relative">
       <!-- Header/Kop Config -->
       <div class="mb-2 p-3 border border-dashed border-gray-300 rounded-xl bg-white flex flex-col items-center justify-center min-h-[80px] shrink-0">
         <!-- Mode Toggle -->
         <div class="flex items-center gap-2 mb-3 w-full">
           <span class="text-xs font-bold text-gray-500 uppercase">Kop Surat:</span>
           <button @click="templateData.headerMode = 'image'" :class="templateData.headerMode === 'image' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'" class="px-3 py-1 rounded-lg text-xs font-medium transition-colors">Mode Gambar</button>
           <button @click="templateData.headerMode = 'editor'" :class="templateData.headerMode === 'editor' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'" class="px-3 py-1 rounded-lg text-xs font-medium transition-colors">Mode Editor</button>
         </div>

         <!-- Image Mode -->
         <template v-if="templateData.headerMode === 'image'">
           <div v-if="templateData.headerImageUrl" class="relative group w-full max-w-2xl shrink-0">
             <img :src="templateData.headerImageUrl" alt="Kop Surat" class="w-full h-auto object-contain rounded-lg shadow-sm bg-white" />
             <div class="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg">
               <button @click="removeHeader" class="text-white px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg font-medium text-sm">
                 Hapus Kop Surat
               </button>
             </div>
           </div>
           <div v-else class="text-center">
             <ImageIcon class="w-8 h-8 text-gray-400 mx-auto mb-2" />
             <p class="text-sm font-medium text-gray-700 mb-2">Belum ada Kop Surat (Opsional)</p>
             <button @click="openHeaderMediaLibrary"
               class="px-4 py-2 text-sm font-medium bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
               Pilih dari Pustaka Media
             </button>
           </div>
         </template>

         <!-- Editor Mode -->
         <template v-else>
           <div class="w-full max-w-2xl">
             <p class="text-xs text-gray-500 mb-2">Ketik dan format Kop Surat secara manual di editor di bawah ini:</p>
             <div class="border border-gray-200 rounded-lg overflow-hidden">
               <Editor
                 v-model="templateData.headerHtmlContent"
                 :init="headerEditorInit"
               />
             </div>
           </div>
         </template>
       </div>

       <div v-if="loading" class="flex-1 flex items-center justify-center text-gray-400">
          Memuat Editor...
       </div>
       <div v-else class="w-full relative flex-1 flex flex-col bg-gray-100 items-center">
         
         <div class="w-full max-w-[21cm] shadow flex flex-col">
            <!-- Editor Wrapper -->
            <div class="document-container w-full bg-white">
              <Editor
                v-model="templateData.htmlContent"
                :init="editorInit"
                class="min-h-[800px]"
              />
            </div>
         </div>

         <!-- Bottom Section: Signature + Tembusan side by side -->
         <div class="mt-8 flex flex-wrap gap-4 w-full max-w-[21cm]">
           <!-- LEFT: Tembusan Panel -->
           <div class="flex-1 min-w-[200px] p-4 border border-dashed border-amber-300 rounded-xl bg-amber-50 shadow-sm">
             <h3 class="text-sm font-bold text-amber-800 mb-3 border-b border-amber-200 pb-2">Tembusan (Opsional)</h3>
             <textarea v-model="templateData.tembusanText" rows="5" placeholder="1. Yth. Rektor UIKA&#10;2. Yth. Dekan Fakultas X&#10;3. Arsip"
               class="w-full px-3 py-2 border border-amber-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 outline-none bg-white resize-y"></textarea>
             <p class="text-xs text-amber-600 mt-1">Satu item per baris. Akan muncul di pojok kiri bawah surat.</p>
           </div>

           <!-- RIGHT: Signature Config Panel -->
           <div class="w-full max-w-sm p-4 border border-dashed border-gray-300 rounded-xl bg-white shadow-sm flex flex-col">
             <h3 class="text-sm font-bold text-gray-800 mb-3 border-b border-gray-200 pb-2 text-center">Panel Tanda Tangan</h3>
             
             <!-- Signature Location & Date -->
             <div class="w-full mb-3 text-left">
               <label class="block text-xs font-semibold text-gray-600 mb-1">Tempat & Tanggal</label>
               <input v-model="templateData.signatureLocation" type="text" placeholder="Bogor, [tanggal_surat]" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-600 outline-none" />
             </div>

             <!-- Signature Title -->
             <div class="w-full mb-3 text-left">
               <label class="block text-xs font-semibold text-gray-600 mb-1">Judul TTD</label>
               <textarea v-model="templateData.signatureTitle" rows="2" placeholder="Mengetahui,&#10;Plt. Ketua Program Studi" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-600 outline-none resize-none"></textarea>
             </div>

             <!-- Signature Alignment -->
             <div class="w-full mb-3 text-left">
               <label class="block text-xs font-semibold text-gray-600 mb-1">Letak Tanda Tangan</label>
               <select v-model="templateData.signatureAlignment" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-600">
                 <option value="left">Kiri</option>
                 <option value="center">Tengah</option>
                 <option value="right">Kanan</option>
               </select>
             </div>

             <!-- Signature Type -->
             <div class="w-full mb-3 text-left">
               <label class="block text-xs font-semibold text-gray-600 mb-1">Jenis Tanda Tangan</label>
               <select v-model="templateData.signatureType" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-600">
                 <option value="manual">Gambar (Manual Upload)</option>
                 <option value="barcode">Digital (QR Barcode otomatis)</option>
               </select>
             </div>

             <!-- Name input -->
             <div class="w-full mb-3 text-left">
               <label class="block text-xs font-semibold text-gray-600 mb-1">Nama Pejabat</label>
               <input v-model="templateData.signatureName" type="text" placeholder="Dr. H. Fulan, M.Pd." class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-600 outline-none" />
             </div>

             <!-- Form for manual signature image -->
             <div v-if="templateData.signatureType === 'manual'" class="flex flex-col items-center">
               <div v-if="templateData.signatureImageUrl" class="relative group w-full mb-2">
                 <img :src="templateData.signatureImageUrl" alt="Tanda Tangan" class="h-28 w-auto mx-auto object-contain rounded drop-shadow-sm mix-blend-multiply" />
                 <div class="absolute inset-0 bg-white/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded">
                   <button @click="removeSignature" class="text-white px-3 py-1.5 bg-red-600 hover:bg-red-700 rounded-lg font-medium text-xs">
                     Hapus TTD
                   </button>
                 </div>
               </div>
               <div v-else class="mb-2 w-full">
                 <div class="w-20 h-20 bg-gray-100 border border-gray-200 rounded-lg flex items-center justify-center mx-auto mb-2">
                   <ImageIcon class="w-5 h-5 text-gray-300" />
                 </div>
               </div>
               <button @click="openSignatureMediaLibrary" class="px-3 py-1.5 text-xs font-medium bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 flex items-center gap-1.5">
                 <ImageIcon class="w-3.5 h-3.5" /> {{ templateData.signatureImageUrl ? 'Ganti TTD' : 'Pilih dari Pustaka' }}
               </button>
             </div>

             <div v-else class="bg-blue-50 text-blue-800 border border-blue-200 p-3 rounded-lg text-xs leading-relaxed text-left">
               <strong>QR Barcode</strong> otomatis dibuat dari link verifikasi.
             </div>
           </div>
         </div>
       </div>
    </div>
    
    <!-- Media Library Modal -->
    <MediaLibraryModal v-model="isMediaLibraryOpen" @select="handleMediaSelect" />
  </div>
</template>

<style>
/* Remove tinyMCE branding and warnings */
.tox-statusbar__branding {
  display: none !important;
}
.tox-notification {
  display: none !important;
}

/* Document constraint for the actual editor frame */
.document-container {
  border-left: 1px solid #e5e7eb;
  border-right: 1px solid #e5e7eb;
  border-bottom: 1px solid #e5e7eb;
}
/* TinyMCE Overrides */
:deep(.tox-tinymce) {
  border: none !important;
  border-radius: 0 !important;
  height: 100% !important;
}
</style>
