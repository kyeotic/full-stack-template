# Styleguide

Conventions for building UI in this app. The goal is that feature code composes
existing primitives instead of hand-rolling Tailwind. **Bespoke markup is the
exception, not the rule.**

When a need isn't covered here, extend the shared primitives (add a prop, a
style function, or a small component) rather than inlining classes in a feature.

---

## 1. Widths & layout

Elements are **full-width by default**. Constrain size with the _parent's_
layout (flexbox / CSS grid), not fixed widths on the element itself.

Hard-coded widths — especially large ones like `w-48`/`w-64` — produce
inflexible layouts that break when composed into a new context.

```tsx
// ✗ Don't: fixed width on an input wrapper
<div class="w-48 sm:w-64">
  <TextInput control={form.controls.name} />
</div>

// ✓ Do: let the field fill, let the row decide proportions
<div class="flex items-center gap-2">
  <TextInput class="flex-1" control={form.controls.name} />
  <Button type="submit" primary>Create</Button>
</div>
```

Reach for `flex-1`, `grid-cols-*`, `min-w-0`, `max-w-*` on containers. A fixed
width is acceptable only for intrinsically-sized chrome (an icon, a color
swatch), not content regions.

---

## 2. Typography — all visible text

Every piece of visible text goes through the components in
`components/design-system/Typography/`. Bare
`<p>`/`<span>`/`<label>` inherit near-black and **disappear in dark mode**.

| Use | For |
| --- | --- |
| `H1`–`H6` | headings |
| `Text` | inline / body copy |
| `Text muted` | de-emphasized text (hints, captions, secondary status) |
| `Text strong` | emphasized inline text (names, key values) |
| `Paragraph` | block body copy with bottom margin |
| `Label` | form field labels |

```tsx
// ✗ Don't
<span class="font-bold text-gray-900 dark:text-white">{household.name}</span>
<span class="text-gray-400 dark:text-gray-500">pending</span>

// ✓ Do
<Text strong>{household.name}</Text>
<Text muted>pending</Text>
```

Need something these don't cover? Add a prop or a new reusable Typography
component — don't inline a one-off.

---

## 3. Font & color come from `font.ts`

Never apply `font-*`, `text-gray-*`, or `dark:text-*` directly. Color and weight
live in style functions in [`Typography/font.ts`](./Typography/font.ts):

- `textColor(...classes)` — primary high-contrast text token (shared base)
- `headerStyle()` — heading weight + color (used by `H1`–`H6`)
- `bodyStyle(...classes)` — default body text color
- `strongStyle(...classes)` — emphasized text (used by `Text strong`)
- `mutedStyle(...classes)` — de-emphasized text

These already encode the `dark:` variants. If you need a new text treatment,
add a function here so the dark-mode color is defined once.

---

## 4. Surfaces — rounding, borders, callouts

Rounding, border colors, and panel backgrounds come from
[`design-system/styles.ts`](./styles.ts). Don't inline
`rounded-lg border border-gray-200 dark:border-gray-700` etc.

- `radius` — `{ sm, md, lg, full }` rounding scale
- `borderStyle(...classes)` — default dark-aware border
- `dividerStyle(...classes)` — lighter in-list row separators
- `cardStyle(...classes)` — bordered surface (radius + border + padding)
- `calloutStyle(tone, ...classes)` — highlighted panel; tone `neutral` / `info`
  (sky) / `warning` (amber)
- `fieldStyle(...classes)` — input/select field styling matching `TextInput`

```tsx
// ✗ Don't
<div class="p-3 rounded-lg border border-gray-200 dark:border-gray-700">…</div>
<div class="rounded-lg border border-amber-300 dark:border-amber-700">…</div>

// ✓ Do
<div class={cardStyle('p-3')}>…</div>
<div class={calloutStyle('warning', 'p-3')}>…</div>
```

For a bespoke `<input>`/`<select>` (when a Form component doesn't fit), style it
with `fieldStyle()` so heights and borders align in a row.

---

## 5. Reuse components

Reach for `components/` first: `Button` (`variant`/`primary`/`danger`/`small`),
`TextInput`, `Select`, `ColorPicker`, `MultiSelect`, `EditableLabel`, `Modal`,
`Toggle`, `ThemeToggle`, `PageLoader`, `SpinnerIcon`, `Label`, `LabelItem`,
`toast`. All are barrel-exported from
[`components/index.ts`](../index.ts).

If you're writing raw HTML with hand-rolled Tailwind, first check whether a
component or style function already exists — and if a near-miss exists, extend
it rather than forking a bespoke version.
