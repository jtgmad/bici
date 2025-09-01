'use client'

import { useEffect, useState } from 'react'
import Select from 'react-select'
import { supabase } from '@/lib/supabaseClient'

interface AutocompleteMultiProps {
  table: 'brands' | 'models'
  onChange: (values: string[]) => void
  selectedValues?: string[] // opcional
}

interface Option {
  value: string
  label: string
}

export default function AutocompleteMulti({
  table,
  onChange,
  selectedValues = []
}: AutocompleteMultiProps) {
  const [options, setOptions] = useState<Option[]>([])
  const [input, setInput] = useState('')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Siempre mantenemos en options los valores seleccionados, aunque no estén en la búsqueda
useEffect(() => {
  if (!mounted) return

  const fetchData = async () => {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('name')
        .ilike('name', `%${input}%`)

      if (error) {
        console.error('Error fetching options:', error.message)
        setOptions(selectedValues.map(val => ({ value: val, label: val })))
      } else {
        const fetchedOptions = data?.map(d => ({ value: d.name, label: d.name })) || []
        setOptions(prevOptions => {
          // incluimos los selectedValues actuales
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
  // Solo dependemos de input, table y mounted
}, [input, table, mounted])


  if (!mounted) return null

  // Value seguro
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
