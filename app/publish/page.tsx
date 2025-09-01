'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useAuth } from '@/app/AuthProvider'
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
  const [condition, setCondition] = useState('usado')
  const [price, setPrice] = useState('')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('')
  const [components, setComponents] = useState<string[]>([])
  const [images, setImages] = useState<File[]>([])
  const [submitting, setSubmitting] = useState(false)

  const [categories, setCategories] = useState<{id: number, name: string}[]>([])

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

  const selectedCategory = categories.find(c => c.id === categoryId)?.name

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setImages(Array.from(e.target.files))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const uploadPromises = images.map(async (file) => {
        const { data, error } = await supabase.storage
          .from('bike-images')
          .upload(`bici-${Date.now()}-${file.name}`, file)
        if (error) throw error
        return data.path
      })
      const imageUrls = await Promise.all(uploadPromises)

      const newListing: any = {
        user_id: user.id,
        title,
        condition,
        price: parseInt(price),
        location,
        images: imageUrls,
      }

      if (description) newListing.description = description
      if (categoryId) newListing.category_id = categoryId

      // Guardar SIEMPRE texto libre aunque no haya ID
      if (brandName) newListing.brand = brandName
      if (brandId) newListing.brand_id = brandId

      if (modelName) newListing.model = modelName
      if (modelId) newListing.model_id = modelId

      if (selectedCategory === 'Bicicleta') {
        if (typeValue) newListing.bike_type = typeValue
        if (frameSize === 'otro' && frameSizeCustom) newListing.frame_size = frameSizeCustom
        else if (frameSize) newListing.frame_size = frameSize
        if (wheelSize === 'otro' && wheelSizeCustom) newListing.wheel_size = wheelSizeCustom
        else if (wheelSize) newListing.wheel_size = wheelSize
      }

      if (['Bicicleta','Componente'].includes(selectedCategory!) && components.length > 0) {
        newListing.components = components
      }

      const { error } = await supabase.from('listings').insert([newListing])
      if (error) throw error

      alert('Anuncio publicado con éxito!')
      setTitle(''); setCategoryId(null); setBrandId(null); setBrandName('')
      setModelId(null); setModelName(''); setTypeValue('')
      setFrameSize(''); setFrameSizeCustom(''); setWheelSize(''); setWheelSizeCustom('')
      setCondition('usado')
      setPrice(''); setDescription(''); setLocation(''); setComponents([]); setImages([])

    } catch (err: any) {
      console.error('Error publicando:', err)
      alert('Error: ' + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const frameOptions = ['48','50','52','54','56','58','60','62']

  return (
    <main className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Publicar anuncio</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Categoría */}
        <div>
          <label>Categoría</label>
          <select value={categoryId || ''} onChange={e => setCategoryId(Number(e.target.value) || null)} required className="w-full p-2 border rounded">
            <option value="">Selecciona categoría</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        {selectedCategory && (
          <>
            {/* Condición */}
            <div>
              <label>Estado</label>
              <div className="flex gap-4 mt-1">
                <label className="flex items-center gap-1">
                  <input type="radio" value="nuevo" checked={condition==='nuevo'} onChange={() => setCondition('nuevo')} />
                  Nuevo
                </label>
                <label className="flex items-center gap-1">
                  <input type="radio" value="usado" checked={condition==='usado'} onChange={() => setCondition('usado')} />
                  Usado
                </label>
              </div>
            </div>

            {/* Marca */}
            <AutocompleteMulti
              table="brands"
              selectedValues={brandName ? [brandName] : []}
              onChange={async (values) => {
                const selectedBrand = values[0] || ''
                setBrandName(selectedBrand)

                if (!selectedBrand || selectedBrand.toLowerCase() === 'otro') {
                  setBrandId(null)          // marca libre
                  setModelName('')          // dejamos el modelo vacío
                  setModelId(null)
                  return
                }

                // Intentar obtener id real de la marca seleccionada
                const { data, error } = await supabase
                  .from('brands')
                  .select('id')
                  .eq('name', selectedBrand)
                  .limit(1)

                if (!error && data && data[0]) {
                  setBrandId(data[0].id)
                } else {
                  setBrandId(null) // no existe -> libre
                }

                // Al cambiar marca, reseteamos modelo
                setModelName('')
                setModelId(null)
              }}
              single
              allowOther
            />

            {/* Modelo */}
            <AutocompleteMulti
              table="models"
              selectedValues={modelName ? [modelName] : []}
              brandId={brandId} // ⬅️ filtra por marca; si null, solo “Otro” y libre
              onChange={async (values) => {
                const selectedModel = values[0] || ''
                setModelName(selectedModel)

                if (!selectedModel || selectedModel.toLowerCase() === 'otro') {
                  setModelId(null) // modelo libre
                  return
                }

                // Solo intentamos buscar ID si hay brandId real
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
                  setBrandId(data[0].brand_id) // coherencia
                } else {
                  setModelId(null) // texto libre
                }
              }}
              single
              allowOther
            />

            {/* Bicicleta */}
            {selectedCategory === 'Bicicleta' && (
              <>
                <div>
                  <label>Tipo de bicicleta</label>
                  <select value={typeValue} onChange={e => setTypeValue(e.target.value)} className="w-full p-2 border rounded">
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
                  <label>Tamaño de cuadro</label>
                  <select value={frameSize} onChange={e => setFrameSize(e.target.value)} className="w-full p-2 border rounded">
                    <option value="">Selecciona tamaño</option>
                    {frameOptions.map(f => <option key={f} value={f}>{f} cm</option>)}
                    <option value="otro">Otro</option>
                  </select>
                  {frameSize === 'otro' && (
                    <input
                      type="text"
                      placeholder="Especifica el tamaño en cm"
                      value={frameSizeCustom}
                      onChange={e => setFrameSizeCustom(e.target.value)}
                      className="w-full p-2 border rounded mt-2"
                    />
                  )}
                </div>

                {/* Wheel size */}
                <div>
                  <label>Tamaño de rueda</label>
                  <select
                    value={wheelSize}
                    onChange={(e) => setWheelSize(e.target.value)}
                    className="w-full p-2 border rounded"
                  >
                    <option value="">Selecciona tamaño</option>
                    <option value="26">26" (≈660 mm)</option>
                    <option value="27.5">27.5" (≈700 mm)</option>
                    <option value="29">29" (≈740 mm)</option>
                    <option value="otro">Otro</option>
                  </select>
                  {wheelSize === 'otro' && (
                    <input
                      type="text"
                      placeholder="Especifica el tamaño en mm"
                      value={wheelSizeCustom}
                      onChange={(e) => setWheelSizeCustom(e.target.value)}
                      className="w-full p-2 border rounded mt-2"
                    />
                  )}
                </div>
              </>
            )}

            {/* Componentes */}
            {['Bicicleta','Componente'].includes(selectedCategory || '') && (
              <div>
                <label>Componentes (separados por coma)</label>
                <input
                  type="text"
                  value={components.join(', ')}
                  onChange={e => setComponents(e.target.value.split(',').map(s => s.trim()))}
                  className="w-full p-2 border rounded"
                />
              </div>
            )}

            {/* Campos básicos */}
            <div>
              <label>Título</label>
              <input type="text" value={title} onChange={e => setTitle(e.target.value)} required className="w-full p-2 border rounded" />
            </div>
            <div>
              <label>Precio (€)</label>
              <input type="number" value={price} onChange={e => setPrice(e.target.value)} required className="w-full p-2 border rounded" />
            </div>
            <div>
              <label>Descripción</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)} required className="w-full p-2 border rounded" />
            </div>
            <div>
              <label>Ciudad</label>
              <input type="text" value={location} onChange={e => setLocation(e.target.value)} required className="w-full p-2 border rounded" />
            </div>

            {/* Fotos */}
            <div>
              <label>Fotos</label>
              <input type="file" multiple accept="image/*" onChange={handleImageChange} className="w-full p-2 border rounded" />
              {images.length > 0 && <p>{images.length} foto(s) seleccionada(s)</p>}
            </div>

            <button type="submit" disabled={submitting} className="bg-blue-500 text-white px-4 py-2 rounded">
              {submitting ? 'Publicando...' : 'Publicar'}
            </button>
          </>
        )}
      </form>
    </main>
  )
}
