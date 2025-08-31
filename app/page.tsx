'use client'

import { useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function Home() {
  useEffect(() => {
    const fetchData = async () => {
      console.log('👉 Iniciando prueba de conexión con Supabase...')

      try {
        // 1. Intentamos leer los anuncios
        const { data, error } = await supabase
          .from('listings')
          .select('*')
          .limit(5)

        if (error) {
          console.error('❌ Error al leer datos:', error.message)
          return
        }

        if (data && data.length > 0) {
          console.log('✅ Conexión exitosa. Datos obtenidos:', data)
        } else {
          console.log('✅ Conexión exitosa, pero no hay anuncios aún. ¡Perfecto para un MVP vacío!')
        }
      } catch (err) {
        console.error('❌ Error inesperado:', err)
      }
    }

    fetchData()
  }, [])

  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold">Proyecto bici 🚴‍♂️</h1>
      <p>Prueba de conexión con Supabase en curso...</p>
      <p>Abre la consola del navegador (F12 → Console) para ver el resultado.</p>
    </main>
  )
}