/**
 * Gera um slug a partir do nome do planeta.
 * "Franco RPG" → "franco-rpg"
 * "Thalassa 2" → "thalassa-2"
 */
export function toSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove acentos
    .replace(/[^a-z0-9\s-]/g, '')    // remove caracteres especiais
    .trim()
    .replace(/\s+/g, '-')            // espaços → hífens
    .replace(/-+/g, '-')             // hífens duplos → simples
}
