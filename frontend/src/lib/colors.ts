import type { NoteColor } from '../api/notes'

/**
 * Google Keep's palette, light and dark. Classes are written out in full so
 * Tailwind can see them.
 */
export const colorStyles: Record<NoteColor, { surface: string; swatch: string; label: string }> = {
  default: {
    surface: 'bg-white border-[#e0e0e0] dark:bg-[#202124] dark:border-[#5f6368]',
    swatch: 'bg-white border-[#dadce0] dark:bg-[#202124] dark:border-[#5f6368]',
    label: 'Default',
  },
  red: {
    surface: 'bg-[#f28b82] border-[#f28b82] dark:bg-[#5c2b29] dark:border-[#5c2b29]',
    swatch: 'bg-[#f28b82] border-[#f28b82] dark:bg-[#5c2b29] dark:border-[#5c2b29]',
    label: 'Red',
  },
  orange: {
    surface: 'bg-[#fbbc04] border-[#fbbc04] dark:bg-[#614a19] dark:border-[#614a19]',
    swatch: 'bg-[#fbbc04] border-[#fbbc04] dark:bg-[#614a19] dark:border-[#614a19]',
    label: 'Orange',
  },
  yellow: {
    surface: 'bg-[#fff475] border-[#fff475] dark:bg-[#635d19] dark:border-[#635d19]',
    swatch: 'bg-[#fff475] border-[#fff475] dark:bg-[#635d19] dark:border-[#635d19]',
    label: 'Yellow',
  },
  green: {
    surface: 'bg-[#ccff90] border-[#ccff90] dark:bg-[#345920] dark:border-[#345920]',
    swatch: 'bg-[#ccff90] border-[#ccff90] dark:bg-[#345920] dark:border-[#345920]',
    label: 'Green',
  },
  teal: {
    surface: 'bg-[#a7ffeb] border-[#a7ffeb] dark:bg-[#16504b] dark:border-[#16504b]',
    swatch: 'bg-[#a7ffeb] border-[#a7ffeb] dark:bg-[#16504b] dark:border-[#16504b]',
    label: 'Teal',
  },
  blue: {
    surface: 'bg-[#cbf0f8] border-[#cbf0f8] dark:bg-[#2d555e] dark:border-[#2d555e]',
    swatch: 'bg-[#cbf0f8] border-[#cbf0f8] dark:bg-[#2d555e] dark:border-[#2d555e]',
    label: 'Blue',
  },
  purple: {
    surface: 'bg-[#d7aefb] border-[#d7aefb] dark:bg-[#42275e] dark:border-[#42275e]',
    swatch: 'bg-[#d7aefb] border-[#d7aefb] dark:bg-[#42275e] dark:border-[#42275e]',
    label: 'Purple',
  },
  pink: {
    surface: 'bg-[#fdcfe8] border-[#fdcfe8] dark:bg-[#5b2245] dark:border-[#5b2245]',
    swatch: 'bg-[#fdcfe8] border-[#fdcfe8] dark:bg-[#5b2245] dark:border-[#5b2245]',
    label: 'Pink',
  },
  gray: {
    surface: 'bg-[#e8eaed] border-[#e8eaed] dark:bg-[#3c3f43] dark:border-[#3c3f43]',
    swatch: 'bg-[#e8eaed] border-[#e8eaed] dark:bg-[#3c3f43] dark:border-[#3c3f43]',
    label: 'Gray',
  },
}
