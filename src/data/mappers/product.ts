import { Product } from "@/lib/types";
import { DatabaseProduct, DatabaseProductInsert, DatabaseProductUpdate } from "@/data/supabase/database.types";
import { moneyToDatabase, numericToNumber } from "./numeric";

export function mapProductFromDatabase(row: DatabaseProduct): Product {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    description: row.description ?? undefined,
    price: numericToNumber(row.price),
    active: row.active,
    availableToday: row.available_today,
    featured: row.featured,
    displayOrder: row.display_order,
    imageUrl: row.image_url ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapProductInsertToDatabase(product: Omit<Product, "id" | "createdAt" | "updatedAt">): DatabaseProductInsert {
  return {
    name: product.name,
    category: product.category,
    description: product.description ?? null,
    price: moneyToDatabase(product.price),
    active: product.active,
    available_today: product.availableToday,
    featured: product.featured,
    display_order: product.displayOrder,
    image_url: product.imageUrl ?? null,
  };
}

export function mapProductUpdateToDatabase(product: Partial<Omit<Product, "id" | "createdAt" | "updatedAt">>): DatabaseProductUpdate {
  return {
    name: product.name,
    category: product.category,
    description: product.description,
    price: product.price === undefined ? undefined : moneyToDatabase(product.price),
    active: product.active,
    available_today: product.availableToday,
    featured: product.featured,
    display_order: product.displayOrder,
    image_url: product.imageUrl,
  };
}
