'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useAuth } from '@/app/AuthProvider'

export default function Publish() {
  const { user, loading } = useAuth()
  const [title, setTitle] = useState('')
  const [bikeType, setBikeType] = useState('urbana')
  const [condition, setCondition] = useState('usado')
  const [price, setPrice] = useState('')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('')
  const [images, setImages] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (images.length > 0) {
      const previews = images.map(file => URL.createObjectURL(file))
      setImagePreviews(previews)
      return () => previews.forEach(url => URL.revokeObjectURL(url))
    } else {
      setImagePreviews([])
    }
  }, [images])

  if (loading) return <p className="p-8">Cargando...</p>
  if (!user) return <p>Debes iniciar sesión</p>

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setImages(Array.from(e.target.files))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (images.length < 3) {
      alert('Debes seleccionar al menos 3 fotos')
      return
    }

    setSubmitting(true)

    try {
      // 1️⃣ Subir imágenes
      const uploadPromises = images.map(async (file) => {
        const filePath = `bici-${Date.now()}-${file.name}`
        const { data, error } = await supabase.storage
          .from('bike-images')
          .upload(filePath, file)

        if (error) throw error
        return supabase.storage.from('bike-images').getPublicUrl(data.path).data.publicUrl
      })

      const imageUrls = await Promise.all(uploadPromises)

      // 2️⃣ Insertar anuncio
      const { error } = await supabase.from('listings').insert([
        {
          user_id: user.id,
          title,
          bike_type: bikeType,
          condition,
          price: parseInt(price),
          description,
          location,
          images: imageUrls,
        },
      ])

      if (error) throw error

      alert('Anuncio publicado con éxito!')

      // 3️⃣ Limpiar formulario
      setTitle('')
      setBikeType('urbana')
      setCondition('usado')
      setPrice('')
      setDescription('')
      setLocation('')
      setImages([])
      setImagePreviews([])
    } catch (err: any) {
      console.error('Error publicando:', err)
      alert('Error: ' + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Publicar bicicleta</h1>
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label>Título</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="w-full p-2 border rounded"
          />
        </div>

        <div className="mb-4">
          <label>Tipo de bici</label>
          <select
            value={bikeType}
            onChange={(e) => setBikeType(e.target.value)}
            className="w-full p-2 border rounded"
          >
            <option value="urbana">Urbana</option>
            <option value="carretera">Carretera</option>
            <option value="mtb">MTB</option>
            <option value="gravel">Gravel</option>
            <option value="electrica">Eléctrica</option>
          </select>
        </div>

        <div className="mb-4">
          <label>Estado</label>
          <select
            value={condition}
            onChange={(e) => setCondition(e.target.value)}
            className="w-full p-2 border rounded"
          >
            <option value="nuevo">Nuevo</option>
            <option value="usado">Usado</option>
          </select>
        </div>

        <div className="mb-4">
          <label>Precio (€)</label>
          <input
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            required
            className="w-full p-2 border rounded"
          />
        </div>

        <div className="mb-4">
          <label>Descripción</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            className="w-full p-2 border rounded"
          />
        </div>

        <div className="mb-4">
          <label>Ciudad</label>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            required
            className="w-full p-2 border rounded"
          />
        </div>

        <div className="mb-4">
          <label>Fotos (mínimo 3)</label>
          <input
            type="file"
            multiple
            accept="image/*"
            onChange={handleImageChange}
            required
            className="w-full p-2 border rounded"
          />
          {imagePreviews.length > 0 && (
            <div className="flex gap-2 mt-2">
              {imagePreviews.map((src, i) => (
                <img key={i} src={src} alt={`preview-${i}`} className="w-20 h-20 object-cover rounded" />
              ))}
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="bg-blue-500 text-white px-4 py-2 rounded"
        >
          {submitting ? 'Publicando...' : 'Publicar'}
        </button>
      </form>
    </main>
  )
}
