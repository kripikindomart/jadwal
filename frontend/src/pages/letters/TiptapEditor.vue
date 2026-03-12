<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import { Editor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import { Table } from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TableCell from '@tiptap/extension-table-cell'
import TableHeader from '@tiptap/extension-table-header'
import TextAlign from '@tiptap/extension-text-align'
import Underline from '@tiptap/extension-underline'
import Link from '@tiptap/extension-link'
import { TextStyle } from '@tiptap/extension-text-style'
import FontFamily from '@tiptap/extension-font-family'
import Color from '@tiptap/extension-color'
import Highlight from '@tiptap/extension-highlight'

// Lucide icons for toolbar
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  List, ListOrdered,
  Table as TableIcon, Heading1, Heading2
} from 'lucide-vue-next'

const props = defineProps<{
  modelValue: string
  minHeight?: string
}>()

const emit = defineEmits(['update:modelValue'])

const editor = ref<any>(null)

// For font family dropdown
const fontFamilies = [
  { name: 'Default', value: '' },
  { name: 'Arial', value: 'Arial, Helvetica, sans-serif' },
  { name: 'Times New Roman', value: '"Times New Roman", Times, serif' },
  { name: 'Courier New', value: '"Courier New", Courier, monospace' },
  { name: 'Georgia', value: 'Georgia, serif' }
]

onMounted(() => {
  editor.value = new Editor({
    content: props.modelValue,
    extensions: [
      StarterKit,
      Underline,
      Image.configure({
        inline: true,
        allowBase64: true,
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Link.configure({
        openOnClick: false,
      }),
      TextStyle,
      FontFamily,
      Color,
      Highlight.configure({
        multicolor: true,
      })
    ],
    onUpdate: () => {
      // Avoid emitting if destroyed
      if (!editor.value) return
      emit('update:modelValue', editor.value.getHTML())
    },
    // Add default prose classes
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose-base lg:prose-lg xl:prose-2xl m-0 focus:outline-none min-w-full max-w-full print-content-tiptap',
        style: props.minHeight ? `min-height: ${props.minHeight}; padding: 1cm 1.5cm; font-family: Helvetica, Arial, sans-serif; font-size: 12pt; color: #000;` : 'padding: 1cm 1.5cm; font-family: Helvetica, Arial, sans-serif; font-size: 12pt; color: #000;',
      },
    },
  })
})

// Watch for external content changes
watch(() => props.modelValue, (value) => {
  const isSame = editor.value?.getHTML() === value
  if (isSame) return
  editor.value?.commands.setContent(value)
})

onBeforeUnmount(() => {
  editor.value?.destroy()
})

const insertTable = () => {
  editor.value?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
}

// Expose editor instance for parent access (e.g. for variable insertion)
defineExpose({ editor })
</script>

<template>
  <div class="tiptap-editor-container border border-gray-200 rounded-lg overflow-hidden bg-white flex flex-col">
    <!-- Toolbar -->
    <div v-if="editor" class="tiptap-toolbar bg-gray-50 border-b border-gray-200 p-2 flex flex-wrap gap-1 sticky top-0 z-10 shrink-0">
      
      <!-- Font Family -->
      <select 
        @change="(e) => editor?.chain().focus().setFontFamily((e.target as HTMLSelectElement).value).run()"
        class="text-sm border-gray-300 rounded px-2 py-1 mr-2"
      >
        <option v-for="font in fontFamilies" :key="font.value" :value="font.value" :selected="editor.isActive('textStyle', { fontFamily: font.value })">{{ font.name }}</option>
      </select>

      <div class="w-px h-6 bg-gray-300 mx-1 self-center"></div>

      <!-- Basic Formatting -->
      <button @click="editor.chain().focus().toggleBold().run()" :class="{ 'bg-gray-200': editor.isActive('bold') }" class="p-1.5 hover:bg-gray-200 rounded" title="Bold">
        <Bold class="w-4 h-4" />
      </button>
      <button @click="editor.chain().focus().toggleItalic().run()" :class="{ 'bg-gray-200': editor.isActive('italic') }" class="p-1.5 hover:bg-gray-200 rounded" title="Italic">
        <Italic class="w-4 h-4" />
      </button>
      <button @click="editor.chain().focus().toggleUnderline().run()" :class="{ 'bg-gray-200': editor.isActive('underline') }" class="p-1.5 hover:bg-gray-200 rounded" title="Underline">
        <UnderlineIcon class="w-4 h-4" />
      </button>
      <button @click="editor.chain().focus().toggleStrike().run()" :class="{ 'bg-gray-200': editor.isActive('strike') }" class="p-1.5 hover:bg-gray-200 rounded" title="Strikethrough">
        <Strikethrough class="w-4 h-4" />
      </button>

      <div class="w-px h-6 bg-gray-300 mx-1 self-center"></div>

      <!-- Alignment -->
      <button @click="editor.chain().focus().setTextAlign('left').run()" :class="{ 'bg-gray-200': editor.isActive({ textAlign: 'left' }) }" class="p-1.5 hover:bg-gray-200 rounded" title="Align Left">
        <AlignLeft class="w-4 h-4" />
      </button>
      <button @click="editor.chain().focus().setTextAlign('center').run()" :class="{ 'bg-gray-200': editor.isActive({ textAlign: 'center' }) }" class="p-1.5 hover:bg-gray-200 rounded" title="Align Center">
        <AlignCenter class="w-4 h-4" />
      </button>
      <button @click="editor.chain().focus().setTextAlign('right').run()" :class="{ 'bg-gray-200': editor.isActive({ textAlign: 'right' }) }" class="p-1.5 hover:bg-gray-200 rounded" title="Align Right">
        <AlignRight class="w-4 h-4" />
      </button>
      <button @click="editor.chain().focus().setTextAlign('justify').run()" :class="{ 'bg-gray-200': editor.isActive({ textAlign: 'justify' }) }" class="p-1.5 hover:bg-gray-200 rounded" title="Justify">
        <AlignJustify class="w-4 h-4" />
      </button>

      <div class="w-px h-6 bg-gray-300 mx-1 self-center"></div>

      <!-- Lists -->
      <button @click="editor.chain().focus().toggleBulletList().run()" :class="{ 'bg-gray-200': editor.isActive('bulletList') }" class="p-1.5 hover:bg-gray-200 rounded" title="Bullet List">
        <List class="w-4 h-4" />
      </button>
      <button @click="editor.chain().focus().toggleOrderedList().run()" :class="{ 'bg-gray-200': editor.isActive('orderedList') }" class="p-1.5 hover:bg-gray-200 rounded" title="Numbered List">
        <ListOrdered class="w-4 h-4" />
      </button>

      <div class="w-px h-6 bg-gray-300 mx-1 self-center"></div>

      <!-- Headings -->
      <button @click="editor.chain().focus().toggleHeading({ level: 1 }).run()" :class="{ 'bg-gray-200': editor.isActive('heading', { level: 1 }) }" class="p-1.5 hover:bg-gray-200 rounded" title="Heading 1">
        <Heading1 class="w-4 h-4" />
      </button>
      <button @click="editor.chain().focus().toggleHeading({ level: 2 }).run()" :class="{ 'bg-gray-200': editor.isActive('heading', { level: 2 }) }" class="p-1.5 hover:bg-gray-200 rounded" title="Heading 2">
        <Heading2 class="w-4 h-4" />
      </button>

      <div class="w-px h-6 bg-gray-300 mx-1 self-center"></div>

      <!-- Table -->
      <button @click="insertTable" class="p-1.5 hover:bg-gray-200 rounded text-gray-700 font-medium text-xs flex items-center gap-1" title="Insert Table">
        <TableIcon class="w-4 h-4" /> <span class="hidden sm:inline">Tabel</span>
      </button>
      <!-- Table Actions -->
      <template v-if="editor.isActive('table')">
        <button @click="editor.chain().focus().addColumnBefore().run()" class="p-1 px-2 hover:bg-gray-200 rounded text-xs bg-gray-100 border border-gray-200">Col + Bfr</button>
        <button @click="editor.chain().focus().addColumnAfter().run()" class="p-1 px-2 hover:bg-gray-200 rounded text-xs bg-gray-100 border border-gray-200">Col + Aft</button>
        <button @click="editor.chain().focus().deleteColumn().run()" class="p-1 px-2 hover:bg-red-100 text-red-700 rounded text-xs bg-red-50 border border-red-200">Del Col</button>
        
        <button @click="editor.chain().focus().addRowBefore().run()" class="p-1 px-2 hover:bg-gray-200 rounded text-xs bg-gray-100 border border-gray-200">Row + Bfr</button>
        <button @click="editor.chain().focus().addRowAfter().run()" class="p-1 px-2 hover:bg-gray-200 rounded text-xs bg-gray-100 border border-gray-200">Row + Aft</button>
        <button @click="editor.chain().focus().deleteRow().run()" class="p-1 px-2 hover:bg-red-100 text-red-700 rounded text-xs bg-red-50 border border-red-200">Del Row</button>
        
        <button @click="editor.chain().focus().deleteTable().run()" class="p-1 px-2 hover:bg-red-200 text-red-800 rounded font-bold text-xs bg-red-100 border border-red-300">Del Table</button>
      </template>

    </div>

    <!-- Editor Content -->
    <div class="flex-1 w-full overflow-y-auto" v-if="editor">
      <editor-content :editor="editor" class="tiptap-content-wrapper" />
    </div>
  </div>
</template>

<style>
.tiptap-content-wrapper .ProseMirror {
  /* ProseMirror basic reset */
  outline: none;
  min-height: 100%;
}

.tiptap-content-wrapper .ProseMirror p {
  margin-top: 0;
  margin-bottom: 0.5rem;
}

/* TipTap Table Styles */
.tiptap-content-wrapper .ProseMirror table {
  border-collapse: collapse;
  table-layout: fixed;
  width: 100%;
  margin: 0;
  overflow: hidden;
}

.tiptap-content-wrapper .ProseMirror table td,
.tiptap-content-wrapper .ProseMirror table th {
  min-width: 1em;
  border: 1px solid #ced4da;
  padding: 3px 5px;
  vertical-align: top;
  box-sizing: border-box;
  position: relative;
}

.tiptap-content-wrapper .ProseMirror table th {
  font-weight: bold;
  text-align: left;
  background-color: #f1f3f5;
}

.tiptap-content-wrapper .ProseMirror table .column-resize-handle {
  position: absolute;
  right: -2px;
  top: 0;
  bottom: -2px;
  width: 4px;
  background-color: #adf;
  pointer-events: none;
}

/* Selected cells */
.tiptap-content-wrapper .ProseMirror table .selectedCell:after {
  z-index: 2;
  position: absolute;
  content: "";
  left: 0; right: 0; top: 0; bottom: 0;
  background: rgba(200, 200, 255, 0.4);
  pointer-events: none;
}

/* TipTap Editor Styles overrides */
.print-content-tiptap {
  color: #000 !important;
}
.print-content-tiptap * {
  color: #000 !important;
}
</style>
