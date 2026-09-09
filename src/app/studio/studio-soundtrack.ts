/** A direct media source lets the doorway filter the actual soundtrack. */
export const STUDIO_SOUNDTRACK = {
  title: 'Turkish Cotton · Instrumental',
  file: '/studio-assets/audio/turkish-cotton-instrumental.m4a',
  source: 'https://www.youtube.com/watch?v=FT2b-kljjvY',
  // Arrive at the first stronger bass phrase, already audible through the door filter.
  startAtSeconds: 7.2,
} as const;
