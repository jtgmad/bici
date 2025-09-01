'use client'

import { useEffect, useState } from 'react'
import Select from 'react-select'
import { supabase } from '@/lib/supabaseClient'

interface AutocompleteMultiProps {
  table: 'brands' | 'models' | 'models_with_brands'
  onChange: (values: string[]) => void
  selectedValues?: string[] // opcional
  filters?: Record<string, any> // nuevo prop para filtrar
}

interface Option {
  value: string
  label: string
}

export default function AutocompleteMulti({
  table,
  onChange,
  selectedValues = [],
  filters = {}
}: AutocompleteMultiProps) {
  const [options, setOptions] = useState<Option[]>([])
  const [input, setInput] = useState('')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return

    const fetchData = async () => {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('*') // todas las columnas (en la vista tenemos model_name y brand_name)
          .ilike(table === 'models_with_brands' ? 'model_name' : 'name', `%${input}%`)
          .match(filters || {})

        if (error) {
          console.error('Error fetching options:', error.message)
          setOptions(selectedValues.map(val => ({ value: val, label: val })))
        } else {
          const fetchedOptions =
            data?.map(d => ({
              value: table === 'models_with_brands' ? d.model_name : d.name,
              label: table === 'models_with_brands' ? d.model_name : d.name
            })) || []

          setOptions(prevOptions => {
            const mergedOptions = [
              ...fetchedOptions,
              ...selectedValues
                .filter(val => !fetchedOptions.some(opt => opt.value === val))
                .map(val => ({ value: val, label: val }))
            ]
            return mergedOptions
          })
        }
      } catch (err) {
        console.error('Unexpected error fetching options:', err)
        setOptions(selectedValues.map(val => ({ value: val, label: val })))
      }
    }


    fetchData()
  }, [input, table, mounted, JSON.stringify(filters), selectedValues])

  if (!mounted) return null

  const value = options.filter(opt => selectedValues.includes(opt.value))

  return (
    <Select
      isMulti
      options={options}
      value={value}
      onInputChange={val => setInput(val)}
      onChange={vals => onChange((vals as Option[]).map(v => v.value))}
      placeholder={table === 'brands' ? 'Selecciona marcas...' : 'Selecciona modelos...'}
      noOptionsMessage={() => 'No se encontraron opciones'}
    />
  )
}
