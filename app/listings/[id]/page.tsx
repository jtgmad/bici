'use client'

import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
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
  category_id: number | null
  frame_size?: string
  wheel_size?: string
  components?: string[]
  images: string[]
  description?: string
  created_at: string
  user_id: string
}

type Category = {
  id: number
  name: string
}

export default function ListingDetail({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const [listing, setListing] = useState<Listing | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const router = useRouter()

  const fetchCategories = async () => {
    const { data } = await supabase.from('categories').select('*')
    if (data) setCategories(data)
  }

  const fetchListing = async () => {
    try {
      const { data, error } = await supabase
        .from('listings')
        .select('*')
        .eq('id', resolvedParams.id)
        .single()

      if (error) {
        setError(error.message)
        return
      }

      setListing(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCategories()
    fetchListing()
  }, [resolvedParams.id])

  if (loading) {
    return (
      <main className="p-8 max-w-4xl mx-auto">
        <div className="animate-pulse">
          <div className="h-64 bg-gray-300 rounded-lg mb-6"></div>
          <div className="h-8 bg-gray-300 rounded mb-4"></div>
          <div className="h-4 bg-gray-300 rounded mb-2"></div>
          <div className="h-4 bg-gray-300 rounded mb-2"></div>
        </div>
      </main>
    )
  }

  if (error || !listing) {
    return (
      <main className="p-8 max-w-4xl mx-auto">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Anuncio no encontrado</h1>
          <p className="text-gray-600 mb-4">
            {error || 'El anuncio que buscas no existe o ha sido eliminado.'}
          </p>
          <button
            onClick={() => router.push('/')}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Volver al inicio
          </button>
        </div>
      </main>
    )
  }

  const category = categories.find(c => c.id === listing.category_id)
  const images = listing.images || []
  const hasImages = images.length > 0

  const nextImage = () => {
    if (hasImages) {
      setCurrentImageIndex((prev) => (prev + 1) % images.length)
    }
  }

  const prevImage = () => {
    if (hasImages) {
      setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  return (
    <main className="p-4 md:p-8 max-w-6xl mx-auto">
      {/* Botón de volver */}
      <button
        onClick={() => router.back()}
        className="mb-6 flex items-center gap-2 text-blue-600 hover:text-blue-800 transition-colors"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Volver
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Galería de imágenes */}
        <div className="space-y-4">
          {hasImages ? (
            <>
              {/* Imagen principal */}
              <div className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden">
                <Image
                  src={supabase.storage.from('bike-images').getPublicUrl(images[currentImageIndex]).data.publicUrl}
                  alt={listing.title}
                  fill
                  className="object-cover"
                />
                
                {/* Controles de navegación */}
                {images.length > 1 && (
                  <>
                    <button
                      onClick={prevImage}
                      className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <button
                      onClick={nextImage}
                      className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                    
                    {/* Indicador de imagen actual */}
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
                      {currentImageIndex + 1} / {images.length}
                    </div>
                  </>
                )}
              </div>

              {/* Thumbnails */}
              {images.length > 1 && (
                <div className="flex gap-2 overflow-x-auto">
                  {images.map((image, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentImageIndex(index)}
                      className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-colors ${
                        currentImageIndex === index ? 'border-blue-500' : 'border-gray-300'
                      }`}
                    >
                      <Image
                        src={supabase.storage.from('bike-images').getPublicUrl(image).data.publicUrl}
                        alt={`${listing.title} - imagen ${index + 1}`}
                        width={80}
                        height={80}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="aspect-square bg-gray-200 rounded-lg flex items-center justify-center">
              <div className="text-center text-gray-500">
                <svg className="w-16 h-16 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p>Sin imágenes</p>
              </div>
            </div>
          )}
        </div>

        {/* Información del anuncio */}
        <div className="space-y-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              {category && (
                <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                  {category.name}
                </span>
              )}
              <span className={`text-xs px-2 py-1 rounded-full ${
                listing.condition === 'nuevo' 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-yellow-100 text-yellow-800'
              }`}>
                {listing.condition}
              </span>
            </div>
            
            <h1 className="text-3xl font-bold mb-2">{listing.title}</h1>
            <p className="text-4xl font-bold text-blue-600 mb-4">€{listing.price}</p>
            
            <div className="flex items-center gap-2 text-gray-600">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>{listing.location}</span>
            </div>
          </div>

          {/* Especificaciones */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-semibold mb-3">Especificaciones</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {listing.bike_type && (
                <div>
                  <span className="text-gray-600">Tipo:</span>
                  <span className="ml-2 font-medium">{listing.bike_type}</span>
                </div>
              )}
              {listing.brand && (
                <div>
                  <span className="text-gray-600">Marca:</span>
                  <span className="ml-2 font-medium">{listing.brand}</span>
                </div>
              )}
              {listing.model && (
                <div>
                  <span className="text-gray-600">Modelo:</span>
                  <span className="ml-2 font-medium">{listing.model}</span>
                </div>
              )}
              {listing.frame_size && (
                <div>
                  <span className="text-gray-600">Talla:</span>
                  <span className="ml-2 font-medium">{listing.frame_size}</span>
                </div>
              )}
              {listing.wheel_size && (
                <div>
                  <span className="text-gray-600">Ruedas:</span>
                  <span className="ml-2 font-medium">{listing.wheel_size}</span>
                </div>
              )}
            </div>
          </div>

          {/* Componentes */}
          {listing.components && listing.components.length > 0 && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold mb-3">Componentes</h3>
              <div className="flex flex-wrap gap-2">
                {listing.components.map((component, index) => (
                  <span
                    key={index}
                    className="bg-white border border-gray-300 rounded-full px-3 py-1 text-sm"
                  >
                    {component}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Descripción */}
          {listing.description && (
            <div>
              <h3 className="font-semibold mb-3">Descripción</h3>
              <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                {listing.description}
              </p>
            </div>
          )}

          {/* Información adicional */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-sm text-gray-600">
              <p>Publicado el {formatDate(listing.created_at)}</p>
              <p>ID del anuncio: {listing.id.slice(-8)}</p>
            </div>
          </div>

          {/* Botón de contacto */}
          <div className="space-y-3">
            <button className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 transition-colors">
              Contactar vendedor
            </button>
            <button className="w-full border border-gray-300 py-3 px-6 rounded-lg font-semibold hover:bg-gray-50 transition-colors">
              Guardar en favoritos
            </button>
          </div>
        </div>
      </div>
    </main>
  )
}