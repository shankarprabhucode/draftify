import type { NoteColor } from '../api/notes'

/** Tailwind classes per note colour. Listed literally so Tailwind can see them. */
export const colorStyles: Record<NoteColor, { surface: string; swatch: string; label: string }> = {
  default: {
    surface: 'bg-white border-slate-200 dark:bg-slate-900 dark:border-slate-700',
    swatch: 'bg-white border-slate-300 dark:bg-slate-900 dark:border-slate-600',
    label: 'Default',
  },
  red: {
    surface: 'bg-red-50 border-red-200 dark:bg-red-950/50 dark:border-red-900',
    swatch: 'bg-red-200 border-red-300 dark:bg-red-900',
    label: 'Red',
  },
  orange: {
    surface: 'bg-orange-50 border-orange-200 dark:bg-orange-950/50 dark:border-orange-900',
    swatch: 'bg-orange-200 border-orange-300 dark:bg-orange-900',
    label: 'Orange',
  },
  yellow: {
    surface: 'bg-amber-50 border-amber-200 dark:bg-amber-950/50 dark:border-amber-900',
    swatch: 'bg-amber-200 border-amber-300 dark:bg-amber-900',
    label: 'Yellow',
  },
  green: {
    surface: 'bg-green-50 border-green-200 dark:bg-green-950/50 dark:border-green-900',
    swatch: 'bg-green-200 border-green-300 dark:bg-green-900',
    label: 'Green',
  },
  teal: {
    surface: 'bg-teal-50 border-teal-200 dark:bg-teal-950/50 dark:border-teal-900',
    swatch: 'bg-teal-200 border-teal-300 dark:bg-teal-900',
    label: 'Teal',
  },
  blue: {
    surface: 'bg-sky-50 border-sky-200 dark:bg-sky-950/50 dark:border-sky-900',
    swatch: 'bg-sky-200 border-sky-300 dark:bg-sky-900',
    label: 'Blue',
  },
  purple: {
    surface: 'bg-violet-50 border-violet-200 dark:bg-violet-950/50 dark:border-violet-900',
    swatch: 'bg-violet-200 border-violet-300 dark:bg-violet-900',
    label: 'Purple',
  },
  pink: {
    surface: 'bg-pink-50 border-pink-200 dark:bg-pink-950/50 dark:border-pink-900',
    swatch: 'bg-pink-200 border-pink-300 dark:bg-pink-900',
    label: 'Pink',
  },
  gray: {
    surface: 'bg-slate-100 border-slate-300 dark:bg-slate-800 dark:border-slate-600',
    swatch: 'bg-slate-300 border-slate-400 dark:bg-slate-600',
    label: 'Gray',
  },
}
