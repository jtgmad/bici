// src/lib/storage.ts

import { supabase } from '@/lib/supabaseClient'

/**
 * Devuelve la URL pública de la primera imagen de un listing.
 * Si no existe path, devuelve null.
 */
export function getFirstImagePublicUrl(path?: string | null): string | null {
  if (!path) return null
  const { data } = supabase.storage.from('bike-images').getPublicUrl(path)
  return data?.publicUrl ?? null
}
