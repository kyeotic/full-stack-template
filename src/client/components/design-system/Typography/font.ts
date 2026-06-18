import classnames from 'classnames'

// Primary high-contrast text color, dark-mode aware. Shared by headings,
// strong body text, and form-field input text — define the token once here.
export function textColor(...classes: string[]): string {
  return classnames('text-gray-900 dark:text-white', ...classes)
}

export function headerStyle(): string {
  return textColor('font-extrabold tracking-tight')
}

export function bodyStyle(...classes: string[]): string {
  return classnames('text-gray-600 dark:text-gray-400', ...classes)
}

// Emphasized body text — names, key values, inline highlights.
export function strongStyle(...classes: string[]): string {
  return textColor('font-bold', ...classes)
}

// De-emphasized body text — hints, secondary status, captions.
export function mutedStyle(...classes: string[]): string {
  return classnames('text-gray-400 dark:text-gray-500', ...classes)
}
