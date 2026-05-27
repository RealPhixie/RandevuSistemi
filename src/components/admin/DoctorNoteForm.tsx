'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

import {
  getDoctorNoteEntryBody,
  parseDoctorNoteEntries,
} from '@/lib/doctor-note-entries'

interface DoctorNoteFormProps {
  patientId: string
  initialContent: string
  initialUpdatedAt: string
}

interface DoctorNoteResponse {
  success: boolean
  data?: {
    content: string
    updatedAt: string
  }
  error?: string
}

const noteDateFormatter = new Intl.DateTimeFormat('tr-TR', {
  dateStyle: 'long',
  timeStyle: 'short',
})

function formatNoteDate(value: string) {
  if (!value) return ''

  return noteDateFormatter.format(new Date(value))
}

export function DoctorNoteForm({
  patientId,
  initialContent,
  initialUpdatedAt,
}: DoctorNoteFormProps) {
  const router = useRouter()
  const [content, setContent] = useState('')
  const [noteContent, setNoteContent] = useState(initialContent)
  const [updatedAt, setUpdatedAt] = useState(initialUpdatedAt)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editingContent, setEditingContent] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const noteEntries = parseDoctorNoteEntries(noteContent)
  const hasNoteEntries = noteEntries.length > 0

  async function mutateNote(
    method: 'PUT' | 'PATCH' | 'DELETE',
    body: { content?: string; entryIndex?: number },
    fallbackError: string
  ) {
    setIsSaving(true)
    setError('')

    try {
      const response = await fetch('/api/doctor-notes', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patientId, ...body }),
      })
      const payload = (await response.json()) as DoctorNoteResponse

      if (!response.ok || !payload.success) {
        setError(payload.error ?? fallbackError)
        return null
      }

      return payload.data ?? { content: '', updatedAt: '' }
    } catch {
      setError(fallbackError)
      return null
    } finally {
      setIsSaving(false)
    }
  }

  function updateLocalNote(data: { content: string; updatedAt: string }) {
    setNoteContent(data.content)
    setUpdatedAt(data.updatedAt)
    setEditingIndex(null)
    setEditingContent('')
  }

  async function saveNote() {
    const nextContent = content.trim()

    if (!nextContent) {
      setError('Doktor notu boş bırakılamaz.')
      return
    }

    const data = await mutateNote(
      'PUT',
      { content: nextContent },
      'Doktor notu kaydedilemedi.'
    )

    if (data) {
      router.push('/admin/appointments')
    }
  }

  function startEditing(index: number, entry: string) {
    setEditingIndex(index)
    setEditingContent(getDoctorNoteEntryBody(entry))
    setError('')
  }

  async function saveEditedNote(index: number) {
    const nextContent = editingContent.trim()

    if (!nextContent) {
      setError('Doktor notu boş bırakılamaz.')
      return
    }

    const data = await mutateNote(
      'PATCH',
      { entryIndex: index, content: nextContent },
      'Doktor notu güncellenemedi.'
    )

    if (data) updateLocalNote(data)
  }

  async function deleteNote(index: number) {
    if (!window.confirm('Bu not silinsin mi?')) return

    const data = await mutateNote(
      'DELETE',
      { entryIndex: index },
      'Doktor notu silinemedi.'
    )

    if (data) updateLocalNote(data)
  }

  return (
    <section className="rounded-3xl border border-[#cbd8ea] bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
        <h2 className="text-xl font-bold text-[#0d1b3d]">Doktor Notu</h2>
        {updatedAt ? (
          <span className="text-sm font-semibold text-[#70809a]">
            Son güncelleme: {formatNoteDate(updatedAt)}
          </span>
        ) : null}
      </div>

      {hasNoteEntries ? (
        <div className="grid gap-3">
          {noteEntries.map((entry, index) => (
            <div
              key={`${index}-${entry.slice(0, 24)}`}
              className="rounded-2xl border border-[#e4ebf5] bg-[#f8fbff] p-4"
            >
              {editingIndex === index ? (
                <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                  <textarea
                    aria-label="Düzenlenen doktor notu"
                    value={editingContent}
                    onChange={(event) => {
                      setEditingContent(event.target.value)
                      setError('')
                    }}
                    maxLength={5000}
                    rows={4}
                    className="w-full resize-y rounded-2xl border border-[#cbd8ea] px-4 py-3 text-sm font-semibold text-[#102040] outline-none transition focus:border-red-500"
                  />
                  <div className="flex flex-wrap items-start gap-2 sm:flex-col">
                    <button
                      type="button"
                      disabled={isSaving || !editingContent.trim()}
                      onClick={() => void saveEditedNote(index)}
                      className="h-10 rounded-xl bg-red-600 px-4 text-xs font-bold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-[#9aa7ba]"
                    >
                      Kaydet
                    </button>
                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={() => {
                        setEditingIndex(null)
                        setEditingContent('')
                      }}
                      className="h-10 rounded-xl border border-[#cbd8ea] px-4 text-xs font-bold text-[#30476f] transition hover:border-red-500 hover:text-red-600 disabled:cursor-not-allowed disabled:text-[#9aa7ba]"
                    >
                      Vazgeç
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-start">
                  <p className="whitespace-pre-wrap text-sm font-semibold leading-6 text-[#102040]">
                    {entry}
                  </p>
                  <div className="flex flex-wrap gap-2 sm:justify-end">
                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={() => startEditing(index, entry)}
                      className="h-9 rounded-xl border border-[#cbd8ea] px-3 text-xs font-bold text-[#30476f] transition hover:border-red-500 hover:text-red-600 disabled:cursor-not-allowed disabled:text-[#9aa7ba]"
                    >
                      Düzenle
                    </button>
                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={() => void deleteNote(index)}
                      className="h-9 rounded-xl border border-red-200 px-3 text-xs font-bold text-red-700 transition hover:border-red-500 hover:bg-red-50 disabled:cursor-not-allowed disabled:text-[#9aa7ba]"
                    >
                      Sil
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : null}

      <textarea
        aria-label="Yeni doktor notu"
        value={content}
        onChange={(event) => {
          setContent(event.target.value)
          setError('')
        }}
        maxLength={5000}
        rows={hasNoteEntries ? 5 : 8}
        className={`w-full resize-y rounded-2xl border border-[#cbd8ea] px-4 py-3 text-sm font-semibold text-[#102040] outline-none transition focus:border-red-500 ${
          hasNoteEntries ? 'mt-6' : ''
        }`}
      />

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={isSaving || !content.trim()}
          onClick={() => void saveNote()}
          className="h-11 rounded-2xl bg-red-600 px-6 text-sm font-bold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-[#9aa7ba]"
        >
          {isSaving ? 'Kaydediliyor' : 'Kaydet ve Çık'}
        </button>

        {error ? (
          <span className="text-sm font-bold text-red-700">{error}</span>
        ) : null}
      </div>
    </section>
  )
}
