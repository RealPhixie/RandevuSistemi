'use client'

import { useState } from 'react'

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
  const [content, setContent] = useState(initialContent)
  const [updatedAt, setUpdatedAt] = useState(initialUpdatedAt)
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function saveNote() {
    const nextContent = content.trim()

    if (!nextContent) {
      setMessage('')
      setError('Doktor notu boş bırakılamaz.')
      return
    }

    setIsSaving(true)
    setMessage('')
    setError('')

    try {
      const response = await fetch('/api/doctor-notes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patientId, content: nextContent }),
      })
      const payload = (await response.json()) as DoctorNoteResponse

      if (!response.ok || !payload.success || !payload.data) {
        setError(payload.error ?? 'Doktor notu kaydedilemedi.')
        return
      }

      setContent(payload.data.content)
      setUpdatedAt(payload.data.updatedAt)
      setMessage('Kaydedildi ✓')
    } catch {
      setError('Doktor notu kaydedilemedi.')
    } finally {
      setIsSaving(false)
    }
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

      <textarea
        aria-label="Doktor Notu"
        value={content}
        onChange={(event) => {
          setContent(event.target.value)
          setMessage('')
          setError('')
        }}
        maxLength={5000}
        rows={8}
        className="w-full resize-y rounded-2xl border border-[#cbd8ea] px-4 py-3 text-sm font-semibold text-[#102040] outline-none transition focus:border-red-500"
      />

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={isSaving || !content.trim()}
          onClick={() => void saveNote()}
          className="h-11 rounded-2xl bg-red-600 px-6 text-sm font-bold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-[#9aa7ba]"
        >
          {isSaving ? 'Kaydediliyor' : 'Kaydet'}
        </button>

        {message ? (
          <span className="text-sm font-bold text-emerald-700">{message}</span>
        ) : null}

        {error ? (
          <span className="text-sm font-bold text-red-700">{error}</span>
        ) : null}
      </div>
    </section>
  )
}
