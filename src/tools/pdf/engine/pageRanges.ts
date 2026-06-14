export const parsePageSelection = (input: string, pageCount: number): number[] => {
  const normalized = input.trim()
  if (!normalized) {
    return Array.from({ length: pageCount }, (_, index) => index)
  }

  const selected = new Set<number>()
  const parts = normalized.split(',').map((part) => part.trim()).filter(Boolean)

  for (const part of parts) {
    if (part.includes('-')) {
      const [startText, endText] = part.split('-').map((value) => value.trim())
      const start = Number(startText)
      const end = Number(endText)
      if (!Number.isInteger(start) || !Number.isInteger(end)) continue

      const lower = Math.max(1, Math.min(start, end))
      const upper = Math.min(pageCount, Math.max(start, end))
      for (let page = lower; page <= upper; page += 1) {
        selected.add(page - 1)
      }
    } else {
      const page = Number(part)
      if (Number.isInteger(page) && page >= 1 && page <= pageCount) {
        selected.add(page - 1)
      }
    }
  }

  return Array.from(selected).sort((a, b) => a - b)
}

export const parsePageOrder = (input: string, pageCount: number): number[] => {
  const normalized = input.trim()
  if (!normalized) {
    return Array.from({ length: pageCount }, (_, index) => index)
  }

  const order = normalized
    .split(',')
    .map((part) => Number(part.trim()))
    .filter((page) => Number.isInteger(page) && page >= 1 && page <= pageCount)
    .map((page) => page - 1)

  return order.length > 0 ? order : Array.from({ length: pageCount }, (_, index) => index)
}
