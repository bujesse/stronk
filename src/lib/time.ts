export function nowIso() {
  return new Date().toISOString()
}

export function formatDateTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value))
}

export function formatShortDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
  }).format(new Date(value))
}

export function formatDurationFromNow(endAt: string | null) {
  if (!endAt) {
    return '0:00'
  }

  const remaining = Math.max(
    0,
    Math.ceil((new Date(endAt).getTime() - Date.now()) / 1000),
  )
  const minutes = Math.floor(remaining / 60)
  const seconds = remaining % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

export function minutesBetween(startAt: string, endAt: string | null) {
  const end = endAt ? new Date(endAt).getTime() : Date.now()
  return Math.max(1, Math.round((end - new Date(startAt).getTime()) / 60000))
}
