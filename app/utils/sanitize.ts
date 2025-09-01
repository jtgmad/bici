// utils/sanitize.ts

export const sanitizeText = (str: string, max: number = 200) => {
  if (!str) return ''
  // elimina etiquetas HTML y caracteres raros
  let clean = str.replace(/<[^>]*>?/gm, '').replace(/[^\p{L}\p{N}\s\-_.,]/gu, '')
  if (clean.length > max) clean = clean.substring(0, max)
  return clean.trim()
}

export const sanitizeShort = (str: string) => sanitizeText(str, 50)
export const sanitizeLong = (str: string) => sanitizeText(str, 2000)


export function sanitizeInput(value: string, maxLen = 255): string {
  if (!value) return ""
  return value
    .replace(/<[^>]*>?/gm, "")   // quita etiquetas HTML
    .replace(/[^\p{L}\p{N}\p{P}\p{Zs}]/gu, "") // quita caracteres no estándar
    .trim()
    .slice(0, maxLen)
}

export function sanitizeNumber(value: any, min = 0, max = 999999): number | null {
  const num = Number(value)
  if (isNaN(num)) return null
  if (num < min) return min
  if (num > max) return max
  return num
}
