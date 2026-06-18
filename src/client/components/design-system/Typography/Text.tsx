import clsx from 'clsx'
import { type JSX, type ParentProps, splitProps } from 'solid-js'
import { bodyStyle, mutedStyle, strongStyle } from './font'
import { A } from '@solidjs/router'

type Props = ParentProps & {
  class?: string
  // De-emphasized text (hints, captions, secondary status).
  muted?: boolean
  // Emphasized text (names, key values).
  strong?: boolean
}

function textStyle(props: Props): string {
  if (props.strong) return strongStyle()
  if (props.muted) return mutedStyle()
  return bodyStyle()
}

export function Text(props: Props): JSX.Element {
  const [local, rest] = splitProps(props, ['class', 'muted', 'strong'])
  return <span class={clsx(textStyle(local), local.class)} {...rest} />
}

export function Paragraph(props: Props): JSX.Element {
  const [local, rest] = splitProps(props, ['class'])
  return <span class={clsx(local.class, 'mb-2', bodyStyle())} {...rest} />
}

export function Link(
  props: JSX.AnchorHTMLAttributes<HTMLAnchorElement>,
): JSX.Element {
  return (
    <A href={props.href ?? ''} class={bodyStyle('font-medium hover:underline')}>
      {props.children}
    </A>
  )
}
