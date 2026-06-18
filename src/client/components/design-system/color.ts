import clsx from 'clsx'

export function bgStyle(...classes: string[]): string {
  // If this base is changed the index.html body must also be updated
  return clsx('bg-white dark:bg-gray-900', ...classes)
}
