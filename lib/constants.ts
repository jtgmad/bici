// IDs semánticos y helpers de dominio
export const BIKE_CATEGORY_ID = 1; // Ajusta si difiere en tu seed/productivo

export function isBikeCategory(categoryId?: number | null): boolean {
  return !!categoryId && categoryId === BIKE_CATEGORY_ID;
}