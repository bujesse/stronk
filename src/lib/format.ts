import type { WeightUnit } from './types'

const KG_PER_LB = 0.45359237

export function toStorageWeight(weight: number | null, unit: WeightUnit) {
  if (weight == null) {
    return null
  }

  const normalized = unit === 'lb' ? weight * KG_PER_LB : weight
  return Number(normalized.toFixed(3))
}

export function fromStorageWeight(weight: number | null, unit: WeightUnit) {
  if (weight == null) {
    return null
  }

  const converted = unit === 'lb' ? weight / KG_PER_LB : weight
  return Number(converted.toFixed(1))
}

export function formatWeight(weight: number | null, unit: WeightUnit) {
  if (weight == null) {
    return '--'
  }

  const displayWeight = fromStorageWeight(weight, unit)
  if (displayWeight == null) {
    return '--'
  }

  const rounded = Number.isInteger(displayWeight)
    ? displayWeight.toFixed(0)
    : displayWeight.toFixed(1)
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
