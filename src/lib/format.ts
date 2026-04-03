import type { WeightUnit } from './types'

export function formatWeight(weight: number | null, unit: WeightUnit) {
  if (weight == null) {
    return '--'
  }

  const rounded = Number.isInteger(weight) ? weight.toFixed(0) : weight.toFixed(1)
  return `${rounded} ${unit}`
}

export function parseOptionalNumber(value: string) {
  const trimmed = value.trim()
  if (!trimmed) {
    return null
  }

  const number = Number(trimmed)
  return Number.isFinite(number) ? number : null
}

export function pluralize(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`
}
