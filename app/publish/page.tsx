'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useAuth } from '@/app/AuthProvider'
import { isBikeCategory } from '@/lib/constants'
import { sanitizeInput, sanitizeNumber } from '@/app/utils/sanitize'
import AutocompleteMulti from '@/app/components/AutocompleteMulti'

export default function Publish() {
  const { user, loading } = useAuth()

  // --- STATES ---
  const [title, setTitle] = useState('')
  const [categoryId, setCategoryId] = useState<number | null>(null)

  const [brandId, setBrandId] = useState<number | null>(null)
  const [modelId, setModelId] = useState<number | null>(null)
  const [brandName, setBrandName] = useState('')
  const [modelName, setModelName] = useState('')

  const [typeValue, setTypeValue] = useState('')
  const [frameSize, setFrameSize] = useState('')
  const [frameSizeCustom, setFrameSizeCustom] = useState('')
  const [wheelSize, setWheelSize] = useState('')
  const [wheelSizeCustom, setWheelSizeCustom] = useState('')

  const [condition, setCondition] = useState<'nuevo' | 'usado'>('usado')
  const [price, setPrice] = useState('')

  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('')
  const [components, setComponents] = useState<string[]>([])

  const [images, setImages] = useState<File[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [categories, setCategories] = useState<{ id: number; name: string }[]>([])

  // --- FETCH CATEGORIES ---
  useEffect(() => {
    const fetchCategories = async () => {
      const { data } = await supabase.from('categories').select('*')
      if (data) setCategories(data)
    }
    fetchCategories()
  }, [])

  // --- RESET CAMPOS CUANDO CAMBIA CATEGORIA ---
  useEffect(() => {
    setBrandId(null)
    setBrandName('')
    setModelId(null)
    setModelName('')

    setTypeValue('')
    setFrameSize('')
    setFrameSizeCustom('')
    setWheelSize('')
    setWheelSizeCustom('')

    setComponents([])
  }, [categoryId])

  // --- RESET MODELO CUANDO CAMBIA MARCA ---
  useEffect(() => {
    setModelId(null)
    setModelName('')
  }, [brandId])

  if (loading) return <p className="p-8">Cargando...</p>
  if (!user) return <p>Debes iniciar sesión</p>

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setImages(Array.from(e.target.files))
  }

  const frameOptions = ['48', '50', '52', '54', '56', '58', '60', '62']

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      // Validaciones básicas
      if (!title.trim()) throw new Error('El título es requerido')
      if (!categoryId) throw new Error('Debes seleccionar una categoría')
      if (!location.trim()) throw new Error('La ubicación es requerida')

      const priceNumber = sanitizeNumber(price, 1, 50000)
      if (priceNumber == null || Number.isNaN(priceNumber) || priceNumber <= 0) {
        throw new Error('El precio debe ser un número válido mayor a 0')
      }

      // --- Subir imágenes ---
      let imagePaths: string[] = []
      if (images.length > 0) {
        const uploadPromises = images.map(async (file) => {
          const fileExtension = file.name.split('.').pop()
          const fileName = `bici-${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExtension}`
          const { data, error } = await supabase.storage
            .from('bike-images')
            .upload(fileName, file, { cacheControl: '3600', upsert: false })
          if (error) throw new Error(`Error subiendo imagen: ${error.message}`)
          return data.path
        })
        imagePaths = await Promise.all(uploadPromises)
      }

      // --- Construcción del objeto listing (versión única/limpia) ---
      const newListing: any = {
        user_id: user.id,
        title: sanitizeInput(title, 120),
        condition, // 'nuevo' | 'usado'
        price: priceNumber,
        location: sanitizeInput(location, 80),
        images: imagePaths, // en DB tienes default '[]' también
        category_id: categoryId,
        created_at: new Date().toISOString(),
      }

      // descripción (opcional)
      if (description.trim()) newListing.description = sanitizeInput(description, 1000)

      // Marca: guarda id y/o nombre si existen
      if (brandId) {
        newListing.brand_id = brandId
        if (brandName.trim()) newListing.brand = sanitizeInput(brandName, 80)
      } else if (brandName.trim()) {
        newListing.brand = sanitizeInput(brandName, 80)
      }

      // Modelo: idem
      if (modelId) {
        newListing.model_id = modelId
        if (modelName.trim()) newListing.model = sanitizeInput(modelName, 80)
      } else if (modelName.trim()) {
        newListing.model = sanitizeInput(modelName, 80)
      }

      // Campos específicos de bicicleta (por ID, no por nombre)
      if (isBikeCategory(categoryId)) {
        if (typeValue) newListing.bike_type = sanitizeInput(typeValue, 40)

        if (frameSize === 'otro' && frameSizeCustom.trim()) {
          newListing.frame_size = sanitizeInput(frameSizeCustom, 20)
        } else if (frameSize && frameSize !== 'otro') {
          newListing.frame_size = sanitizeInput(frameSize, 20)
        }

        if (wheelSize === 'otro' && wheelSizeCustom.trim()) {
          newListing.wheel_size = sanitizeInput(wheelSizeCustom, 20)
        } else if (wheelSize && wheelSize !== 'otro') {
          newListing.wheel_size = sanitizeInput(wheelSize, 20)
        }
      }

      // Componentes: solo para Bicicleta o Componente (si necesitas validar por ID, ajusta)
      const selectedCategoryName = categories.find((c) => c.id === categoryId)?.name
      if (['Bicicleta', 'Componente'].includes(selectedCategoryName ?? '') && components.length > 0) {
        const validComponents = components
          .map((c) => c.trim())
          .filter(Boolean)
          .map((c) => sanitizeInput(c, 50))
        if (validComponents.length) newListing.components = validComponents
      }

      // --- Insert en DB ---
      const { data, error: insertError } = await supabase.from('listings').insert([newListing]).select().single()

      if (insertError) throw new Error(`Error guardando en base de datos: ${insertError.message}`)

      // Éxito
      alert('Anuncio publicado con éxito!')

      // Resetear formulario
      setTitle('')
      setCategoryId(null)
      setBrandId(null)
      setBrandName('')
      setModelId(null)
      setModelName('')
      setTypeValue('')
      setFrameSize('')
      setFrameSizeCustom('')
      setWheelSize('')
      setWheelSizeCustom('')
      setCondition('usado')
      setPrice('')
      setDescription('')
      setLocation('')
      setComponents([])
      setImages([])
    } catch (err: any) {
      console.error('Error publicando:', err)
      const errorMessage = err?.message || 'Error desconocido al publicar'
      setError(errorMessage)
      alert('Error: ' + errorMessage)
    } finally {
      setSubmitting(false)
    }
  }

  const selectedCategory = categories.find((c) => c.id === categoryId)?.name

  return (
    <main className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Publicar anuncio</h1>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Categoría */}
        <div>
          <label className="block text-sm font-medium mb-1">Categoría *</label>
          <select
            value={categoryId || ''}
            onChange={(e) => setCategoryId(Number(e.target.value) || null)}
            required
            className="w-full p-2 border rounded"
          >
            <option value="">Selecciona categoría</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {selectedCategory && (
          <>
            {/* Condición */}
            <div>
              <label className="block text-sm font-medium mb-1">Estado *</label>
              <div className="flex gap-4 mt-1">
                <label className="flex items-center gap-1">
                  <input
                    type="radio"
                    value="nuevo"
                    checked={condition === 'nuevo'}
                    onChange={() => setCondition('nuevo')}
                  />
                  Nuevo
                </label>
                <label className="flex items-center gap-1">
                  <input
                    type="radio"
                    value="usado"
                    checked={condition === 'usado'}
                    onChange={() => setCondition('usado')}
                  />
                  Usado
                </label>
              </div>
            </div>

            {/* Marca */}
            <div>
              <label className="block text-sm font-medium mb-1">Marca</label>
              <AutocompleteMulti
                table="brands"
                selectedValues={brandName ? [brandName] : []}
                onChange={async (values) => {
                  const selectedBrand = values[0] || ''
                  setBrandName(selectedBrand)

                  if (!selectedBrand || selectedBrand.toLowerCase() === 'otro') {
                    setBrandId(null)
                    setModelName('')
                    setModelId(null)
                    return
                  }

                  // Obtener id real de la marca seleccionada
                  const { data, error } = await supabase
                    .from('brands')
                    .select('id')
                    .eq('name', selectedBrand)
                    .limit(1)

                  if (!error && data && data[0]) {
                    setBrandId(data[0].id)
                  } else {
                    setBrandId(null)
                  }

                  // Reset modelo si cambia marca
                  setModelName('')
                  setModelId(null)
                }}
                single
                allowOther
              />
            </div>

            {/* Modelo */}
            <div>
              <label className="block text-sm font-medium mb-1">Modelo</label>
              <AutocompleteMulti
                table="models"
                selectedValues={modelName ? [modelName] : []}
                brandId={brandId}
                onChange={async (values) => {
                  const selectedModel = values[0] || ''
                  setModelName(selectedModel)

                  if (!selectedModel || selectedModel.toLowerCase() === 'otro') {
                    setModelId(null)
                    return
                  }
                  if (!brandId) {
                    setModelId(null)
                    return
                  }

                  const { data, error } = await supabase
                    .from('models')
                    .select('id, brand_id')
                    .eq('name', selectedModel)
                    .eq('brand_id', brandId)
                    .limit(1)

                  if (!error && data && data[0]) {
                    setModelId(data[0].id)
                    setBrandId(data[0].brand_id)
                  } else {
                    setModelId(null)
                  }
                }}
                single
                allowOther
              />
            </div>

            {/* Campos específicos de Bicicleta */}
            {isBikeCategory(categoryId) && (
              <>
                <div>
                  <label className="block text-sm font-medium mb-1">Tipo de bicicleta</label>
                  <select
                    value={typeValue}
                    onChange={(e) => setTypeValue(e.target.value)}
                    className="w-full p-2 border rounded"
                  >
                    <option value="">Selecciona tipo</option>
                    <option value="urbana">Urbana</option>
                    <option value="carretera">Carretera</option>
                    <option value="mtb">MTB</option>
                    <option value="gravel">Gravel</option>
                    <option value="electrica">Eléctrica</option>
                  </select>
                </div>

                {/* Frame size */}
                <div>
                  <label className="block text-sm font-medium mb-1">Tamaño de cuadro</label>
                  <select
                    value={frameSize}
                    onChange={(e) => setFrameSize(e.target.value)}
                    className="w-full p-2 border rounded"
                  >
                    <option value="">Selecciona tamaño</option>
                    {frameOptions.map((f) => (
                      <option key={f} value={f}>
                        {f} cm
                      </option>
                    ))}
                    <option value="otro">Otro</option>
                  </select>
                  {frameSize === 'otro' && (
                    <input
                      type="text"
                      placeholder="Especifica el tamaño"
                      value={frameSizeCustom}
                      onChange={(e) => setFrameSizeCustom(e.target.value)}
                      className="w-full p-2 border rounded mt-2"
                    />
                  )}
                </div>

                {/* Wheel size */}
                <div>
                  <label className="block text-sm font-medium mb-1">Tamaño de rueda</label>
                  <select
                    value={wheelSize}
                    onChange={(e) => setWheelSize(e.target.value)}
                    className="w-full p-2 border rounded"
                  >
                    <option value="">Selecciona tamaño</option>
                    <option value="26">26"</option>
                    <option value="27.5">27.5"</option>
                    <option value="29">29"</option>
                    <option value="otro">Otro</option>
                  </select>
                  {wheelSize === 'otro' && (
                    <input
                      type="text"
                      placeholder="Especifica el tamaño"
                      value={wheelSizeCustom}
                      onChange={(e) => setWheelSizeCustom(e.target.value)}
                      className="w-full p-2 border rounded mt-2"
                    />
                  )}
                </div>
              </>
            )}

            {/* Componentes */}
            {['Bicicleta', 'Componente'].includes(selectedCategory || '') && (
              <div>
                <label className="block text-sm font-medium mb-1">Componentes (separados por coma)</label>
                <input
                  type="text"
                  value={components.join(', ')}
                  onChange={(e) => setComponents(e.target.value.split(',').map((s) => s.trim()))}
                  className="w-full p-2 border rounded"
                  placeholder="Ej: Shimano 105, Ruedas DT Swiss"
                />
              </div>
            )}

            {/* Campos básicos */}
            <div>
              <label className="block text-sm font-medium mb-1">Título *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="w-full p-2 border rounded"
                placeholder="Ej: Bicicleta de carretera Trek Madone"
                maxLength={120}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Precio (€) *</label>
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
                min="1"
                max="50000"
                className="w-full p-2 border rounded"
                placeholder="0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Descripción</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full p-2 border rounded h-32"
                placeholder="Describe las características, estado y detalles importantes..."
                maxLength={1000}
              />
              <p className="text-xs text-gray-500 mt-1">{description.length}/1000 caracteres</p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Ciudad *</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                required
                className="w-full p-2 border rounded"
                placeholder="Ej: Madrid, Barcelona"
                maxLength={80}
              />
            </div>

            {/* Fotos */}
            <div>
              <label className="block text-sm font-medium mb-1">Fotos</label>
              <input type="file" multiple accept="image/*" onChange={handleImageChange} className="w-full p-2 border rounded" />
              {images.length > 0 && <p className="text-sm text-gray-600 mt-1">{images.length} foto(s) seleccionada(s)</p>}
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {submitting ? 'Publicando...' : 'Publicar'}
            </button>
          </>
        )}
      </form>
    </main>
  )
}
