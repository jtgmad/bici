'use client'

import { useEffect, useState, useCallback } from 'react'
import { isBikeCategory } from '@/lib/constants'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import Image from 'next/image'
import Link from 'next/link'
import AutocompleteMulti from '@/app/components/AutocompleteMulti'
import { getFirstImagePublicUrl } from '@/lib/storage'

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
  frame_size?: string
  wheel_size?: string
  images: string[]
}

type Category = {
  id: number
  name: string
}

export default function Home() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const [listings, setListings] = useState<Listing[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filtros - inicializar desde URL
  const [filterCategoryId, setFilterCategoryId] = useState<number | null>(
    searchParams.get('categoria') ? Number(searchParams.get('categoria')) : null
  )
  const [filterType, setFilterType] = useState<string>(searchParams.get('tipo') || '')
  const [filterCondition, setFilterCondition] = useState<string>(searchParams.get('condicion') || '')
  const [filterBrands, setFilterBrands] = useState<string[]>(
    searchParams.get('marcas') ? searchParams.get('marcas')!.split(',') : []
  )
  const [filterModels, setFilterModels] = useState<string[]>(
    searchParams.get('modelos') ? searchParams.get('modelos')!.split(',') : []
  )
  const [filterFrameSize, setFilterFrameSize] = useState<string>(searchParams.get('talla') || '')
  const [filterWheelSize, setFilterWheelSize] = useState<string>(searchParams.get('rueda') || '')

  const conditions = ['nuevo', 'usado']
  const types = ['urbana', 'carretera', 'mtb', 'gravel', 'electrica']

  // Cargar categorías
  const fetchCategories = async () => {
    const { data, error } = await supabase.from('categories').select('*')
    if (!error && data) setCategories(data)
  }

  // Construir query optimizada con filtros en DB (incluye marcas y modelos)
  const buildQuery = useCallback(() => {
    let query = supabase.from('listings').select('*')

    if (filterCategoryId) query = query.eq('category_id', filterCategoryId)
    if (filterType) query = query.eq('bike_type', filterType)
    if (filterCondition) query = query.eq('condition', filterCondition)
    if (filterFrameSize) query = query.eq('frame_size', filterFrameSize)
    if (filterWheelSize) query = query.eq('wheel_size', filterWheelSize)

    // Filtros de marcas/modelos por NOMBRE (Autocomplete devuelve nombres)
    const orParts: string[] = []
    if (filterBrands.length > 0) {
      const quotedBrands = filterBrands.map(b => `"${b.replace(/"/g, '\\"')}"`).join(',')
      orParts.push(`brand.in.(${quotedBrands})`)
    }
    if (filterModels.length > 0) {
      const quotedModels = filterModels.map(m => `"${m.replace(/"/g, '\\"')}"`).join(',')
      orParts.push(`model.in.(${quotedModels})`)
    }
    if (orParts.length > 0) {
      query = query.or(orParts.join(','))
    }

    return query.order('created_at', { ascending: false }).limit(100)
  }, [
    filterCategoryId,
    filterType,
    filterCondition,
    filterFrameSize,
    filterWheelSize,
    filterBrands,
    filterModels,
  ])

  // Fetch con debounce para evitar consultas excesivas
  const fetchListings = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const { data, error } = await buildQuery()

      if (error) {
        setError(error.message)
        setListings([])
        return
      }

      setListings((data as Listing[]) || [])
    } catch (err: any) {
      console.error('Error in fetchListings:', err)
      setError(err.message)
      setListings([])
    } finally {
      setLoading(false)
    }
  }, [buildQuery])

  // Debounce
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchListings()
    }, 300)
    return () => clearTimeout(timeoutId)
  }, [fetchListings])

  // Sincronizar filtros con URL
  useEffect(() => {
    const params = new URLSearchParams()
    
    if (filterCategoryId) params.set('categoria', filterCategoryId.toString())
    if (filterType) params.set('tipo', filterType)
    if (filterCondition) params.set('condicion', filterCondition)
    if (filterBrands.length > 0) params.set('marcas', filterBrands.join(','))
    if (filterModels.length > 0) params.set('modelos', filterModels.join(','))
    if (filterFrameSize) params.set('talla', filterFrameSize)
    if (filterWheelSize) params.set('rueda', filterWheelSize)
    
    const newUrl = params.toString() 
      ? `${window.location.pathname}?${params.toString()}`
      : window.location.pathname
      
    window.history.replaceState({}, '', newUrl)
  }, [
    filterCategoryId,
    filterType,
    filterCondition,
    filterBrands,
    filterModels,
    filterFrameSize,
    filterWheelSize,
  ])

  // Resetear campos relacionados cuando cambia categoría (usando helper)
  useEffect(() => {
    if (!isBikeCategory(filterCategoryId)) {
      // bugfix: antes intentabas llamar a setFilterBikeType (no existe)
      setFilterType('')
      setFilterWheelSize('')
      setFilterFrameSize('')
    }
  }, [filterCategoryId])

  // Obtener tamaños disponibles de la DB
  const [frameSizes, setFrameSizes] = useState<string[]>([])
  const [wheelSizes, setWheelSizes] = useState<string[]>([])

  useEffect(() => {
    const fetchSizes = async () => {
      const { data, error } = await supabase
        .from('listings')
        .select('frame_size, wheel_size')
        .not('frame_size', 'is', null)
        .not('wheel_size', 'is', null)

      if (!error && data) {
        const frames = Array.from(new Set(data.map(l => l.frame_size).filter(Boolean))) as string[]
        const wheels = Array.from(new Set(data.map(l => l.wheel_size).filter(Boolean))) as string[]
        setFrameSizes(frames.sort())
        setWheelSizes(wheels.sort())
      }
    }
    fetchSizes()
  }, [])

  useEffect(() => {
    fetchCategories()
  }, [])

  // Función para limpiar todos los filtros
  const clearAllFilters = () => {
    setFilterCategoryId(null)
    setFilterType('')
    setFilterCondition('')
    setFilterBrands([])
    setFilterModels([])
    setFilterFrameSize('')
    setFilterWheelSize('')
  }

  // Verificar si hay filtros activos
  const hasActiveFilters =
    !!filterCategoryId ||
    !!filterType ||
    !!filterCondition || 
    filterBrands.length > 0 ||
    filterModels.length > 0 ||
    !!filterFrameSize ||
    !!filterWheelSize

  return (
    <main className="p-8 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Proyecto Bici</h1>
        <div className="flex gap-4">
          <Link href="/publish" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
            Publicar anuncio
          </Link>
          <Link href="/login" className="border border-gray-300 px-4 py-2 rounded hover:bg-gray-50">
            Iniciar sesión
          </Link>
        </div>
      </div>

      {/* Filtros */}
      <section className="mb-6 p-4 border rounded space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="font-semibold">Filtros</h2>
          {hasActiveFilters && (
            <button
              onClick={clearAllFilters}
              className="text-sm text-blue-600 hover:text-blue-800 underline"
            >
              Limpiar filtros
            </button>
          )}
        </div>

        {/* Categorías */}
        <div>
          <p className="mb-2 font-medium">Categoría:</p>
          <div className="flex gap-2 flex-wrap">
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setFilterCategoryId(cat.id)}
                className={`px-3 py-1 rounded-full border capitalize ${
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

        {/* Tipo - solo si bicicleta */}
        {isBikeCategory(filterCategoryId) && (
          <div>
            <p className="mb-2 font-medium">Tipo:</p>
            <select
              value={filterType}
              onChange={e => setFilterType(e.target.value)}
              className="p-2 border rounded w-full"
            >
              <option value="">Todos</option>
              {types.map(t => (
                <option key={t} value={t} className="capitalize">{t}</option>
              ))}
            </select>
          </div>
        )}

        {/* Marcas - usando solo nombres de marca */}
        <div>
          <p className="mb-2 font-medium">Marcas:</p>
          <AutocompleteMulti
            table="brands"
            selectedValues={filterBrands}
            onChange={(brands) => {
              setFilterBrands(brands)
              // Al cambiar marcas, limpiar modelos para evitar conflictos
              setFilterModels([])
            }}
          />
        </div>

        {/* Modelos - mostrar solo nombres de modelo */}
        <div>
          <p className="mb-2 font-medium">Modelos:</p>
          <AutocompleteMulti
            table="models"
            selectedValues={filterModels}
            onChange={setFilterModels}
            filters={filterBrands.length > 0 ? { brand_name: filterBrands } : {}}
          />
          {filterBrands.length > 0 && (
            <p className="text-xs text-gray-500 mt-1">
              Modelos filtrados por las marcas seleccionadas
            </p>
          )}
        </div>

        {/* Condición */}
        <div>
          <p className="mb-2 font-medium">Condición:</p>
          <div className="flex gap-2 flex-wrap">
            {conditions.map(c => (
              <button
                key={c}
                onClick={() => setFilterCondition(c)}
                className={`px-3 py-1 rounded-full border capitalize ${
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

        {/* Tamaño de cuadro - solo si bicicleta */}
        {isBikeCategory(filterCategoryId) && (
          <div>
            <p className="mb-2 font-medium">Tamaño de cuadro:</p>
            <select
              value={filterFrameSize}
              onChange={e => setFilterFrameSize(e.target.value)}
              className="p-2 border rounded w-full"
            >
              <option value="">Todos</option>
              {frameSizes.map(size => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
          </div>
        )}

        {/* Tamaño de rueda - solo si bicicleta */}
        {isBikeCategory(filterCategoryId) && (
          <div>
            <p className="mb-2 font-medium">Tamaño de rueda:</p>
            <select
              value={filterWheelSize}
              onChange={e => setFilterWheelSize(e.target.value)}
              className="p-2 border rounded w-full"
            >
              <option value="">Todos</option>
              {wheelSizes.map(size => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
          </div>
        )}
      </section>

      {/* Contador de resultados */}
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-gray-600">
          {loading ? 'Cargando...' : (
            `${listings.length} anuncio${listings.length !== 1 ? 's' : ''} encontrado${listings.length !== 1 ? 's' : ''}`
          )}
        </p>
        
        {hasActiveFilters && (
          <div className="flex flex-wrap gap-2">
            {filterCategoryId && (
              <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                Categoría: {categories.find(c => c.id === filterCategoryId)?.name}
              </span>
            )}
            {filterCondition && (
              <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full capitalize">
                {filterCondition}
              </span>
            )}
            {filterBrands.length > 0 && (
              <span className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded-full">
                {filterBrands.length} marca{filterBrands.length > 1 ? 's' : ''}: {filterBrands.join(', ')}
              </span>
            )}
            {filterModels.length > 0 && (
              <span className="bg-orange-100 text-orange-800 text-xs px-2 py-1 rounded-full">
                {filterModels.length} modelo{filterModels.length > 1 ? 's' : ''}: {filterModels.join(', ')}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Estados de carga y error */}
      {loading && !listings.length && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1,2,3,4].map(i => (
            <div key={i} className="border rounded-lg p-4 animate-pulse">
              <div className="h-48 bg-gray-200 rounded-md mb-4"></div>
              <div className="h-4 bg-gray-200 rounded mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-2/3"></div>
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <p className="text-red-800">Error: {error}</p>
          <button 
            onClick={fetchListings}
            className="mt-2 text-sm text-red-600 underline hover:text-red-800"
          >
            Reintentar
          </button>
        </div>
      )}

      {/* Listado */}
      <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {listings.map(listing => {
          const imageUrl = getFirstImagePublicUrl(listing.images?.[0])

          return (
            <Link 
              key={listing.id} 
              href={`/listings/${listing.id}`}
              className="block border rounded-lg p-4 shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer hover:border-blue-300"
            >
              {imageUrl ? (
                <div className="relative">
                  <Image
                    src={imageUrl}
                    alt={listing.title}
                    width={300}
                    height={200}
                    loading="lazy"
                    className="w-full h-48 object-cover rounded-md"
                  />
                  {/* Badge de condición */}
                  <span className={`absolute top-2 right-2 text-xs px-2 py-1 rounded-full ${
                    listing.condition === 'nuevo' 
                      ? 'bg-green-500 text-white' 
                      : 'bg-yellow-500 text-white'
                  }`}>
                    {listing.condition}
                  </span>
                </div>
              ) : (
                <div className="w-full h-48 bg-gray-200 flex items-center justify-center rounded-md">
                  <span className="text-gray-500">Sin imagen</span>
                </div>
              )}

              <div className="mt-3 space-y-1">
                <h3 className="font-semibold text-lg leading-tight">{listing.title}</h3>
                <p className="text-blue-600 font-bold text-xl">€{listing.price.toLocaleString()}</p>
                
                <div className="text-sm text-gray-600 space-y-1">
                  {listing.bike_type && <p>Tipo: <span className="capitalize">{listing.bike_type}</span></p>}
                  {listing.brand && <p>Marca: {listing.brand}</p>}
                  {listing.model && <p>Modelo: {listing.model}</p>}
                  {listing.frame_size && <p>Cuadro: {listing.frame_size}</p>}
                  {listing.wheel_size && <p>Rueda: {listing.wheel_size}</p>}
                </div>
                
                <div className="flex items-center gap-1 text-sm text-gray-500 mt-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span>{listing.location}</span>
                </div>
              </div>
            </Link>
          )
        })}
      </section>

      {!loading && listings.length === 0 && !error && (
        <div className="text-center py-12">
          <div className="text-gray-500 mb-4">
            <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <p className="text-lg font-medium">No se encontraron anuncios</p>
            <p className="text-sm">Prueba a ajustar los filtros o</p>
          </div>
          {hasActiveFilters && (
            <button
              onClick={clearAllFilters}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Ver todos los anuncios
            </button>
          )}
        </div>
      )}
    </main>
  )
}
