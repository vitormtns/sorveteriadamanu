import type { ProductCategory } from "./types";

export const productCategories: ProductCategory[] = [
  "Açaí",
  "Sorvetes",
  "Milk-shakes",
  "Esfihas",
  "Sobremesas",
  "Promoções",
  "Bebidas",
  "Outros",
];

export const esfihariaProductCategories: ProductCategory[] = [
  "Esfihas",
  "Bebidas",
  "Sobremesas",
  "Promoções",
  "Outros",
];

export function parseProductCategory(value: unknown): ProductCategory {
  if (
    typeof value !== "string" ||
    !productCategories.includes(value as ProductCategory)
  )
    throw new Error("Categoria de produto inválida.");
  return value as ProductCategory;
}
