'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useAuth } from '@/app/AuthProvider'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const PLACEHOLDER_IMAGE = '/placeholder-bike.png' // pon aquí tu imagen local de placeholder

export default function MyListings() {
  const { user } = useAuth()
  const [listings, setListings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    const fetchListings = async () => {
      const { data, error } = await supabase
        .from('listings')
        .select('*')
        .eq('user_id', user.id)

      if (error) console.error(error)
      else setListings(data || [])
      setLoading(false)
    }
    fetchListings()
  }, [user])

  if (loading) return <p>Cargando tus anuncios...</p>

  if (listings.length === 0) return <p>No tienes anuncios publicados.</p>

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Mis anuncios</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {listings.map((l) => (
          <div key={l.id} className="border p-4 rounded">
            <h3 className="font-bold">{l.title}</h3>
            <p>Precio: €{l.price}</p>
            <img
              src={
                l.images?.length > 0
                  ? `${SUPABASE_URL}/storage/v1/object/public/bike-images/${l.images[0]}`
                  : PLACEHOLDER_IMAGE
              }
              alt={l.title}
              className="mt-2 w-full h-48 object-cover rounded"
            />
          </div>
        ))}
      </div>
    </div>
  )
}
