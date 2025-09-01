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
  brandId?: number | null // para filtrar modelos por marca
}

interface Option {
  value: string
  label: string
  brand_id?: number | null // solo para modelos
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

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    if (!mounted || (!table && !view)) return

    const fetchData = async () => {
      try {
        const target = view || table!
        const filterColumn = view === 'models_with_brands' ? 'model_name' : 'name'

        let query = supabase.from(target).select('*')

        // filtros extra
        Object.entries(filters).forEach(([key, value]) => {
          query = query.eq(key, value)
        })

        if (input) {
          query = query.ilike(filterColumn, `%${input}%`)
        }

        const { data, error } = await query

        if (error) {
          console.error('Error fetching options:', error.message)
          setOptions(selectedValues.map(val => ({ value: val, label: val })))
          return
        }

        let fetchedOptions: Option[] =
          data?.map(d => ({
            value: view === 'models_with_brands' ? `${d.brand_name} - ${d.model_name}` : d.name,
            label: view === 'models_with_brands' ? `${d.brand_name} - ${d.model_name}` : d.name,
            brand_id: (d as any).brand_id ?? null
          })) || []

        // filtrar modelos por marca
        if (table === 'models') {
          if (brandId != null) {
            fetchedOptions = fetchedOptions.filter(opt => opt.brand_id === brandId)
          } else if (allowOther) {
            // Marca "Otro": no mostrar modelos reales
            fetchedOptions = []
          }
        }

        // añadir opción "Otro"
        if (allowOther && !fetchedOptions.some(o => o.label.toLowerCase() === 'otro')) {
          fetchedOptions.push({ value: 'Otro', label: 'Otro', brand_id: null })
        }

        setOptions(fetchedOptions)
      } catch (err) {
        console.error('Unexpected error fetching options:', err)
        setOptions(selectedValues.map(val => ({ value: val, label: val })))
      }
    }

    fetchData()
  }, [input, table, view, mounted, JSON.stringify(filters), selectedValues, allowOther, brandId])

  if (!mounted) return null

  const value = single
    ? options.find(opt => selectedValues.includes(opt.value)) || (selectedValues[0] ? { value: selectedValues[0], label: selectedValues[0] } : null)
    : [
        ...options.filter(opt => selectedValues.includes(opt.value)),
        ...selectedValues
          .filter(val => !options.some(opt => opt.value === val))
          .map(val => ({ value: val, label: val }))
      ]

  return (
    <CreatableSelect
      isMulti={!single}
      options={options}
      value={value}
      onInputChange={val => setInput(val)}
      onChange={vals => {
        if (single) {
          const val = (vals as Option | null)?.value
          onChange(val ? [val] : [])
        } else {
          onChange((vals as Option[]).map(v => v.value))
        }
      }}
      onCreateOption={val => {
        // cuando escribes algo nuevo y le das enter
        if (single) {
          onChange([val])
        } else {
          onChange([...selectedValues, val])
        }
      }}
      placeholder={table === 'brands' ? 'Selecciona marca...' : 'Selecciona modelo...'}
      noOptionsMessage={() => 'No se encontraron opciones'}
      formatCreateLabel={(inputValue) => `Crear "${inputValue}"`}
    />
  )
}
