const NOTE_ENTRY_SEPARATOR = '\n\n'
const DATED_ENTRY_SPLIT_PATTERN =
  /\n{2,}(?=\d{2}\.\d{2}\.\d{4} \d{2}:\d{2} - )/g
const DATED_ENTRY_PREFIX_PATTERN =
  /^(\d{2}\.\d{2}\.\d{4} \d{2}:\d{2} - )([\s\S]*)$/

const noteTimestampFormatter = new Intl.DateTimeFormat('tr-TR', {
  timeZone: 'Europe/Istanbul',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  hourCycle: 'h23',
})

export function parseDoctorNoteEntries(content: string) {
  const trimmedContent = content.trim()

  if (!trimmedContent) return []

  return trimmedContent
    .split(DATED_ENTRY_SPLIT_PATTERN)
    .map((entry) => entry.trim())
    .filter(Boolean)
}

export function getDoctorNoteEntryBody(entry: string) {
  return entry.match(DATED_ENTRY_PREFIX_PATTERN)?.[2] ?? entry
}

function formatNoteTimestamp(date = new Date()) {
  const parts = Object.fromEntries(
    noteTimestampFormatter
      .formatToParts(date)
      .map((part) => [part.type, part.value])
  )

  return `${parts.day}.${parts.month}.${parts.year} ${parts.hour}:${parts.minute}`
}

function buildDatedEntry(content: string) {
  return `${formatNoteTimestamp()} - ${content}`
}

function replaceEntryBody(entry: string, content: string) {
  const prefix = entry.match(DATED_ENTRY_PREFIX_PATTERN)?.[1]
  return prefix ? `${prefix}${content}` : content
}

export function appendDoctorNoteEntry(currentContent: string, newContent: string) {
  return [...parseDoctorNoteEntries(currentContent), buildDatedEntry(newContent)]
    .join(NOTE_ENTRY_SEPARATOR)
}

export function updateDoctorNoteEntry(
  currentContent: string,
  entryIndex: number,
  newContent: string
) {
  const entries = parseDoctorNoteEntries(currentContent)

  if (!entries[entryIndex]) return null

  entries[entryIndex] = replaceEntryBody(entries[entryIndex], newContent)
  return entries.join(NOTE_ENTRY_SEPARATOR)
}

export function deleteDoctorNoteEntry(currentContent: string, entryIndex: number) {
  const entries = parseDoctorNoteEntries(currentContent)

  if (!entries[entryIndex]) return null

  entries.splice(entryIndex, 1)
  return entries.join(NOTE_ENTRY_SEPARATOR)
}
