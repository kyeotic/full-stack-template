import { createStore } from 'solid-js/store'

export function useForm<T extends { [K in keyof T]: string | boolean }>(
  initialValue: T,
) {
  const [form, setForm] = createStore<T>(initialValue)

  function resetForm() {
    setForm(initialValue)
  }

  function clearField(field: keyof T) {
    // @ts-expect-error solid-js store partial update
    setForm(field, '')
  }

  const updateField = (field: keyof T) => (event: Event) => {
    const inputElement = event.currentTarget as HTMLInputElement
    if (inputElement.type === 'checkbox') {
      // @ts-expect-error solid-js store partial update
      setForm(field, !!inputElement.checked)
    } else {
      // @ts-expect-error solid-js store partial update
      setForm(field, inputElement.value)
    }
  }

  return { form, updateField, clearField, resetForm }
}
