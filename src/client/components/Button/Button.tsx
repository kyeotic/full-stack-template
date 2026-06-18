import { type JSX, mergeProps, splitProps } from 'solid-js'
import clsx from 'clsx'

type ButtonVariant =
  | 'default'
  | 'primary'
  | 'danger'
  | 'info'
  | 'success'
  | 'warning'
  | 'purple'
  | 'indigo'
  | 'teal'
  | 'orange'

interface ButtonProps {
  variant?: ButtonVariant
  primary?: boolean
  danger?: boolean
  small?: boolean
}

export function buttonStyle(
  props: ButtonProps = {
    variant: 'default',
    primary: false,
    danger: false,
    small: false,
  },
  ...classes: string[]
): string {
  if (props.variant && (props.primary || props.danger)) {
    throw new Error('Cannot use variant prop alongside primary or danger props')
  }

  const variantStyles = {
    default:
      'bg-slate-400 hover:bg-slate-700 dark:bg-slate-600 dark:hover:bg-slate-500',
    primary:
      'bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600',
    danger: 'bg-red-500 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700',
    info: 'bg-blue-500 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700',
    success:
      'bg-emerald-500 hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-700',
    warning:
      'bg-amber-500 hover:bg-amber-700 dark:bg-amber-600 dark:hover:bg-amber-700',
    purple:
      'bg-purple-500 hover:bg-purple-700 dark:bg-purple-600 dark:hover:bg-purple-700',
    indigo:
      'bg-indigo-500 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-700',
    teal: 'bg-teal-500 hover:bg-teal-700 dark:bg-teal-600 dark:hover:bg-teal-700',
    orange:
      'bg-orange-500 hover:bg-orange-700 dark:bg-orange-600 dark:hover:bg-orange-700',
  }

  // Determine the variant based on props
  let variant: ButtonVariant = props.variant ?? 'default'
  if (props.primary) variant = 'primary'
  if (props.danger) variant = 'danger'

  return clsx(
    'text-white font-bold rounded-sm inline-block touch-manipulation',
    props.small ? 'py-1 px-2' : 'py-2 px-4',
    variantStyles[variant],
    ...classes,
  )
}

export default function Button(
  props: JSX.ButtonHTMLAttributes<HTMLButtonElement> & ButtonProps,
): JSX.Element {
  let [local, rest] = splitProps(
    mergeProps(
      { type: 'button' as JSX.ButtonHTMLAttributes<HTMLButtonElement>['type'] },
      props,
    ),
    ['class', 'variant', 'primary', 'danger', 'small'],
  )
  return <button {...rest} class={clsx(local.class, buttonStyle(local))} />
}
