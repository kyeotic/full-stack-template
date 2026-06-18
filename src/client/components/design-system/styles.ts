import clsx from 'clsx'
import { textColor } from './Typography/font'

/**
 * Border-radius scale. Prefer these over ad-hoc `rounded-*` values so corners
 * stay consistent across surfaces.
 */
export const radius = {
  sm: 'rounded-sm',
  md: 'rounded-md',
  lg: 'rounded-lg',
  full: 'rounded-full',
} as const

/** Default dark-mode-aware border for bordered surfaces. */
export function borderStyle(...classes: string[]): string {
  return clsx('border border-gray-200 dark:border-gray-700', ...classes)
}

/** Lighter border for in-list dividers / row separators. */
export function dividerStyle(...classes: string[]): string {
  return clsx('border-gray-100 dark:border-gray-800', ...classes)
}

/**
 * A bordered surface ("card"). Compose with flex/grid for layout; do not add
 * fixed widths.
 */
export function cardStyle(...classes: string[]): string {
  return clsx(radius.lg, borderStyle(), 'p-4', ...classes)
}

export type CalloutTone = 'neutral' | 'info' | 'warning'

const calloutTones: Record<CalloutTone, string> = {
  neutral: 'bg-gray-50 dark:bg-gray-800',
  info: 'bg-sky-50 dark:bg-sky-950',
  warning: 'border border-amber-300 dark:border-amber-700',
}

/** A highlighted panel that draws attention to a region of content. */
export function calloutStyle(
  tone: CalloutTone = 'neutral',
  ...classes: string[]
): string {
  return clsx(radius.lg, calloutTones[tone], ...classes)
}

/**
 * Shared form-field styling for inputs/selects, so bespoke controls line up
 * with `TextInput`. Full-width by default; constrain with a flex/grid parent
 * rather than a fixed width.
 */
export function fieldStyle(...classes: string[]): string {
  return clsx(
    'block w-full p-2.5 text-sm',
    'bg-gray-50 dark:bg-gray-700',
    'border border-gray-300 dark:border-gray-600',
    textColor('placeholder-gray-400 dark:placeholder-gray-400'),
    radius.lg,
    'focus:ring-blue-500 focus:border-blue-500',
    ...classes,
  )
}
