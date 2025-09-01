'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import Image from 'next/image'
import AutocompleteMulti from '@/app/components/AutocompleteMulti'

type Listing = {
  id: string
  title: string
  bike_type: string
  condition: string
  price: number
  location: string
  brand: string | null
  model: string | null
  category_id: number | null
  images: string[]
}

type Category = {
  id: number
  name: string
}

export default function Home() {
  const [listings, setListings] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filtros
  const [filterCategoryId, setFilterCategoryId] = useState<number | null>(null)
  const [filterType, setFilterType] = useState<string>('')
  const [filterCondition, setFilterCondition] = useState<string>('')
  const [filterBrands, setFilterBrands] = useState<string[]>([])
  const [filterModels, setFilterModels] = useState<string[]>([])

  const categories: Category[] = [
    { id: 1, name: 'bicicleta' },
    { id: 2, name: 'componente' },
    { id: 3, name: 'accesorio' },
    { id: 4, name: 'ropa' },
  ]

  const conditions = ['nuevo', 'usado']
  const types = ['urbana', 'carretera', 'mtb', 'gravel', 'electrica']

  const fetchListings = async () => {
    setLoading(true)
    setError(null)
    try {
      let query = supabase.from('listings').select('*')

      if (filterCategoryId) query = query.eq('category_id', filterCategoryId)
      if (filterType) query = query.eq('bike_type', filterType)
      if (filterCondition) query = query.eq('condition', filterCondition)
      if (filterBrands.length > 0) query = query.in('brand', filterBrands)
      if (filterModels.length > 0) query = query.in('model', filterModels)

      const { data, error } = await query
        .order('created_at', { ascending: false })
        .limit(20)

      if (error) setError(error.message)
      else setListings(data || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchListings()
  }, [filterCategoryId, filterType, filterCondition, filterBrands, filterModels])

  return (
    <main className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Proyecto Bici 🚴‍♂️</h1>

      {/* Filtros */}
      <section className="mb-6 p-4 border rounded space-y-4">
        {/* Categorías */}
        <div>
          <p className="mb-2 font-medium">Categoría:</p>
          <div className="flex gap-2 flex-wrap">
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setFilterCategoryId(cat.id)}
                className={`px-3 py-1 rounded-full border ${
                  filterCategoryId === cat.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 hover:bg-gray-200'
                }`}
              >
                {cat.name}
              </button>
            ))}
            <button
              onClick={() => setFilterCategoryId(null)}
              className={`px-3 py-1 rounded-full border ${
                filterCategoryId === null
                  ? 'bg-gray-800 text-white'
                  : 'bg-gray-100 hover:bg-gray-200'
              }`}
            >
              Todas
            </button>
          </div>
        </div>

        {/* Marcas */}
        <div>
          <p className="mb-2 font-medium">Marcas:</p>
          <AutocompleteMulti
            table="brands"
            selectedValues={filterBrands}
            onChange={setFilterBrands}
          />
        </div>

        {/* Modelos */}
        <div>
          <p className="mb-2 font-medium">Modelos:</p>
          <AutocompleteMulti
            table="models"
            selectedValues={filterModels}
            onChange={setFilterModels}
          />
        </div>

        {/* Tipo */}
        <div>
          <p className="mb-2 font-medium">Tipo:</p>
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            className="p-2 border rounded w-full"
          >
            <option value="">Todos</option>
            {types.map(t => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        {/* Condición */}
        <div>
          <p className="mb-2 font-medium">Condición:</p>
          <div className="flex gap-2 flex-wrap">
            {conditions.map(c => (
              <button
                key={c}
                onClick={() => setFilterCondition(c)}
                className={`px-3 py-1 rounded-full border ${
                  filterCondition === c
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 hover:bg-gray-200'
                }`}
              >
                {c}
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
        {listings.map(listing => {
          const imageUrl =
            listing.images && listing.images.length > 0
              ? supabase.storage
                  .from('bike-images')
                  .getPublicUrl(listing.images[0]).data.publicUrl
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
              {listing.model && <p className="text-sm">Modelo: {listing.model}</p>}
              <p className="text-sm text-gray-500">📍 {listing.location}</p>
            </div>
          )
        })}
      </section>

      {!loading && listings.length === 0 && (
        <p className="text-gray-500">No hay anuncios que mostrar.</p>
      )}
    </main>
  )
}
