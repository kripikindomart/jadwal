<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useToast } from '@/composables/useToast'
import { useConfirm } from '@/composables/useConfirm'
import api from '@/lib/api'
import {
  ArrowLeft,
  Plus,
  Trash2,
  GripVertical,
  Type,
  X,
  Link
} from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()
const toast = useToast()
const confirm = useConfirm()

const instrumentId = route.params.id as string
const instrument = ref<any>(null)
const questions = ref<any[]>([])
const loading = ref(false)
const saving = ref(false)

// UI State
const activeQuestionId = ref<number | 'new' | null>(null)
const isAddingQuestion = ref(false)

// Temporary state for the currently edited/new question
const editForm = ref({
  id: null as number | null,
  text: '',
  type: 'likert' as 'likert' | 'text' | 'multiple_choice',
  options: [''] as string[],
  isRequired: true,
})


const fetchInstrument = async () => {
  loading.value = true
  try {
    const res = await api.get(`/surveys/${instrumentId}`)
    instrument.value = res.data
    // Make a deep copy to allow local ordering before saving
    questions.value = JSON.parse(JSON.stringify(res.data.questions || []))
    if (questions.value.length > 0 && activeQuestionId.value === null) {
      activeQuestionId.value = questions.value[0].id
    } else if (questions.value.length === 0) {
      startAddQuestion()
    }
  } catch (e: any) {
    toast.error('Gagal memuat data instrumen')
  } finally {
    loading.value = false
  }
}

const saveInstrumentHeader = async () => {
  if (!instrument.value || !instrument.value.title.trim()) return
  saving.value = true
  try {
    await api.patch(`/surveys/${instrumentId}`, {
      title: instrument.value.title,
      description: instrument.value.description,
      redirectUrl: instrument.value.redirectUrl,
      publicUrlHash: instrument.value.publicUrlHash || undefined,
    })
  } catch (e: any) {
    toast.error('Gagal menyimpan detail instrumen')
  } finally {
    saving.value = false
  }
}

// Focus Management
const setActiveQuestion = async (q: any) => {
  if (activeQuestionId.value === q.id) return
  
  // If we were editing a new question and clicked away, we should save it first or discard if empty
  if (isAddingQuestion.value && !saving.value) {
    if (!editForm.value.text.trim()) {
      isAddingQuestion.value = false
    } else {
      // Auto-save the new question before switching
      await saveCurrentEdit()
    }
  } else if (activeQuestionId.value !== null && !isAddingQuestion.value && !saving.value) {
    // Auto save the previously active existing question
    await saveCurrentEdit()
  }

  isAddingQuestion.value = false
  activeQuestionId.value = q.id
  editForm.value = {
    id: q.id,
    text: q.text,
    type: q.type,
    options: q.options?.length ? [...q.options] : ['Opsi 1'],
    isRequired: q.isRequired,
  }
}

const startAddQuestion = async () => {
  if (!saving.value && activeQuestionId.value !== null && !isAddingQuestion.value) {
    await saveCurrentEdit()
  }
  if (!saving.value && isAddingQuestion.value && editForm.value.text.trim()) {
    await saveCurrentEdit()
  }

  isAddingQuestion.value = true
  activeQuestionId.value = 'new'
  editForm.value = {
    id: null,
    text: '',
    type: 'multiple_choice',
    options: ['Opsi 1'],
    isRequired: true,
  }
  
  // Scroll to bottom
  window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })
}

// Option Management for MC
const addOption = () => {
  editForm.value.options.push(`Opsi ${editForm.value.options.length + 1}`)
}

const removeOption = (index: number) => {
  if (editForm.value.options.length > 1) {
    editForm.value.options.splice(index, 1)
  }
}

// API Interactions
const saveCurrentEdit = async () => {
  if (!editForm.value.text.trim()) return // Don't save empty questions

  // Prepare payload
  const payload: any = {
    text: editForm.value.text,
    type: editForm.value.type,
    isRequired: editForm.value.isRequired,
  }
  if (editForm.value.type === 'multiple_choice') {
    payload.options = editForm.value.options.filter(o => o.trim())
    if (payload.options.length === 0) payload.options = ['Opsi 1']
  }

  const isNew = isAddingQuestion.value
  const targetId = editForm.value.id
  
  saving.value = true
  try {
    if (isNew) {
      // Create new
      const res = await api.post(`/surveys/${instrumentId}/questions`, payload)
      // Update local state without full refetch if possible to keep it smooth
      questions.value.push(res.data)
      activeQuestionId.value = res.data.id
      editForm.value.id = res.data.id
      isAddingQuestion.value = false
    } else if (targetId) {
      // Update existing
      await api.patch(`/surveys/questions/${targetId}`, payload)
      // Update local state
      const idx = questions.value.findIndex(q => q.id === editForm.value.id)
      if (idx !== -1) {
        questions.value[idx] = { ...questions.value[idx], ...payload }
      }
    }
  } catch (e: any) {
    toast.error(e.response?.data?.message || 'Gagal menyimpan pertanyaan')
  } finally {
    saving.value = false
  }
}

const deleteQuestion = (id: number) => {
  confirm.requireConfirm({
    title: 'Hapus Pertanyaan',
    message: 'Yakin ingin menghapus pertanyaan ini?',
    confirmText: 'Ya, Hapus',
    cancelText: 'Batal',
    onConfirm: async () => {
      try {
        await api.delete(`/surveys/questions/${id}`)
        questions.value = questions.value.filter(q => q.id !== id)
        if (activeQuestionId.value === id) {
          activeQuestionId.value = questions.value.length > 0 ? questions.value[0].id : null
          if (activeQuestionId.value) {
            const nextQ = questions.value[0]
            editForm.value = {
              id: nextQ.id,
              text: nextQ.text,
              type: nextQ.type,
              options: nextQ.options?.length ? [...nextQ.options] : ['Opsi 1'],
              isRequired: nextQ.isRequired,
            }
          }
        }
        toast.success('Pertanyaan dihapus')
      } catch (e: any) {
        toast.error('Gagal menghapus pertanyaan')
      }
    },
  })
}

const duplicateQuestion = async (q: any) => {
  if (saving.value) return
  saving.value = true
  try {
    const payload = {
      text: q.text,
      type: q.type,
      options: q.options,
      isRequired: q.isRequired,
      // API automatically sets order to end
    }
    const res = await api.post(`/surveys/${instrumentId}/questions`, payload)
    questions.value.push(res.data)
    setActiveQuestion(res.data)
    toast.success('Pertanyaan diduplikasi')
  } catch (e: any) {
    toast.error('Gagal menduplikasi pertanyaan')
  } finally {
    saving.value = false
  }
}

// Drag & Drop (simplified move up/down for now)
const moveUp = async (index: number) => {
  if (index === 0) return
  await performReorder(index, index - 1)
}

const moveDown = async (index: number) => {
  if (index === questions.value.length - 1) return
  await performReorder(index, index + 1)
}

const performReorder = async (fromIdx: number, toIdx: number) => {
  // Optimistic UI update
  const item = questions.value[fromIdx]
  questions.value.splice(fromIdx, 1)
  questions.value.splice(toIdx, 0, item)

  try {
    const newOrder = questions.value.map(q => q.id)
    await api.post(`/surveys/${instrumentId}/reorder`, { questionIds: newOrder })
  } catch (e: any) {
    toast.error('Gagal mengurutkan')
    await fetchInstrument() // revert on fail
  }
}

onMounted(fetchInstrument)

// We can auto-save when leaving the page if there are unsaved changes
// But for simplicity, we trigger save on blur / focus change
</script>

<template>
  <div class="min-h-screen bg-purple-50/30 pb-32">
    <!-- Header Navbar -->
    <div class="bg-white border-b border-gray-200 sticky top-0 z-20">
      <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex items-center justify-between h-16">
          <div class="flex items-center gap-4">
            <button @click="router.push('/surveys')" class="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors tooltip-target" title="Kembali">
              <ArrowLeft class="w-5 h-5" />
            </button>
            <div class="flex items-center gap-3 flex-1 min-w-0">
              <div class="w-8 h-8 rounded bg-purple-600 text-white flex items-center justify-center shrink-0">
                <List class="w-5 h-5" />
              </div>
              <input 
                v-if="instrument"
                v-model="instrument.title" 
                class="text-xl font-semibold text-gray-900 bg-transparent border-b border-transparent hover:border-gray-300 focus:border-purple-600 focus:outline-none transition-colors px-1 py-0.5 placeholder-gray-500 w-full min-w-0 truncate" 
                placeholder="Judul Instrumen"
                @blur="saveInstrumentHeader"
              />
            </div>
          </div>
          <div class="flex items-center gap-3">
            <span v-if="saving" class="text-sm text-gray-500 flex items-center gap-2">
              <div class="w-4 h-4 rounded-full border-2 border-purple-500 border-t-transparent animate-spin"></div>
              Menyimpan...
            </span>
            <span v-else class="text-xs text-gray-400">Semua perubahan disimpan</span>
            
            <button @click="router.push('/surveys')" class="bg-purple-600 hover:bg-purple-700 text-white px-5 py-2 rounded-md font-medium text-sm transition-colors shadow-sm whitespace-nowrap">
              Selesai
            </button>
          </div>
        </div>
      </div>
    </div>

    <div class="max-w-3xl mx-auto px-4 mt-6 relative">
      
      <!-- Form Header Card (Custom Design) -->
      <div class="bg-white rounded-2xl shadow-lg border border-purple-100 overflow-hidden mb-6 relative">
        <div class="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-purple-500 via-indigo-500 to-purple-500"></div>
        <div class="p-8">
          <input 
            v-if="instrument"
            v-model="instrument.title" 
            class="w-full text-2xl sm:text-3xl font-bold text-gray-900 bg-transparent border-b-2 border-transparent hover:border-gray-200 focus:border-purple-500 focus:outline-none transition-colors pb-1 mb-2 placeholder-gray-400 font-sans" 
            placeholder="Ketik Judul Survei..."
            @blur="saveInstrumentHeader"
          />
          <textarea 
            v-if="instrument"
            v-model="instrument.description" 
            class="w-full text-base text-gray-700 bg-transparent border-b-2 border-transparent hover:border-gray-200 focus:border-purple-500 focus:outline-none transition-colors pb-1 resize-none overflow-hidden placeholder-gray-500 mt-2" 
            placeholder="Ketik instruksi pengisian survei di sini (Opsional)..."
            autocomplete="off"
            @input="(e) => { const el = e.target as HTMLTextAreaElement; el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'; }"
            @blur="saveInstrumentHeader"
          ></textarea>
          
          <!-- Redirect URL feature -->
          <div v-if="instrument" class="mt-6 flex flex-col gap-4">
            <div class="flex items-center gap-3 bg-indigo-50/50 p-4 rounded-xl border border-indigo-100/50">
              <div class="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                <Link class="w-4 h-4" />
              </div>
              <div class="flex-1">
                <label class="text-xs font-bold text-indigo-900 uppercase tracking-wider mb-1 block">Link Redirect (Opsional)</label>
                <input 
                  v-model="instrument.redirectUrl" 
                  class="w-full text-sm text-gray-900 font-medium bg-transparent border-b border-indigo-200 hover:border-indigo-400 focus:border-indigo-600 focus:outline-none transition-colors pb-1 placeholder-indigo-400" 
                  placeholder="Misal: https://web.kampus.ac.id/thanks (Diakses pengguna setelah submit)"
                  @blur="saveInstrumentHeader"
                />
              </div>
            </div>

            <!-- Custom Link URL feature -->
            <div class="flex items-center gap-3 bg-purple-50/50 p-4 rounded-xl border border-purple-100/50">
              <div class="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center shrink-0">
                <Link class="w-4 h-4" />
              </div>
              <div class="flex-1">
                <label class="text-xs font-bold text-purple-900 uppercase tracking-wider mb-1 block">Custom URL Survei Publik (Opsional)</label>
                <div class="flex items-center text-sm">
                  <span class="text-purple-400 font-medium whitespace-nowrap hidden sm:inline">survei.ppsuika.ac.id/survey/s/</span>
                  <input 
                    v-model="instrument.publicUrlHash" 
                    class="w-full text-sm text-gray-900 font-medium bg-transparent border-b border-purple-200 hover:border-purple-400 focus:border-purple-600 focus:outline-none transition-colors pb-1 placeholder-purple-400" 
                    placeholder="Misal: evaluasi-ganjil-2025"
                    pattern="[a-zA-Z0-9_-]+"
                    title="Hanya huruf, angka, pemisah (-)"
                    @blur="saveInstrumentHeader"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Floating Action Bar (Different from Google Forms: Bottom fixed pill) -->
      <div class="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 hidden md:flex items-center gap-1 bg-gray-900/90 backdrop-blur-md rounded-full px-4 py-2 shadow-xl border border-gray-700/50">
        <button @click="startAddQuestion" class="flex items-center gap-2 px-3 py-2 text-white hover:text-purple-300 hover:bg-white/10 rounded-full transition-colors">
          <Plus class="w-5 h-5" />
          <span class="text-sm font-medium pr-1">Pertanyaan Baru</span>
        </button>
        <div class="w-px h-6 bg-gray-600 mx-1"></div>
        <button class="flex items-center gap-2 px-3 py-2 text-white hover:text-purple-300 hover:bg-white/10 rounded-full transition-colors">
          <Type class="w-5 h-5" />
          <span class="text-sm font-medium pr-1">Teks / Judul</span>
        </button>
      </div>

      <!-- Mobile Add Button (Bottom Right) -->
      <button 
        @click="startAddQuestion" 
        class="xl:hidden fixed bottom-6 right-6 w-14 h-14 bg-white rounded-full shadow-lg border border-gray-100 text-purple-600 flex items-center justify-center hover:bg-gray-50 transition-colors z-30"
      >
        <Plus class="w-7 h-7" />
      </button>

      <!-- Questions List -->
      <div class="space-y-4">
        <!-- Render Existing Questions -->
        <template v-for="(q, index) in questions" :key="q.id">
          
          <!-- INACTIVE STATE (View Mode) -->
          <div 
            v-if="activeQuestionId !== q.id"
            @click="setActiveQuestion(q)"
            class="bg-white rounded-xl shadow-sm border border-gray-100 p-6 cursor-pointer hover:border-purple-300 hover:shadow-md transition-all group relative"
          >
            <!-- Drag handle (visual only mapped to move up down for now) -->
            <div class="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-4 flex flex-col justify-center items-center gap-[2px] opacity-0 group-hover:opacity-100 transition-opacity">
               <div class="w-1 h-1 rounded-full bg-gray-300"></div><div class="w-1 h-1 rounded-full bg-gray-300"></div>
            </div>

            <div class="flex items-start gap-4">
              <div class="flex-1">
                <div class="flex items-center gap-1 mb-3">
                  <h3 class="text-[15px] font-medium text-gray-800">{{ q.text }}</h3>
                  <span v-if="q.isRequired" class="text-red-500 font-bold">*</span>
                </div>

                <!-- Static Preview -->
                <div v-if="q.type === 'multiple_choice'" class="space-y-3">
                  <div v-for="(opt, i) in q.options" :key="i" class="flex items-center gap-4 bg-gray-50 px-4 py-2 rounded-lg border border-gray-100">
                    <div class="w-4 h-4 rounded-full border border-gray-400 bg-white"></div>
                    <span class="text-sm font-medium text-gray-700">{{ opt }}</span>
                  </div>
                </div>
                
                <div v-else-if="q.type === 'likert'" class="flex items-center gap-10 mt-4">
                  <div class="flex flex-col items-center">
                    <span class="text-sm text-gray-500 mb-2">1</span>
                    <div class="w-4 h-4 rounded-full border-2 border-gray-300"></div>
                  </div>
                  <div class="flex-1 flex justify-between items-center px-4">
                     <div class="w-4 h-4 rounded-full border-2 border-gray-300"></div>
                     <div class="w-4 h-4 rounded-full border-2 border-gray-300"></div>
                     <div class="w-4 h-4 rounded-full border-2 border-gray-300"></div>
                  </div>
                  <div class="flex flex-col items-center">
                    <span class="text-sm text-gray-500 mb-2">5</span>
                    <div class="w-4 h-4 rounded-full border-2 border-gray-300"></div>
                  </div>
                </div>

                <div v-else-if="q.type === 'text'">
                  <div class="border-b border-gray-300 w-1/2 pb-1 text-sm text-gray-400">Teks jawaban singkat</div>
                </div>
              </div>
            </div>
          </div>

          <!-- ACTIVE STATE (Edit Mode) -->
          <div 
            v-else
            class="bg-white rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.08)] ring-2 ring-purple-500 border border-transparent relative pt-6 z-10 scale-[1.01] transition-all"
          >
            <!-- Drag handle top -->
            <div class="absolute top-1 left-1/2 -translate-x-1/2 w-8 h-4 flex flex-col justify-center items-center gap-[2px] cursor-move text-gray-300 hover:text-gray-500">
               <GripVertical class="w-4 h-4 rotate-90" />
            </div>

            <div class="px-6 pb-4">
              <div class="flex flex-col md:flex-row gap-4 mb-4">
                <!-- Question Title Input -->
                <div class="flex-1 bg-gray-50 rounded-md border-b-2 border-gray-300 focus-within:border-purple-600 transition-colors px-4 py-3">
                  <input
                    v-model="editForm.text"
                    type="text"
                    placeholder="Pertanyaan"
                    class="w-full bg-transparent text-[15px] font-medium text-gray-900 focus:outline-none placeholder-gray-500"
                    @blur="saveCurrentEdit"
                  />
                </div>
                
                <!-- Question Type Dropdown -->
                <div class="w-full md:w-56">
                  <div class="relative group h-full">
                    <select
                      v-model="editForm.type"
                      class="w-full h-full appearance-none bg-white border border-gray-300 rounded-md px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer flex items-center"
                      @change="saveCurrentEdit"
                    >
                      <option value="multiple_choice">Pilihan Ganda</option>
                      <option value="text">Jawaban Singkat</option>
                      <option value="likert">Skala Likert</option>
                    </select>
                    <div class="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
                      <ChevronDown class="w-4 h-4" />
                    </div>
                  </div>
                </div>
              </div>

              <!-- Options Editor (Dynamic based on type) -->
              <div class="mt-4 pl-1">
                <!-- Multiple Choice Options -->
                <div v-if="editForm.type === 'multiple_choice'" class="space-y-2">
                  <div 
                    v-for="(_, optIdx) in editForm.options" 
                    :key="optIdx" 
                    class="flex items-center gap-3 group/opt bg-gray-50 px-3 rounded-lg border border-gray-200 focus-within:border-purple-400 transition-colors"
                  >
                    <div class="w-4 h-4 rounded-full border border-gray-400 shrink-0 bg-white"></div>
                    <div class="flex-1 relative">
                       <input
                        v-model="editForm.options[optIdx]"
                        type="text"
                        class="w-full text-sm py-2.5 bg-transparent border-none focus:outline-none text-gray-800 font-medium"
                        @blur="saveCurrentEdit"
                        placeholder="Opsi"
                      />
                    </div>
                    <button 
                      v-if="editForm.options.length > 1"
                      @click="removeOption(optIdx); saveCurrentEdit()" 
                      class="p-2 text-gray-400 hover:text-gray-700 opacity-0 group-hover/opt:opacity-100 transition-opacity"
                    >
                      <X class="w-4 h-4" />
                    </button>
                  </div>
                  <div class="flex items-center gap-3 mt-2">
                    <div class="w-4 h-4 rounded-full border-2 border-gray-300 shrink-0"></div>
                    <button 
                      @click="addOption" 
                      class="text-sm text-gray-500 hover:text-gray-800 focus:outline-none border-b border-transparent hover:border-gray-300 py-1.5 transition-colors"
                    >
                      Tambahkan opsi
                    </button>
                  </div>
                </div>

                <!-- Text Option -->
                <div v-else-if="editForm.type === 'text'" class="pt-2">
                  <div class="border-b border-gray-300 border-dotted w-1/2 pb-1 text-sm text-gray-400">Teks jawaban singkat</div>
                </div>

                <!-- Likert Option -->
                <div v-else-if="editForm.type === 'likert'" class="pt-2 flex items-center gap-4">
                  <div class="flex items-center gap-3 bg-gray-50 p-3 rounded-lg border border-gray-200">
                     <span class="text-sm font-medium text-gray-600">Skala:</span>
                     <span class="text-sm bg-white px-2 py-1 rounded border border-gray-300">1</span>
                     <span class="text-sm text-gray-500">sampai</span>
                     <span class="text-sm bg-white px-2 py-1 rounded border border-gray-300">5</span>
                  </div>
                  <span class="text-xs text-gray-500 italic">*Label 1: Sangat Kurang, 5: Sangat Baik (Default)</span>
                </div>
              </div>
            </div>

            <!-- Footer Toolbar -->
            <div class="border-t border-gray-200 px-6 py-3 flex items-center justify-end gap-2 text-gray-600">
               <!-- Move actions (temporary until drag and drop is fully implemented) -->
               <button @click="moveUp(index)" :disabled="index === 0" class="p-2 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-30 tooltip-target" title="Pindah ke Atas">
                 <ArrowLeft class="w-5 h-5 rotate-90" />
               </button>
               <button @click="moveDown(index)" :disabled="index === questions.length - 1" class="p-2 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-30 tooltip-target" title="Pindah ke Bawah">
                 <ArrowLeft class="w-5 h-5 -rotate-90" />
               </button>
               
               <div class="w-px h-6 bg-gray-300 mx-2"></div>
               
               <button @click="duplicateQuestion(q)" class="p-2 hover:bg-purple-50 text-purple-600 hover:text-purple-700 rounded-lg transition-colors flex items-center gap-1.5" title="Duplikasi Pertanyaan ini">
                 <Copy class="w-4 h-4" />
                 <span class="text-xs font-semibold">DUPLIKAT</span>
               </button>
               <button @click="deleteQuestion(q.id)" class="p-2 hover:bg-red-50 text-gray-500 hover:text-red-500 rounded-lg transition-colors flex items-center gap-1.5" title="Hapus">
                 <Trash2 class="w-4 h-4" />
                 <span class="text-xs font-semibold">HAPUS</span>
               </button>
               
               <div class="w-px h-6 bg-gray-300 mx-2"></div>
               
               <div class="flex items-center gap-3">
                 <span class="text-sm font-medium">Wajib diisi</span>
                 <label class="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    v-model="editForm.isRequired" 
                    class="sr-only peer"
                    @change="saveCurrentEdit"
                  >
                  <div class="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
                </label>
               </div>
               
               <button class="p-2 hover:bg-gray-100 rounded-full transition-colors ml-2">
                 <MoreVertical class="w-5 h-5" />
               </button>
            </div>
          </div>
        </template>

        <!-- ACTIVE STATE FOR NEW QUESTION -->
        <div 
          v-if="isAddingQuestion"
          class="bg-white rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.08)] ring-2 ring-purple-500 border border-transparent relative pt-6 z-10 scale-[1.01] transition-all"
        >
          <div class="px-6 pb-4">
            <div class="flex flex-col md:flex-row gap-4 mb-4">
              <!-- Question Title Input -->
              <div class="flex-1 bg-gray-50 rounded-md border-b-2 border-gray-300 focus-within:border-purple-600 transition-colors px-4 py-3">
                <input
                  v-model="editForm.text"
                  type="text"
                  placeholder="Pertanyaan"
                  class="w-full bg-transparent text-[15px] font-medium text-gray-900 focus:outline-none placeholder-gray-500"
                  autofocus
                />
              </div>
              
              <!-- Question Type Dropdown -->
              <div class="w-full md:w-56">
                <div class="relative group h-full">
                  <select
                    v-model="editForm.type"
                    class="w-full h-full appearance-none bg-white border border-gray-300 rounded-md px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer flex items-center"
                  >
                    <option value="multiple_choice">Pilihan Ganda</option>
                    <option value="text">Jawaban Singkat</option>
                    <option value="likert">Skala Likert</option>
                  </select>
                  <div class="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
                    <ChevronDown class="w-4 h-4" />
                  </div>
                </div>
              </div>
            </div>

            <!-- Options Editor -->
            <div class="mt-4 pl-1">
              <div v-if="editForm.type === 'multiple_choice'" class="space-y-2">
                <div v-for="(_, optIdx) in editForm.options" :key="optIdx" class="flex items-center gap-3 group/opt bg-gray-50 px-3 rounded-lg border border-gray-200 focus-within:border-purple-400 transition-colors">
                  <div class="w-4 h-4 rounded-full border border-gray-400 shrink-0 bg-white"></div>
                  <div class="flex-1 relative">
                     <input
                      v-model="editForm.options[optIdx]"
                      type="text"
                      class="w-full text-sm py-2.5 bg-transparent border-none focus:outline-none text-gray-800 font-medium"
                      placeholder="Opsi"
                      autofocus
                    />
                  </div>
                  <button v-if="editForm.options.length > 1" @click="removeOption(optIdx)" class="p-2 text-gray-400 hover:text-gray-700 opacity-0 group-hover/opt:opacity-100 transition-opacity">
                    <X class="w-4 h-4" />
                  </button>
                </div>
                <div class="flex items-center gap-3 mt-2">
                  <div class="w-4 h-4 rounded-full border-2 border-gray-300 shrink-0"></div>
                  <button @click="addOption" class="text-sm text-gray-500 hover:text-gray-800 focus:outline-none border-b border-transparent hover:border-gray-300 py-1.5 transition-colors">
                    Tambahkan opsi
                  </button>
                </div>
              </div>
              <div v-else-if="editForm.type === 'text'" class="pt-2">
                <div class="border-b border-gray-300 border-dotted w-1/2 pb-1 text-sm text-gray-400">Teks jawaban singkat</div>
              </div>
              <div v-else-if="editForm.type === 'likert'" class="pt-2 flex items-center gap-4">
                  <div class="flex items-center gap-3 bg-gray-50 p-3 rounded-lg border border-gray-200">
                     <span class="text-sm font-medium text-gray-600">Skala:</span>
                     <span class="text-sm bg-white px-2 py-1 rounded border border-gray-300">1</span>
                     <span class="text-sm text-gray-500">sampai</span>
                     <span class="text-sm bg-white px-2 py-1 rounded border border-gray-300">5</span>
                  </div>
              </div>
            </div>
          </div>
          
          <div class="border-t border-gray-200 px-6 py-3 flex items-center justify-end gap-2 text-gray-600">
             <button @click="isAddingQuestion = false" class="p-2 hover:bg-red-50 text-gray-500 hover:text-red-500 rounded-lg transition-colors flex items-center gap-1.5" title="Batal & Hapus">
               <Trash2 class="w-4 h-4" />
             </button>
             
             <div class="w-px h-6 bg-gray-300 mx-2"></div>
             
             <div class="flex items-center gap-3">
               <span class="text-sm font-medium">Wajib diisi</span>
               <label class="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  v-model="editForm.isRequired" 
                  class="sr-only peer"
                >
                <div class="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
              </label>
             </div>
             
             <button class="p-2 hover:bg-gray-100 rounded-full transition-colors ml-2">
               <MoreVertical class="w-5 h-5" />
             </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>


<style scoped>
/* Removed sticky-fab as we use a fixed center pill bottom bar now */
</style>
