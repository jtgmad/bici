'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import Image from 'next/image'

type Listing = {
  id: string
  title: string
  bike_type: string
  condition: string
  price: number
  location: string
  brand: string | null
  model: string | null
  frame_size: string | null
  wheel_size: string | null
  components: string[] | null
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
  const [filterBrand, setFilterBrand] = useState<string>('')
  const [filterModel, setFilterModel] = useState<string>('')
  const [filterFrameSize, setFilterFrameSize] = useState<string>('')
  const [filterWheelSize, setFilterWheelSize] = useState<string>('')
  const [priceMin, setPriceMin] = useState<number | ''>('')
  const [priceMax, setPriceMax] = useState<number | ''>('')

  useEffect(() => {
    const fetchListings = async () => {
      setLoading(true)
      setError(null)

      try {
        let query = supabase.from('listings').select('*')

        if (filterType) query = query.eq('bike_type', filterType)
        if (filterCondition) query = query.eq('condition', filterCondition)
        if (filterBrand) query = query.eq('brand', filterBrand)
        if (filterModel) query = query.eq('model', filterModel)
        if (filterFrameSize) query = query.eq('frame_size', filterFrameSize)
        if (filterWheelSize) query = query.eq('wheel_size', filterWheelSize)
        if (priceMin !== '') query = query.gte('price', priceMin)
        if (priceMax !== '') query = query.lte('price', priceMax)

        const { data, error } = await query
          .order('created_at', { ascending: false })
          .limit(50)

        if (error) setError(error.message)
        else setListings(data || [])
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchListings()
  }, [
    filterCategory,
    filterType,
    filterCondition,
    filterBrand,
    filterModel,
    filterFrameSize,
    filterWheelSize,
    priceMin,
    priceMax,
  ])

  // Opciones para filtros (puedes cargar dinámicamente desde DB si quieres)
  const categories = ['bicicleta', 'componente', 'accesorio', 'ropa']
  const types = ['urbana', 'carretera', 'mtb', 'gravel', 'electrica']
  const conditions = ['nuevo', 'usado', 'restaurado']
  const brands = ['Trek', 'Specialized', 'Giant', 'Cannondale', 'Scott']
  const models = ['Model A', 'Model B', 'Model C']
  const frameSizes = ['48', '50', '52', '54', '56', '58']
  const wheelSizes = ['26', '27.5', '28', '29']

  return (
    <main className="p-8 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Proyecto Bici 🚴‍♂️</h1>

      {/* Filtros */}
      <section className="mb-6 p-4 border rounded space-y-4">
        <h2 className="font-semibold mb-2">Filtros</h2>

        {/* Categoría */}
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

        {/* Tipo */}
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="p-2 border rounded"
        >
          <option value="">Todos los tipos</option>
          {types.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>

        {/* Condición */}
        <select
          value={filterCondition}
          onChange={(e) => setFilterCondition(e.target.value)}
          className="p-2 border rounded"
        >
          <option value="">Cualquiera</option>
          {conditions.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        {/* Marca */}
        <select
          value={filterBrand}
          onChange={(e) => setFilterBrand(e.target.value)}
          className="p-2 border rounded"
        >
          <option value="">Todas las marcas</option>
          {brands.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>

        {/* Modelo */}
        <select
          value={filterModel}
          onChange={(e) => setFilterModel(e.target.value)}
          className="p-2 border rounded"
        >
          <option value="">Todos los modelos</option>
          {models.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>

        {/* Tamaño de cuadro */}
        <select
          value={filterFrameSize}
          onChange={(e) => setFilterFrameSize(e.target.value)}
          className="p-2 border rounded"
        >
          <option value="">Tamaño de cuadro</option>
          {frameSizes.map((f) => (
            <option key={f} value={f}>
              {f} cm
            </option>
          ))}
        </select>

        {/* Tamaño de ruedas */}
        <select
          value={filterWheelSize}
          onChange={(e) => setFilterWheelSize(e.target.value)}
          className="p-2 border rounded"
        >
          <option value="">Tamaño de ruedas</option>
          {wheelSizes.map((w) => (
            <option key={w} value={w}>
              {w}"
            </option>
          ))}
        </select>

        {/* Precio */}
        <div className="flex gap-2">
          <input
            type="number"
            placeholder="Precio min"
            value={priceMin}
            onChange={(e) => setPriceMin(Number(e.target.value) || '')}
            className="p-2 border rounded w-24"
          />
          <input
            type="number"
            placeholder="Precio max"
            value={priceMax}
            onChange={(e) => setPriceMax(Number(e.target.value) || '')}
            className="p-2 border rounded w-24"
          />
        </div>
      </section>

      {/* Listado */}
      {loading && <p>Cargando anuncios...</p>}
      {error && <p className="text-red-500">Error: {error}</p>}

      <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {listings.map((listing) => {
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
              {listing.frame_size && <p className="text-sm">Cuadro: {listing.frame_size} cm</p>}
              {listing.wheel_size && <p className="text-sm">Ruedas: {listing.wheel_size}"</p>}
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
