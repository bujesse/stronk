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

export function formatElapsedCompact(startAt: string, endAt: string | null = null) {
  const end = endAt ? new Date(endAt).getTime() : Date.now()
  const totalMinutes = Math.max(0, Math.floor((end - new Date(startAt).getTime()) / 60000))

  if (totalMinutes < 60) {
    return `${Math.max(1, totalMinutes)}m`
  }

  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60

  if (minutes === 0) {
    return `${hours}h`
  }

  return `${hours}h ${minutes}m`
}

export function formatDurationSeconds(value: number | null) {
  if (value == null) {
    return '0:00'
  }

  const totalSeconds = Math.max(0, Math.round(value))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

function pad(value: number) {
  return String(value).padStart(2, '0')
}

export function toDateTimeLocalValue(value: string | null) {
  if (!value) {
    return ''
  }

  const date = new Date(value)
  const year = date.getFullYear()
  const month = pad(date.getMonth() + 1)
  const day = pad(date.getDate())
  const hours = pad(date.getHours())
  const minutes = pad(date.getMinutes())

  return `${year}-${month}-${day}T${hours}:${minutes}`
}

export function fromDateTimeLocalValue(value: string) {
  return new Date(value).toISOString()
}
