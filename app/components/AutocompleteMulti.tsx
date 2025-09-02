'use client'

import { useEffect, useState } from 'react'
import CreatableSelect from 'react-select/creatable'
import { supabase } from '@/lib/supabaseClient'

interface AutocompleteMultiProps {
  table?: 'brands' | 'models'
  view?: 'models_with_brands'
  onChange: (values: string[]) => void
  selectedValues?: string[]
  filters?: Record<string, any>
  single?: boolean
  allowOther?: boolean
  brandId?: number | null
}

interface Option {
  value: string
  label: string
  brand_id?: number | null
}

export default function AutocompleteMulti({
  table,
  view,
  onChange,
  selectedValues = [],
  filters = {},
  single = false,
  allowOther = false,
  brandId = null
}: AutocompleteMultiProps) {
  const [options, setOptions] = useState<Option[]>([])
  const [input, setInput] = useState('')
  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    if (!mounted || (!table && !view)) return

    const fetchData = async () => {
      setLoading(true)
      try {
        let fetchedOptions: Option[] = []

        if (table === 'brands') {
          // Para marcas, obtener directamente de la tabla brands
          let query = supabase.from('brands').select('name')

          if (input.trim()) {
            query = query.ilike('name', `%${input.trim()}%`)
          }

          query = query.limit(50)
          const { data, error } = await query

          if (error) {
            console.error('Error fetching brands:', error.message)
            setOptions(selectedValues.map(val => ({ value: val, label: val })))
            return
          }

          fetchedOptions = data?.map(d => ({
            value: d.name,
            label: d.name
          })) || []

        } else if (table === 'models') {
          // Para modelos, obtener solo nombres de modelo
          // Si hay filtros de marca, usar la vista models_with_brands
          if (filters.brand_name && Array.isArray(filters.brand_name) && filters.brand_name.length > 0) {
            let query = supabase.from('models_with_brands').select('model_name, brand_name')

            query = query.in('brand_name', filters.brand_name)

            if (input.trim()) {
              query = query.ilike('model_name', `%${input.trim()}%`)
            }

            query = query.limit(50)
            const { data, error } = await query

            if (error) {
              console.error('Error fetching filtered models:', error.message)
              setOptions(selectedValues.map(val => ({ value: val, label: val })))
              return
            }

            // Solo mostrar nombres de modelo, no "marca - modelo"
            const modelNames = Array.from(new Set(data?.map(d => d.model_name).filter(Boolean))) as string[]
            fetchedOptions = modelNames.map(name => ({
              value: name,
              label: name
            }))

          } else if (brandId) {
            // Si hay brandId específico, filtrar por ese brandId
            let query = supabase.from('models').select('name').eq('brand_id', brandId)

            if (input.trim()) {
              query = query.ilike('name', `%${input.trim()}%`)
            }

            query = query.limit(50)
            const { data, error } = await query

            if (error) {
              console.error('Error fetching models by brand:', error.message)
              setOptions(selectedValues.map(val => ({ value: val, label: val })))
              return
            }

            fetchedOptions = data?.map(d => ({
              value: d.name,
              label: d.name,
              brand_id: brandId
            })) || []

          } else {
            // Sin filtros de marca, obtener todos los modelos únicos
            let query = supabase.from('models').select('name, brand_id')

            if (input.trim()) {
              query = query.ilike('name', `%${input.trim()}%`)
            }

            query = query.limit(50)
            const { data, error } = await query

            if (error) {
              console.error('Error fetching all models:', error.message)
              setOptions(selectedValues.map(val => ({ value: val, label: val })))
              return
            }

            fetchedOptions = data?.map(d => ({
              value: d.name,
              label: d.name,
              brand_id: d.brand_id
            })) || []
          }

        } else if (view === 'models_with_brands') {
          // Solo usar esta vista para casos especiales donde necesitamos mostrar "marca - modelo"
          let query = supabase.from('models_with_brands').select('*')

          Object.entries(filters).forEach(([key, value]) => {
            if (Array.isArray(value) && value.length > 0) {
              query = query.in(key, value)
            } else if (value) {
              query = query.eq(key, value)
            }
          })

          if (input.trim()) {
            query = query.or(`model_name.ilike.%${input.trim()}%,brand_name.ilike.%${input.trim()}%`)
          }

          query = query.limit(50)
          const { data, error } = await query

          if (error) {
            console.error('Error fetching models_with_brands:', error.message)
            setOptions(selectedValues.map(val => ({ value: val, label: val })))
            return
          }

          fetchedOptions = data?.map(d => ({
            value: `${d.brand_name} - ${d.model_name}`,
            label: `${d.brand_name} - ${d.model_name}`,
            brand_id: d.brand_id
          })) || []
        }

        // Remover duplicados
        fetchedOptions = fetchedOptions.filter((option, index, self) => 
          index === self.findIndex(opt => opt.value === option.value)
        )

        // Ordenar alfabéticamente
        fetchedOptions.sort((a, b) => a.label.localeCompare(b.label))

        // Añadir opción "Otro" si está habilitada
        if (allowOther && !fetchedOptions.some(o => o.label.toLowerCase() === 'otro')) {
          fetchedOptions.unshift({ value: 'Otro', label: 'Otro', brand_id: null })
        }

        setOptions(fetchedOptions)
      } catch (err) {
        console.error('Unexpected error fetching options:', err)
        setOptions(selectedValues.map(val => ({ value: val, label: val })))
      } finally {
        setLoading(false)
      }
    }

    // Debounce la búsqueda
    const timeoutId = setTimeout(fetchData, 300)
    return () => clearTimeout(timeoutId)
  }, [input, table, view, mounted, JSON.stringify(filters), selectedValues, allowOther, brandId])

  if (!mounted) return null

  // Preparar el valor actual
  const currentValue = single
    ? options.find(opt => selectedValues.includes(opt.value)) || 
      (selectedValues[0] ? { value: selectedValues[0], label: selectedValues[0] } : null)
    : [
        ...options.filter(opt => selectedValues.includes(opt.value)),
        ...selectedValues
          .filter(val => !options.some(opt => opt.value === val))
          .map(val => ({ value: val, label: val }))
      ]

  const handleChange = (vals: any) => {
    if (single) {
      const val = (vals as Option | null)?.value
      onChange(val ? [val] : [])
    } else {
      onChange((vals as Option[]).map(v => v.value))
    }
  }

  const handleCreateOption = (val: string) => {
    const trimmedVal = val.trim()
    if (!trimmedVal) return

    if (single) {
      onChange([trimmedVal])
    } else {
      onChange([...selectedValues, trimmedVal])
    }
  }

  const getPlaceholder = () => {
    if (loading) return 'Cargando...'
    if (table === 'brands') return 'Busca o selecciona marca(s)...'
    if (table === 'models') return 'Busca o selecciona modelo(s)...'
    return 'Busca o selecciona...'
  }

  return (
    <div className="relative">
      <CreatableSelect
        isMulti={!single}
        options={options}
        value={currentValue}
        onInputChange={setInput}
        onChange={handleChange}
        onCreateOption={handleCreateOption}
        placeholder={getPlaceholder()}
        noOptionsMessage={({ inputValue }) => 
          inputValue ? `No se encontró "${inputValue}"` : 'Escribe para buscar'
        }
        formatCreateLabel={(inputValue) => `Crear "${inputValue}"`}
        isLoading={loading}
        isClearable
        className="react-select-container"
        classNamePrefix="react-select"
        styles={{
          control: (base, state) => ({
            ...base,
            minHeight: '40px',
            borderColor: state.isFocused ? '#3b82f6' : '#d1d5db',
            '&:hover': {
              borderColor: state.isFocused ? '#3b82f6' : '#9ca3af'
            }
          }),
          multiValue: (base) => ({
            ...base,
            backgroundColor: '#eff6ff',
            borderRadius: '6px'
          }),
          multiValueLabel: (base) => ({
            ...base,
            color: '#1e40af',
            fontSize: '14px'
          }),
          multiValueRemove: (base) => ({
            ...base,
            color: '#6b7280',
            '&:hover': {
              backgroundColor: '#fee2e2',
              color: '#dc2626'
            }
          })
        }}
        components={{
          DropdownIndicator: (props) => (
            <div {...props.innerProps} className="px-2">
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          ),
          ClearIndicator: (props) => (
            <div {...props.innerProps} className="px-2 cursor-pointer">
              <svg className="w-4 h-4 text-gray-400 hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
          )
        }}
      />
      
      {/* Mensaje de ayuda */}
      {selectedValues.length === 0 && !loading && (
        <p className="text-xs text-gray-500 mt-1">
          {table === 'models' && filters.brand_name && Array.isArray(filters.brand_name) && filters.brand_name.length > 0
            ? `Modelos de las marcas: ${filters.brand_name.join(', ')}`
            : 'Puedes seleccionar múltiples opciones o crear una nueva'
          }
        </p>
      )}
    </div>
  )
}