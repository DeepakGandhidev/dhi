/**
 * Every photo used on the site, in one place, so they can be swapped for
 * DHI's own photography without touching any component.
 * All URLs verified to resolve and to contain no third-party branding.
 */
export const IMAGES = {
  productsFlatlay: {
    src: "https://images.unsplash.com/photo-1596462502278-27bfdc403348",
    alt: "Brushes, powders and a lipstick laid out on a sand-coloured surface",
    credit: "Unsplash",
  },
  soap: {
    src: "https://images.unsplash.com/photo-1584305574647-0cc949a2bb9f",
    alt: "Two bars of handmade soap, one tied with twine, on a stone surface",
    credit: "Unsplash",
  },
  memberOne: {
    src: "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e",
    alt: "A smiling woman in a striped jacket standing in an office",
    credit: "Unsplash",
  },
  memberTwo: {
    src: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7",
    alt: "A man in a dark suit with arms folded, standing outdoors",
    credit: "Unsplash",
  },
  training: {
    src: "https://images.unsplash.com/photo-1552664730-d307ca884978",
    alt: "A woman presenting at a wall of sticky notes to a seated team",
    credit: "Unsplash",
  },
} as const;

export type ImageKey = keyof typeof IMAGES;

/** Unsplash resizing params, so we never ship a 4000px original. */
export function photoUrl(src: string, w: number, h?: number) {
  const params = new URLSearchParams({
    w: String(w),
    q: "72",
    fm: "jpg",
    fit: "crop",
    auto: "format",
  });
  if (h) params.set("h", String(h));
  return `${src}?${params.toString()}`;
}
