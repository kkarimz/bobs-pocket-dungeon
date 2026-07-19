/** Public icon path — respects Vite `base` (GitHub Pages subpath or `/`). */
export function iconUrl(name: string): string {
  const base = import.meta.env.BASE_URL || "/";
  return `${base}icons/${name}.png`;
}
