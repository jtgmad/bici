'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import Image from "next/image"

type Listing = {
  id: string
  title: string
  bike_type: string
  condition: string
  price: number
  location: string
  brand: string | null
  category_id: number | null
  images: string[]
}

export default function Home() {
  const [listings, setListings] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filtros
  const [filterCategory, setFilterCategory] = useState<string>('bicicleta')
  const [filterType, setFilterType] = useState<string>('')
  const [filterCondition, setFilterCondition] = useState<string>('')

  useEffect(() => {
    const fetchListings = async () => {
      setLoading(true)
      setError(null)

      try {
        let query = supabase.from('listings').select('*')

        if (filterType) query = query.eq('bike_type', filterType)
        if (filterCondition) query = query.eq('condition', filterCondition)

        const { data, error } = await query
          .order('created_at', { ascending: false })
          .limit(20)

        if (error) {
          console.error('Error al cargar anuncios:', error)
          setError(error.message)
        } else {
          setListings(data || [])
        }
      } catch (err: any) {
        console.error('Error inesperado:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchListings()
  }, [filterCategory, filterType, filterCondition])

  const categories = ['bicicleta', 'componente', 'accesorio', 'ropa']
  const conditions = ['nuevo', 'usado']

  return (
    <main className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Proyecto Bici 🚴‍♂️</h1>

      {/* Filtros */}
      <section className="mb-6 p-4 border rounded">
        <h2 className="font-semibold mb-3">Filtros</h2>

        {/* Categoría */}
        <div className="mb-4">
          <p className="mb-2 font-medium">Categoría:</p>
          <div className="flex gap-2 flex-wrap">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setFilterCategory(cat)}
                className={`px-3 py-1 rounded-full border ${
                  filterCategory === cat
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 hover:bg-gray-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Tipo */}
        <div className="mb-4">
          <p className="mb-2 font-medium">Tipo:</p>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="p-2 border rounded"
          >
            <option value="">Todos</option>
            <option value="urbana">Urbana</option>
            <option value="carretera">Carretera</option>
            <option value="mtb">MTB</option>
            <option value="gravel">Gravel</option>
            <option value="electrica">Eléctrica</option>
          </select>
        </div>

        {/* Condición */}
        <div className="mb-4">
          <p className="mb-2 font-medium">Condición:</p>
          <div className="flex gap-2">
            {conditions.map((cond) => (
              <button
                key={cond}
                onClick={() => setFilterCondition(cond)}
                className={`px-3 py-1 rounded-full border ${
                  filterCondition === cond
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 hover:bg-gray-200'
                }`}
              >
                {cond}
              </button>
            ))}
            <button
              onClick={() => setFilterCondition('')}
              className={`px-3 py-1 rounded-full border ${
                filterCondition === ''
                  ? 'bg-gray-800 text-white'
                  : 'bg-gray-100 hover:bg-gray-200'
              }`}
            >
              Todas
            </button>
          </div>
        </div>
      </section>

      {/* Listado */}
      {loading && <p>Cargando anuncios...</p>}
      {error && <p className="text-red-500">Error: {error}</p>}

      <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {listings.map((listing) => {
          const imageUrl =
            listing.images && listing.images.length > 0
              ? supabase.storage.from('bike-images').getPublicUrl(listing.images[0]).data.publicUrl
              : null

          return (
            <div key={listing.id} className="border rounded-lg p-4 shadow-md">
              {imageUrl ? (
                <Image
                  src={imageUrl}
                  alt={listing.title}
                  width={300}
                  height={200}
                  className="w-full h-48 object-cover rounded-md"
                />
              ) : (
                <div className="w-full h-48 bg-gray-200 flex items-center justify-center rounded-md">
                  <span className="text-gray-500">Sin imagen</span>
                </div>
              )}

              <h3 className="font-semibold mt-2">{listing.title}</h3>
              <p className="text-blue-600 font-bold">€{listing.price}</p>
              <p className="text-sm">Tipo: {listing.bike_type}</p>
              <p className="text-sm">Condición: {listing.condition}</p>
              {listing.brand && <p className="text-sm">Marca: {listing.brand}</p>}
              <p className="text-sm text-gray-500">📍 {listing.location}</p>
            </div>
          )
        })}
      </section>

      {listings.length === 0 && !loading && (
        <p className="text-gray-500">No hay anuncios que mostrar.</p>
      )}
    </main>
  )
}
