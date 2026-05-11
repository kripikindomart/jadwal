<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useToast } from '@/composables/useToast'
import api from '@/lib/api'
import { ArrowLeft, Image as ImageIcon, Table2, LayoutList, X, Loader2 } from 'lucide-vue-next'
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
import TiptapEditor from './TiptapEditor.vue'

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
  editorType: 'tinymce',
  headerHtmlContent: '',
  signatureImageUrl: '',
  signatureName: '',
  signatureType: 'manual',
  signatureTitle: 'Mengetahui,',
  signatureLocation: '',
  signatureAlignment: 'right',
  tembusanText: '',
  paperSize: 'A4'
})

const isMediaLibraryOpen = ref(false)
const showPreviewModal = ref(false)
const generatedPreviewHtml = ref('')
const mediaLibraryTarget = ref<'editor' | 'header' | 'signature' | 'headerLogo'>('editor')
let activeEditorInstance: any = null
const tiptapEditorRef = ref<any>(null)
// @ts-ignore - used as template ref
const tiptapHeaderEditorRef = ref<any>(null)
const editorSwitching = ref(false)
const htmlPreviewMode = ref(false)
const textareaRef = ref<HTMLTextAreaElement | null>(null)

const switchEditor = async (type: 'tinymce' | 'tiptap' | 'html' | 'form') => {
  if (templateData.value.editorType === type) return
  editorSwitching.value = true
  activeEditorInstance = null
  await nextTick()
  templateData.value.editorType = type
  await nextTick()
  setTimeout(() => { editorSwitching.value = false }, 300)
}

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
  toolbar: 'undo redo | fontfamily fontsize blocks | ' +
    'bold italic underline strikethrough | alignleft aligncenter ' +
    'alignright alignjustify | table tablecellprops tablerowprops | bullist numlist outdent indent | ' +
    'removeformat | image | fullscreen code',
  content_style: `
    ${contentCss}
    ${contentUiCss}
    
    body { font-family:Helvetica,Arial,sans-serif; font-size:12pt; padding: 1cm 1.5cm; min-height: 800px; color: #000; }
    table { width: 100%; border-collapse: collapse; }
    table td, table th { border: 1px solid #ccc; padding: 8px; position: relative; vertical-align: top; }
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
const insertHtmlAtCursor = (text: string) => {
  if (templateData.value.editorType === 'tiptap' && tiptapEditorRef.value?.editor) {
    tiptapEditorRef.value.editor.chain().focus().insertContent(text).run()
  } else if (templateData.value.editorType === 'html' && textareaRef.value) {
    const el = textareaRef.value
    const start = el.selectionStart
    const end = el.selectionEnd
    const currentVal = templateData.value.htmlContent
    templateData.value.htmlContent = currentVal.substring(0, start) + text + currentVal.substring(end)
    nextTick(() => {
      el.selectionStart = el.selectionEnd = start + text.length
      el.focus()
    })
  } else if (activeEditorInstance) {
    activeEditorInstance.insertContent(text)
  }
}

const insertTable = () => {
  if (templateData.value.editorType !== 'html' && !activeEditorInstance && !tiptapEditorRef.value) return
  const tableHtml = `
    <table style="width:100%; border-collapse:collapse; margin:12px auto;">
      <tbody>
        <tr><td style="border:1px solid #999; padding:6px 10px; vertical-align: top;">&nbsp;</td><td style="border:1px solid #999; padding:6px 10px; vertical-align: top;">&nbsp;</td><td style="border:1px solid #999; padding:6px 10px; vertical-align: top;">&nbsp;</td></tr>
        <tr><td style="border:1px solid #999; padding:6px 10px; vertical-align: top;">&nbsp;</td><td style="border:1px solid #999; padding:6px 10px; vertical-align: top;">&nbsp;</td><td style="border:1px solid #999; padding:6px 10px; vertical-align: top;">&nbsp;</td></tr>
      </tbody>
    </table><p><br/></p>`
  insertHtmlAtCursor(tableHtml)
  toast.success('Tabel 3x2 disisipkan!')
}

const insertTableBorderless = () => {
  if (templateData.value.editorType !== 'html' && !activeEditorInstance && !tiptapEditorRef.value) return
  const tableHtml = `
    <table style="width:100%; border-collapse:collapse; margin:12px auto; border: none;">
      <tbody>
        <tr><td style="padding:4px 8px; width:30%; border:none; vertical-align: top;">Nama</td><td style="padding:4px 8px; width:3%; border:none; vertical-align: top;">:</td><td style="padding:4px 8px; border:none; vertical-align: top;">[nama]</td></tr>
        <tr><td style="padding:4px 8px; border:none; vertical-align: top;">NIM</td><td style="padding:4px 8px; border:none; vertical-align: top;">:</td><td style="padding:4px 8px; border:none; vertical-align: top;">[nim]</td></tr>
        <tr><td style="padding:4px 8px; border:none; vertical-align: top;">Program Studi</td><td style="padding:4px 8px; border:none; vertical-align: top;">:</td><td style="padding:4px 8px; border:none; vertical-align: top;">[prodi]</td></tr>
      </tbody>
    </table><p><br/></p>`
  insertHtmlAtCursor(tableHtml)
  toast.success('Layout identitas (tanpa border) disisipkan!')
}

// ========== MEDIA & HEADER ===========
const insertHeaderLayout = () => {
  if (templateData.value.editorType !== 'html' && !activeEditorInstance && !tiptapEditorRef.value) return
  const tableHtml = `
    <table style="width:100%; border-collapse:collapse; margin-bottom:20px; border: none;">
      <tbody>
        <tr>
          <td style="padding:4px 0; width:15%; border:none; vertical-align: top;">Nomor</td>
          <td style="padding:4px 8px; width:3%; border:none; vertical-align: top;">:</td>
          <td style="padding:4px 0; width:42%; border:none; vertical-align: top;">[nomor_surat]</td>
          <td style="padding:4px 0; width:40%; border:none; vertical-align: top; text-align: right;">Bogor, [tanggal_surat]</td>
        </tr>
        <tr>
          <td style="padding:4px 0; border:none; vertical-align: top;">Lampiran</td>
          <td style="padding:4px 8px; border:none; vertical-align: top;">:</td>
          <td style="padding:4px 0; border:none; vertical-align: top;">[lampiran]</td>
          <td style="padding:4px 0; border:none;"></td>
        </tr>
        <tr>
          <td style="padding:4px 0; border:none; vertical-align: top;">Perihal</td>
          <td style="padding:4px 8px; border:none; vertical-align: top;">:</td>
          <td style="padding:4px 0; border:none; vertical-align: top;">[perihal]</td>
          <td style="padding:4px 0; border:none;"></td>
        </tr>
      </tbody>
    </table><p><br/></p>`
  insertHtmlAtCursor(tableHtml)
  toast.success('Layout Nomor & Tanggal (Kop) disisipkan!')
}


const formData = ref({
  metadata: {
    showNomor: true,
    showLampiran: true,
    showPerihal: true,
    tujuan: 'Yth.\nBapak/Ibu\ndi Tempat'
  },
  openingText: '<p>Dengan hormat,</p>',
  identityTable: {
    show: true,
    fields: [
      { key: 'Nama', tag: '[nama]' },
      { key: 'NIM', tag: '[nim]' },
      { key: 'Program Studi', tag: '[prodi]' }
    ]
  },
  bodyText: '<p>Tulis isi surat di sini...</p>',
  closingText: '<p>Demikian surat ini kami sampaikan...</p>'
})

const headerFormData = ref({
  logoUrl: '',
  title1: '',
  title1Size: 14,
  title2: 'UNIVERSITAS IBN KHALDUN BOGOR',
  title2Size: 16,
  title3: '',
  title3Size: 14,
  address: 'Jl. KH. Sholeh Iskandar, RT.01/RW.10, Kedungbadak, Kec. Tanah Sereal, Kota Bogor, Jawa Barat 16162',
  addressSize: 10,
  spacing: 2,
  fontFamily: "'Times New Roman', Times, serif"
})

const fetchTemplate = async () => {
  try {
    const res = await api.get(`/letters/templates/${route.params.id}`)
    templateData.value = { ...templateData.value, ...res.data }
    
    if (res.data.editorType === 'form' && res.data.htmlContent) {
      try {
        const parsed = JSON.parse(res.data.htmlContent)
        formData.value = { ...formData.value, ...parsed }
      } catch(e) {}
    }

    if (res.data.headerMode === 'form' && res.data.headerHtmlContent) {
      try {
        const parsed = JSON.parse(res.data.headerHtmlContent)
        headerFormData.value = { ...headerFormData.value, ...parsed }
      } catch(e) {}
    }
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
    let contentToSave = templateData.value.htmlContent
    if (templateData.value.editorType === 'form') {
      contentToSave = JSON.stringify(formData.value)
    }

    let headerContentToSave = templateData.value.headerHtmlContent
    if (templateData.value.headerMode === 'form') {
      headerContentToSave = JSON.stringify(headerFormData.value)
    }

    await api.patch(`/letters/templates/${route.params.id}`, {
      htmlContent: contentToSave,
      headerImageUrl: templateData.value.headerImageUrl,
      headerMode: templateData.value.headerMode || 'image',
      editorType: templateData.value.editorType || 'tinymce',
      headerHtmlContent: headerContentToSave || '',
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
    toast.success('Kop Surat berhasil diperbarui!')
  } else if (mediaLibraryTarget.value === 'headerLogo') {
    headerFormData.value.logoUrl = url
    toast.success('Logo Kop Surat berhasil diperbarui!')
  } else if (mediaLibraryTarget.value === 'signature') {
    templateData.value.signatureImageUrl = url
    toast.success('Tanda tangan berhasil diperbarui!')
  } else if (mediaLibraryTarget.value === 'editor') {
    if (templateData.value.editorType === 'tiptap' && tiptapEditorRef.value?.editor) {
      tiptapEditorRef.value.editor.chain().focus().setImage({ src: url }).run()
      toast.success('Gambar berhasil ditambahkan ke editor Tiptap!')
    } else if (templateData.value.editorType === 'html' && textareaRef.value) {
      const imgHtml = `<img src="${url}" style="max-width:100%; height:auto;" />`
      insertHtmlAtCursor(imgHtml)
      toast.success('Gambar berhasil ditambahkan ke HTML!')
    } else if (activeEditorInstance) {
      activeEditorInstance.insertContent(`<img src="${url}" style="max-width:100%; height:auto;" />`)
      toast.success('Gambar berhasil ditambahkan ke editor!')
    }
  }
}

const openHeaderMediaLibrary = () => {
  mediaLibraryTarget.value = 'header'
  isMediaLibraryOpen.value = true
}

const openHeaderLogoLibrary = () => {
  mediaLibraryTarget.value = 'headerLogo'
  isMediaLibraryOpen.value = true
}

const removeHeader = () => { templateData.value.headerImageUrl = '' }
const removeSignature = () => { templateData.value.signatureImageUrl = '' }
const openSignatureMediaLibrary = () => {
  mediaLibraryTarget.value = 'signature'
  isMediaLibraryOpen.value = true
}

const openPreview = () => {
  let html = ''
  
  // 1. Kop Surat
  if (templateData.value.headerMode === 'form') {
    let hd = headerFormData.value
    html += `
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
  } else if (templateData.value.headerMode === 'editor' && templateData.value.headerHtmlContent) {
    html += `<div style="margin-bottom: 0.5rem;">${templateData.value.headerHtmlContent}</div>`
  } else if (templateData.value.headerImageUrl) {
    html += `<div style="margin-bottom: 0.5rem; text-align: center;"><img src="${templateData.value.headerImageUrl}" alt="Kop Surat" style="max-width: 100%; height: auto;" /></div>`
  }

  // 2. Body
  if (templateData.value.editorType === 'form') {
    let fd = formData.value
    let bodyHtml = ''
    
    // Metadata
    let metadataRows = []
    if (fd.metadata.showNomor) metadataRows.push({ label: 'Nomor', tag: '[nomor_surat]' })
    if (fd.metadata.showLampiran) metadataRows.push({ label: 'Lampiran', tag: '[lampiran]' })
    if (fd.metadata.showPerihal) metadataRows.push({ label: 'Perihal', tag: '[perihal]' })

    if (metadataRows.length > 0) {
      let metaHtml = `<table style="width:100%; border-collapse:collapse; margin-bottom:20px; border: none;"><tbody>`
      metadataRows.forEach((row, idx) => {
        let rightCol = ''
        if (idx === 0) {
          rightCol = `<td style="padding:4px 0; width:40%; border:none; vertical-align: top; text-align: right;" rowspan="${metadataRows.length}">Bogor, [tanggal_surat]</td>`
        }
        metaHtml += `<tr><td style="padding:4px 0; width:80px; border:none; vertical-align: top;">${row.label}</td><td style="padding:4px 8px 4px 0; width:15px; border:none; vertical-align: top; text-align: center;">:</td><td style="padding:4px 0; border:none; vertical-align: top;">${row.tag}</td>${rightCol}</tr>`
      })
      metaHtml += `</tbody></table>`
      bodyHtml += metaHtml
    } else {
      bodyHtml += `<div style="text-align:right; margin-bottom: 20px;">Bogor, [tanggal_surat]</div>`
    }
    
    let contentHtml = ''

    // Helper: process paragraphs
    const fixParagraphs = (html: string, indent: string = '103px') => {
      // Fix empty paragraphs so Enter shows as gap
      let processedHtml = html.replace(/<p><\/p>/gi, '<p><br></p>')
      processedHtml = processedHtml.replace(/<p>\s*<br\s*\/?>\s*<\/p>/gi, '<p style="min-height: 1.5em;"><br></p>')
      
      // Match ALL <p> tags (with or without attributes) and inject styles
      processedHtml = processedHtml.replace(/<p(\s[^>]*)?>|<p>/gi, (match, attrs) => {
        const baseStyle = `text-align: justify; margin: 0 0 0.5em 0; margin-left: ${indent}; line-height: 1.5;`
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

    if (fd.metadata.tujuan) {
      contentHtml += `
        <div style="text-align:left; margin-bottom: 20px; margin-left: 103px; line-height: 1.5;">
          Kepada Yth.<br>${fd.metadata.tujuan.replace(/\n/g, '<br>')}
        </div>
      `
    }

    // Opening (Flush with Nomor text)
    if (fd.openingText) {
      contentHtml += `
        <div style="margin-bottom: 12px; line-height: 1.5;">
          ${fixParagraphs(fd.openingText, '103px')}
        </div>
      `
    }

    // Identity Table (Indented relative to Nomor text)
    if (fd.identityTable?.show && fd.identityTable.fields?.length) {
      let idRows = ''
      fd.identityTable.fields.forEach((f: any) => {
        idRows += `
          <tr>
            <td style="padding:4px 8px 4px 0; width:150px; border:none; vertical-align: top;">${f.key}</td>
            <td style="padding:4px 8px 4px 0; width:15px; border:none; vertical-align: top; text-align: center;">:</td>
            <td style="padding:4px 0; border:none; vertical-align: top;">${f.tag}</td>
          </tr>
        `
      })
      contentHtml += `
        <table style="width:calc(100% - 103px - 1.5cm); border-collapse:collapse; margin:12px 0 12px calc(103px + 1.5cm); border: none;">
          <tbody>${idRows}</tbody>
        </table>
      `
    }

    // Body text (Flush with Nomor text)
    if (fd.bodyText) {
      contentHtml += `
        <div style="margin-bottom: 12px; line-height: 1.5;">
          ${fixParagraphs(fd.bodyText, '103px')}
        </div>
      `
    }

    // Closing (Flush with Nomor text)
    if (fd.closingText) {
      contentHtml += `
        <div style="margin-bottom: 12px; line-height: 1.5;">
          ${fixParagraphs(fd.closingText, '103px')}
        </div>
      `
    }

    bodyHtml += contentHtml
    html += bodyHtml
  } else {
    html += templateData.value.htmlContent || ''
  }

  // 3. Signature
  if (templateData.value.signatureImageUrl || templateData.value.signatureName) {
    const align = templateData.value.signatureAlignment || 'right'
    let marginStyle = 'margin-left: auto;'
    if (align === 'left') marginStyle = 'margin-right: auto;'
    else if (align === 'center') marginStyle = 'margin: 0 auto;'

    html += `
      <div style="margin-top: 2rem; width: 300px; text-align: center; ${marginStyle}">
        ${templateData.value.signatureLocation ? `<div style="margin-bottom: 0.5rem;">${templateData.value.signatureLocation}, [tanggal_surat]</div>` : ''}
        ${templateData.value.signatureTitle ? `<div style="margin-bottom: 1rem;">${templateData.value.signatureTitle}</div>` : ''}
        ${templateData.value.signatureImageUrl ? `<img src="${templateData.value.signatureImageUrl}" alt="Tanda Tangan" style="max-height: 100px; max-width: 200px; margin: 0 auto; display: block;" />` : `<div style="height: 80px;"></div>`}
        ${templateData.value.signatureName ? `<div style="margin-top: 1rem; font-weight: bold; text-decoration: underline;">${templateData.value.signatureName}</div>` : ''}
      </div>
    `
  }

  generatedPreviewHtml.value = html
  showPreviewModal.value = true
}

onMounted(() => { fetchTemplate() })

const standardVariables = [
  { label: 'Nama', tag: '[nama]' },
  { label: 'NIM', tag: '[nim]' },
  { label: 'Phone', tag: '[phone]' },
  { label: 'Email', tag: '[email]' },
  { label: 'Prodi', tag: '[prodi]' },
  { label: 'Tgl Surat', tag: '[tanggal_surat]' },
  { label: 'Tujuan Surat', tag: '[tujuan_surat]' },
  { label: 'Nomor Surat', tag: '[nomor_surat]' },
  { label: 'Lampiran', tag: '[lampiran]' },
  { label: 'Perihal', tag: '[perihal]' },
]

const insertVariable = (tag: string) => {
  if (templateData.value.editorType === 'form') {
    navigator.clipboard.writeText(tag)
    toast.success(`Variabel ${tag} disalin! Paste (Ctrl+V) di isian yang Anda inginkan.`)
    return
  }
  insertHtmlAtCursor(tag)
  toast.success(`Variabel ${tag} disisipkan!`)
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
          <div class="flex items-center gap-2 mt-1 mb-1">
            <span class="text-xs font-semibold text-gray-500">Mode Editor:</span>
            <button @click="switchEditor('form')" :class="templateData.editorType === 'form' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'" class="px-2 py-1 rounded text-xs font-medium transition-colors border border-gray-200" :disabled="editorSwitching">Form Blok (Mudah)</button>
            <button @click="switchEditor('tinymce')" :class="templateData.editorType === 'tinymce' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'" class="px-2 py-1 rounded text-xs font-medium transition-colors" :disabled="editorSwitching">TinyMCE</button>
            <button @click="switchEditor('tiptap')" :class="templateData.editorType === 'tiptap' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'" class="px-2 py-1 rounded text-xs font-medium transition-colors" :disabled="editorSwitching">TipTap</button>
            <button @click="switchEditor('html')" :class="templateData.editorType === 'html' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'" class="px-2 py-1 rounded text-xs font-medium transition-colors" :disabled="editorSwitching">Raw HTML</button>
          </div>
          <p class="text-sm text-gray-500">Gunakan tag dinamis: <code>[nama]</code>, <code>[nim]</code>, <code>[prodi]</code>, <code>[tanggal_surat]</code></p>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <button @click="openPreview" class="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
          Lihat Preview
        </button>
        <button @click="saveContent" :disabled="saving" class="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
          <Loader2 v-if="saving" class="w-4 h-4 animate-spin" />
          <span>Simpan Perubahan</span>
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
      <button @click="insertHeaderLayout"
        class="px-2.5 py-1.5 bg-orange-50 hover:bg-orange-100 text-orange-700 rounded text-xs font-medium transition-colors border border-orange-200 flex items-center gap-1"
        title="Sisipkan tabel untuk Kop Surat (Nomor, Lampiran, Perihal, & Tanggal)">
        <LayoutList class="w-3.5 h-3.5" /> Layout Kop
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
         <div class="flex flex-wrap items-center gap-4 mb-3 w-full border-b border-gray-200 pb-2">
           <div class="flex items-center gap-2">
             <span class="text-xs font-bold text-gray-500 uppercase">Kop Surat:</span>
             <button @click="templateData.headerMode = 'form'" :class="templateData.headerMode === 'form' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'" class="px-3 py-1 rounded-lg text-xs font-medium transition-colors border border-gray-200">Mode Blok</button>
             <button @click="templateData.headerMode = 'image'" :class="templateData.headerMode === 'image' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'" class="px-3 py-1 rounded-lg text-xs font-medium transition-colors">Mode Gambar</button>
             <button @click="templateData.headerMode = 'editor'" :class="templateData.headerMode === 'editor' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'" class="px-3 py-1 rounded-lg text-xs font-medium transition-colors">Mode Editor</button>
           </div>
           <div class="flex items-center gap-2 ml-auto">
             <span class="text-xs font-bold text-gray-500 uppercase">Kertas:</span>
             <button @click="templateData.paperSize = 'A4'" :class="templateData.paperSize !== 'F4' ? 'bg-teal-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'" class="px-3 py-1 rounded-lg text-xs font-medium transition-colors border border-gray-200">A4</button>
             <button @click="templateData.paperSize = 'F4'" :class="templateData.paperSize === 'F4' ? 'bg-teal-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'" class="px-3 py-1 rounded-lg text-xs font-medium transition-colors border border-gray-200">F4 (Legal)</button>
           </div>
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

         <!-- Form Mode -->
         <template v-else-if="templateData.headerMode === 'form'">
           <div class="w-full max-w-[21cm]">
             <!-- Kop Surat Live Preview -->
             <div class="mb-4 p-4 bg-white border border-gray-300 shadow-sm flex items-center justify-center relative rounded-lg" :style="{ fontFamily: headerFormData.fontFamily || `'Times New Roman', Times, serif` }">
               <div class="w-full px-4 sm:px-[2cm] py-4 bg-white border border-dashed border-gray-200">
                 <table style="width: 100%; border-collapse: collapse;">
                   <tr>
                     <td v-if="headerFormData.logoUrl" style="width: 110px; vertical-align: middle; text-align: center; padding-bottom: 10px; border: none;">
                       <img :src="headerFormData.logoUrl" style="max-width: 100px; max-height: 100px;" />
                     </td>
                     <td style="vertical-align: middle; text-align: center; padding-bottom: 10px; border: none;">
                       <div v-if="headerFormData.title1" :style="{ fontSize: (headerFormData.title1Size || 14) + 'pt', fontWeight: 'normal', marginBottom: (headerFormData.spacing ?? 2) + 'px', lineHeight: 1.1 }">{{ headerFormData.title1 }}</div>
                       <div v-if="headerFormData.title2" :style="{ fontSize: (headerFormData.title2Size || 16) + 'pt', fontWeight: 'bold', marginBottom: (headerFormData.spacing ?? 2) + 'px', lineHeight: 1.1 }">{{ headerFormData.title2 }}</div>
                       <div v-if="headerFormData.title3" :style="{ fontSize: (headerFormData.title3Size || 14) + 'pt', fontWeight: 'bold', marginBottom: (headerFormData.spacing ?? 2) + 'px', lineHeight: 1.1 }">{{ headerFormData.title3 }}</div>
                       <div v-if="headerFormData.address" :style="{ fontSize: (headerFormData.addressSize || 10) + 'pt', fontWeight: 'normal', lineHeight: 1.1 }" v-html="headerFormData.address.replace(/\n/g, '<br>')"></div>
                     </td>
                   </tr>
                 </table>
                 <hr style="border: none; border-top: 3px solid black; border-bottom: 1px solid black; height: 1px; margin: 0; padding: 0;">
               </div>
             </div>

             <div class="grid grid-cols-[120px_1fr] gap-6">
               <!-- Logo -->
               <div class="flex flex-col items-center border border-gray-200 p-2 rounded-lg bg-gray-50">
                 <span class="text-xs font-semibold text-gray-500 mb-2">Logo Kop</span>
                 <div v-if="headerFormData.logoUrl" class="relative group w-full mb-2 bg-white rounded">
                   <img :src="headerFormData.logoUrl" alt="Logo" class="w-full h-auto object-contain mix-blend-multiply" />
                   <div class="absolute inset-0 bg-white/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded">
                     <button @click="headerFormData.logoUrl = ''" class="text-white px-2 py-1 bg-red-600 hover:bg-red-700 rounded text-xs">Hapus</button>
                   </div>
                 </div>
                 <div v-else class="w-16 h-16 bg-white border border-gray-200 rounded flex items-center justify-center mb-2">
                   <ImageIcon class="w-5 h-5 text-gray-300" />
                 </div>
                 <button @click="openHeaderLogoLibrary" class="text-xs text-indigo-600 hover:text-indigo-800 font-medium text-center leading-tight">Pilih Gambar</button>
               </div>
               
               <!-- Text Inputs -->
               <div class="space-y-3">
                 <div class="flex gap-2 items-end">
                   <div class="flex-1">
                     <label class="block text-xs font-semibold text-gray-600 mb-1">Baris 1 (Opsional, Misal: YAYASAN PENDIDIKAN...)</label>
                     <input v-model="headerFormData.title1" type="text" class="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-indigo-600 outline-none" />
                   </div>
                   <div class="w-20">
                     <label class="block text-xs font-semibold text-gray-600 mb-1">Font (pt)</label>
                     <input v-model.number="headerFormData.title1Size" type="number" class="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-indigo-600 outline-none" />
                   </div>
                 </div>
                 <div class="flex gap-2 items-end">
                   <div class="flex-1">
                     <label class="block text-xs font-semibold text-gray-600 mb-1">Baris 2 Utama (Misal: UNIVERSITAS IBN KHALDUN)</label>
                     <input v-model="headerFormData.title2" type="text" class="w-full px-3 py-1.5 border border-gray-300 rounded text-sm font-bold focus:ring-2 focus:ring-indigo-600 outline-none" />
                   </div>
                   <div class="w-20">
                     <label class="block text-xs font-semibold text-gray-600 mb-1">Font (pt)</label>
                     <input v-model.number="headerFormData.title2Size" type="number" class="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-indigo-600 outline-none" />
                   </div>
                 </div>
                 <div class="flex gap-2 items-end">
                   <div class="flex-1">
                     <label class="block text-xs font-semibold text-gray-600 mb-1">Baris 3 (Opsional, Misal: FAKULTAS TEKNIK)</label>
                     <input v-model="headerFormData.title3" type="text" class="w-full px-3 py-1.5 border border-gray-300 rounded text-sm font-semibold focus:ring-2 focus:ring-indigo-600 outline-none" />
                   </div>
                   <div class="w-20">
                     <label class="block text-xs font-semibold text-gray-600 mb-1">Font (pt)</label>
                     <input v-model.number="headerFormData.title3Size" type="number" class="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-indigo-600 outline-none" />
                   </div>
                 </div>
                 <div class="flex gap-2 items-start">
                   <div class="flex-1">
                     <label class="block text-xs font-semibold text-gray-600 mb-1">Alamat / Kontak</label>
                     <textarea v-model="headerFormData.address" rows="2" class="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-indigo-600 outline-none resize-y"></textarea>
                   </div>
                   <div class="w-20 pt-5">
                     <label class="block text-xs font-semibold text-gray-600 mb-1">Font (pt)</label>
                     <input v-model.number="headerFormData.addressSize" type="number" class="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-indigo-600 outline-none" />
                   </div>
                 </div>
                  <div class="flex gap-4 pt-2 border-t border-gray-200 mt-2">
                    <div>
                      <label class="block text-xs font-semibold text-gray-600 mb-1">Jenis Font</label>
                      <select v-model="headerFormData.fontFamily" class="w-48 px-3 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-indigo-600 outline-none">
                        <option value="'Times New Roman', Times, serif">Times New Roman</option>
                        <option value="Arial, Helvetica, sans-serif">Arial</option>
                        <option value="Georgia, serif">Georgia</option>
                      </select>
                    </div>
                    <div>
                      <label class="block text-xs font-semibold text-gray-600 mb-1">Jarak Antar Baris Kop (px)</label>
                      <input v-model.number="headerFormData.spacing" type="number" class="w-32 px-3 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-indigo-600 outline-none" />
                    </div>
                  </div>
               </div>
             </div>
           </div>
         </template>

         <!-- Editor Mode -->
         <template v-else>
           <div class="w-full max-w-2xl">
             <p class="text-xs text-gray-500 mb-2">Ketik dan format Kop Surat secara manual di editor di bawah ini:</p>
             <div class="border border-gray-200 rounded-lg overflow-hidden">
               <TiptapEditor 
                  v-if="templateData.editorType === 'tiptap'"
                  ref="tiptapHeaderEditorRef"
                  v-model="templateData.headerHtmlContent" 
                  min-height="200px" 
                />
                <Editor
                  v-else
                  v-model="templateData.headerHtmlContent"
                  :init="headerEditorInit"
                />
             </div>
           </div>
         </template>
       </div>

       <div v-if="loading || editorSwitching" class="flex-1 flex items-center justify-center text-gray-400">
           {{ editorSwitching ? 'Mengganti editor...' : 'Memuat Editor...' }}
        </div>
        <div v-else class="w-full relative flex-1 flex flex-col bg-gray-100 items-center">
          
          <div class="w-full max-w-[21cm] shadow flex flex-col relative">
            <div v-if="templateData.editorType === 'html'" class="absolute -top-10 right-0 flex items-center bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden z-10">
              <button @click="htmlPreviewMode = false" :class="!htmlPreviewMode ? 'bg-gray-800 text-white' : 'text-gray-600 hover:bg-gray-50'" class="px-3 py-1.5 text-xs font-medium transition-colors">Code</button>
              <button @click="htmlPreviewMode = true" :class="htmlPreviewMode ? 'bg-gray-800 text-white' : 'text-gray-600 hover:bg-gray-50'" class="px-3 py-1.5 text-xs font-medium transition-colors border-l border-gray-200">Preview</button>
            </div>
            <!-- Editor Wrapper -->
            <div class="document-container w-full bg-white relative" :class="{'bg-gray-50': templateData.editorType === 'html' && !htmlPreviewMode || templateData.editorType === 'form'}" :key="'main-' + templateData.editorType">
              
              <template v-if="templateData.editorType === 'form'">
                <div class="w-full min-h-[800px] p-6 bg-gray-50 border-none outline-none flex flex-col gap-6 text-left">
                  <div class="bg-indigo-50 border border-indigo-200 rounded-lg p-3 text-xs text-indigo-800">
                    <strong>Mode Form Blok:</strong> Mode ini secara otomatis mengatur tabel identitas dan jarak paragraf agar saat dicetak tidak berantakan. Anda cukup mengisi teks pada setiap bagian di bawah ini.
                  </div>
                  <!-- Blok Metadata -->
                  <div class="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                    <h3 class="text-sm font-bold text-gray-800 mb-3 border-b border-gray-100 pb-2">1. Informasi Surat (Kiri & Kanan Atas)</h3>
                    <div class="grid grid-cols-2 gap-6">
                      <div class="space-y-2">
                         <label class="flex items-center gap-2 text-sm text-gray-700 cursor-pointer"><input type="checkbox" v-model="formData.metadata.showNomor" class="rounded text-indigo-600" /> Tampilkan Nomor Surat</label>
                         <label class="flex items-center gap-2 text-sm text-gray-700 cursor-pointer"><input type="checkbox" v-model="formData.metadata.showLampiran" class="rounded text-indigo-600" /> Tampilkan Lampiran</label>
                         <label class="flex items-center gap-2 text-sm text-gray-700 cursor-pointer"><input type="checkbox" v-model="formData.metadata.showPerihal" class="rounded text-indigo-600" /> Tampilkan Perihal</label>
                      </div>
                      <div>
                        <label class="block text-xs font-semibold text-gray-600 mb-1">Tujuan Surat (Sebelah Kanan/Bawah)</label>
                        <textarea v-model="formData.metadata.tujuan" rows="4" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-600 outline-none resize-y" placeholder="Yth.&#10;Bapak/Ibu..."></textarea>
                      </div>
                    </div>
                  </div>

                  <!-- Blok Pembuka -->
                  <div class="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                    <h3 class="text-sm font-bold text-gray-800 mb-3 border-b border-gray-100 pb-2">2. Paragraf Pembuka</h3>
                    <div class="border border-gray-200 rounded-lg overflow-hidden">
                      <TiptapEditor v-model="formData.openingText" min-height="150px" />
                    </div>
                  </div>

                  <!-- Blok Tabel Identitas -->
                  <div class="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                    <div class="flex items-center gap-3 mb-3 border-b border-gray-100 pb-2">
                       <h3 class="text-sm font-bold text-gray-800">3. Tabel Identitas (Tanpa Border)</h3>
                       <label class="flex items-center gap-2 text-sm ml-auto cursor-pointer font-medium"><input type="checkbox" v-model="formData.identityTable.show" class="rounded text-indigo-600" /> Aktifkan Tabel</label>
                    </div>
                    <div v-if="formData.identityTable.show" class="space-y-3">
                      <div v-for="(field, idx) in formData.identityTable.fields" :key="idx" class="flex items-center gap-2">
                        <input v-model="field.key" placeholder="Label (Misal: Nama)" class="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-600 outline-none" />
                        <span class="text-gray-500 font-bold">:</span>
                        <input v-model="field.tag" placeholder="Isian (Misal: [nama])" class="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-600 outline-none" />
                        <button @click="formData.identityTable.fields.splice(idx, 1)" class="px-2 py-1.5 text-xs text-red-600 hover:bg-red-50 rounded border border-red-200 transition-colors">Hapus</button>
                      </div>
                      <button @click="formData.identityTable.fields.push({key: '', tag: ''})" class="px-3 py-1.5 text-xs bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 rounded-lg transition-colors font-medium">+ Tambah Baris Identitas</button>
                    </div>
                  </div>

                  <!-- Blok Teks Utama -->
                  <div class="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                    <h3 class="text-sm font-bold text-gray-800 mb-3 border-b border-gray-100 pb-2">4. Isi Surat Utama</h3>
                    <div class="border border-gray-200 rounded-lg overflow-hidden">
                      <TiptapEditor v-model="formData.bodyText" min-height="250px" />
                    </div>
                  </div>

                  <!-- Blok Penutup -->
                  <div class="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                    <h3 class="text-sm font-bold text-gray-800 mb-3 border-b border-gray-100 pb-2">5. Paragraf Penutup</h3>
                    <div class="border border-gray-200 rounded-lg overflow-hidden">
                      <TiptapEditor v-model="formData.closingText" min-height="150px" />
                    </div>
                  </div>
                </div>
              </template>

              <template v-else-if="templateData.editorType === 'html'">
                <div v-if="htmlPreviewMode" class="min-h-[800px] p-[1cm_1.5cm] prose max-w-none text-black" v-html="templateData.htmlContent"></div>
                <textarea 
                  v-else 
                  ref="textareaRef"
                  v-model="templateData.htmlContent" 
                  class="w-full min-h-[800px] p-6 font-mono text-sm bg-gray-50 text-gray-800 border-none outline-none resize-y focus:ring-0" 
                  placeholder="<!-- Masukkan kode HTML murni di sini -->"
                  spellcheck="false"
                ></textarea>
              </template>
              <TiptapEditor 
                v-else-if="templateData.editorType === 'tiptap'"
                ref="tiptapEditorRef"
                v-model="templateData.htmlContent" 
                min-height="800px" 
              />
              <Editor
                v-else
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

    <!-- Preview Modal -->
    <div v-if="showPreviewModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div class="bg-gray-100 rounded-lg shadow-xl w-full max-w-5xl h-[95vh] flex flex-col overflow-hidden">
        <div class="flex justify-between items-center p-4 bg-white border-b border-gray-200 shrink-0">
          <h3 class="font-bold text-lg text-gray-800">Preview Layout Surat</h3>
          <button @click="showPreviewModal = false" class="text-gray-500 hover:text-red-500 p-1">
            <X class="w-6 h-6" />
          </button>
        </div>
        <div class="flex-1 overflow-auto p-4 sm:p-8 flex justify-center items-start bg-gray-200">
          <!-- A4/F4 Paper Representation -->
          <div :class="[
              'bg-white shadow-md mx-auto text-black print-preview-content',
              templateData.paperSize === 'F4' ? 'w-[21.5cm] min-h-[33cm]' : 'w-[21cm] min-h-[29.7cm]'
            ]" style="padding: 2cm; font-family: 'Times New Roman', Times, serif; font-size: 12pt;">
            <div v-html="generatedPreviewHtml"></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style>
.print-preview-content * {
  color: #000 !important;
}
.print-preview-content table {
  border-collapse: collapse;
}

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
