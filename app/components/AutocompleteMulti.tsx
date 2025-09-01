'use client'

import { useEffect, useState } from 'react'
import Select from 'react-select'
import { supabase } from '@/lib/supabaseClient'

interface AutocompleteMultiProps {
  table?: 'brands' | 'models' // opcional
  view?: 'models_with_brands' // opcional
  onChange: (values: string[]) => void
  selectedValues?: string[]
  filters?: Record<string, any>
  single?: boolean // nuevo: selección única
  allowOther?: boolean // nuevo: permite opción "Otro"
}

interface Option {
  value: string
  label: string
}

export default function AutocompleteMulti({
  table,
  view,
  onChange,
  selectedValues = [],
  filters = {},
  single = false,
  allowOther = false
}: AutocompleteMultiProps) {
  const [options, setOptions] = useState<Option[]>([])
  const [input, setInput] = useState('')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return
    if (!table && !view) return

    const fetchData = async () => {
      try {
        const target = view || table!
        const filterColumn = view === 'models_with_brands' ? 'model_name' : 'name'

        const { data, error } = await supabase
          .from(target)
          .select('*')
          .ilike(filterColumn, `%${input}%`)
          .match(filters || {})

        if (error) {
          console.error('Error fetching options:', error.message)
          setOptions(selectedValues.map(val => ({ value: val, label: val })))
          return
        }

        let fetchedOptions =
          data?.map(d => ({
            value: view === 'models_with_brands' ? `${d.brand_name} - ${d.model_name}` : d.name,
            label: view === 'models_with_brands' ? `${d.brand_name} - ${d.model_name}` : d.name
          })) || []

        // agregar "Otro" si allowOther y no existe
        if (allowOther && !fetchedOptions.some(o => o.label.toLowerCase() === 'otro')) {
          fetchedOptions.push({ value: 'Otro', label: 'Otro' })
        }

        setOptions(fetchedOptions)
      } catch (err) {
        console.error('Unexpected error fetching options:', err)
        setOptions(selectedValues.map(val => ({ value: val, label: val })))
      }
    }

    fetchData()
  }, [input, table, view, mounted, JSON.stringify(filters), selectedValues, allowOther])

  if (!mounted) return null

  // solo un valor si single
  const value = single
    ? options.find(opt => selectedValues.includes(opt.value)) || null
    : options.filter(opt => selectedValues.includes(opt.value))

  return (
    <Select
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
      placeholder={table === 'brands' ? 'Selecciona marca...' : 'Selecciona modelo...'}
      noOptionsMessage={() => 'No se encontraron opciones'}
    />
  )
}
