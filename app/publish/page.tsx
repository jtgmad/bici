'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useAuth } from '@/app/AuthProvider'

export default function Publish() {
  const { user, loading } = useAuth()

  const [title, setTitle] = useState('')
  const [categoryId, setCategoryId] = useState<number | null>(null)
  const [brandId, setBrandId] = useState<number | null>(null)
  const [modelId, setModelId] = useState<number | null>(null)
  const [typeValue, setTypeValue] = useState('')
  const [frameSize, setFrameSize] = useState('')
  const [wheelSize, setWheelSize] = useState('')
  const [condition, setCondition] = useState('usado')
  const [price, setPrice] = useState('')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('')
  const [components, setComponents] = useState<string[]>([])
  const [images, setImages] = useState<File[]>([])
  const [submitting, setSubmitting] = useState(false)

  const [categories, setCategories] = useState<{id: number, name: string}[]>([])
  const [brandOptions, setBrandOptions] = useState<{id: number, name: string}[]>([])
  const [modelOptions, setModelOptions] = useState<{id: number, name: string, brand_id: number}[]>([])

  const [brandInput, setBrandInput] = useState('')
  const [modelInput, setModelInput] = useState('')

  useEffect(() => {
    const fetchCategories = async () => {
      const { data } = await supabase.from('categories').select('*')
      if (data) setCategories(data)
    }
    fetchCategories()
  }, [])

  if (loading) return <p className="p-8">Cargando...</p>
  if (!user) return <p>Debes iniciar sesión</p>

  const selectedCategory = categories.find(c => c.id === categoryId)?.name

  const filteredModels = modelOptions.filter(m => m.brand_id === brandId)

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setImages(Array.from(e.target.files))
  }

  // Reset campos cuando cambie categoría o marca
  useEffect(() => {
    setBrandId(null)
    setBrandInput('')
    setModelId(null)
    setModelInput('')
    setTypeValue('')
    setFrameSize('')
    setWheelSize('')
    setComponents([])
  }, [categoryId])

  useEffect(() => {
    setModelId(null)
    setModelInput('')
  }, [brandId])

  // Autocomplete marcas
  useEffect(() => {
    const fetchBrands = async () => {
      if (!brandInput) { setBrandOptions([]); return }
      const { data } = await supabase
        .from('brands')
        .select('*')
        .ilike('name', `%${brandInput}%`)
        .limit(10)
      if (data) setBrandOptions(data)
    }
    fetchBrands()
  }, [brandInput])

  // Autocomplete modelos
  useEffect(() => {
    if (!brandId) return
    const fetchModels = async () => {
      if (!modelInput) { setModelOptions([]); return }
      const { data } = await supabase
        .from('models')
        .select('*')
        .eq('brand_id', brandId)
        .ilike('name', `%${modelInput}%`)
        .limit(10)
      if (data) setModelOptions(data)
    }
    fetchModels()
  }, [modelInput, brandId])

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
      if (brandId) newListing.brand_id = brandId
      if (modelId) newListing.model_id = modelId

      if (selectedCategory === 'Bicicleta') {
        if (typeValue) newListing.bike_type = typeValue
        if (frameSize) newListing.frame_size = frameSize
        if (wheelSize) newListing.wheel_size = wheelSize
      }

      if (['Bicicleta','Componente'].includes(selectedCategory) && components.length > 0) {
        newListing.components = components
      }

      const { error } = await supabase.from('listings').insert([newListing])
      if (error) throw error

      alert('Anuncio publicado con éxito!')
      // Reset
      setTitle(''); setCategoryId(null); setBrandId(null); setBrandInput('')
      setModelId(null); setModelInput(''); setTypeValue('')
      setFrameSize(''); setWheelSize(''); setCondition('usado')
      setPrice(''); setDescription(''); setLocation(''); setComponents([]); setImages([])

    } catch (err: any) {
      console.error('Error publicando:', err)
      alert('Error: ' + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Publicar anuncio</h1>
      <form onSubmit={handleSubmit} className="space-y-4">

        <div>
          <label>Categoría</label>
          <select value={categoryId || ''} onChange={e => setCategoryId(Number(e.target.value) || null)} required className="w-full p-2 border rounded">
            <option value="">Selecciona categoría</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        {/* Solo mostrar el resto si hay categoría */}
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
            <div>
              <label>Marca</label>
              <input
                type="text"
                value={brandInput}
                onChange={e => setBrandInput(e.target.value)}
                placeholder="Escribe para buscar"
                className="w-full p-2 border rounded"
              />
              {brandOptions.length > 0 && (
                <ul className="border rounded mt-1 max-h-40 overflow-y-auto">
                  {brandOptions.map(b => (
                    <li key={b.id} className="p-1 cursor-pointer hover:bg-gray-200" onClick={() => { setBrandId(b.id); setBrandInput(b.name); setBrandOptions([])}}>{b.name}</li>
                  ))}
                </ul>
              )}
            </div>

            {/* Modelo */}
            {brandId && (
              <div>
                <label>Modelo</label>
                <input
                  type="text"
                  value={modelInput}
                  onChange={e => setModelInput(e.target.value)}
                  placeholder="Escribe para buscar modelo"
                  className="w-full p-2 border rounded"
                />
                {filteredModels.length > 0 && (
                  <ul className="border rounded mt-1 max-h-40 overflow-y-auto">
                    {filteredModels.map(m => (
                      <li key={m.id} className="p-1 cursor-pointer hover:bg-gray-200" onClick={() => { setModelId(m.id); setModelInput(m.name); setModelOptions([])}}>{m.name}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}

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
                <div>
                  <label>Tamaño de cuadro</label>
                  <input type="text" value={frameSize} onChange={e => setFrameSize(e.target.value)} className="w-full p-2 border rounded" />
                </div>
                <div>
                  <label>Tamaño de rueda</label>
                  <input type="text" value={wheelSize} onChange={e => setWheelSize(e.target.value)} className="w-full p-2 border rounded" />
                </div>
              </>
            )}

            {/* Componentes */}
            {['Bicicleta','Componente'].includes(selectedCategory) && (
              <div>
                <label>Componentes (separados por coma)</label>
                <input type="text" value={components.join(', ')} onChange={e => setComponents(e.target.value.split(',').map(s => s.trim()))} className="w-full p-2 border rounded" />
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
