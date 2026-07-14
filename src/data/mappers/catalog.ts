import { ConfigurableItem, FlavorProductType, Promotion } from "@/lib/types";
import { DatabaseAddOn, DatabaseFlavor, DatabaseFlavorProductType, DatabasePromotion, DatabasePromotionInsert, DatabasePromotionUpdate } from "@/data/supabase/database.types";
import { moneyToDatabase, numericToNumber } from "./numeric";

export function mapPromotionFromDatabase(row: DatabasePromotion): Promotion {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    price: numericToNumber(row.price),
    active: row.active,
    featuredOnHome: row.featured_on_home,
    validFrom: row.valid_from ?? undefined,
    validUntil: row.valid_until ?? undefined,
    imageUrl: row.image_url ?? undefined,
    displayOrder: row.display_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapPromotionInsertToDatabase(promotion: Omit<Promotion, "id" | "createdAt" | "updatedAt">): DatabasePromotionInsert {
  return {
    title: promotion.title,
    description: promotion.description,
    price: moneyToDatabase(promotion.price),
    active: promotion.active,
    featured_on_home: promotion.featuredOnHome,
    valid_from: promotion.validFrom ?? null,
    valid_until: promotion.validUntil ?? null,
    image_url: promotion.imageUrl ?? null,
    display_order: promotion.displayOrder ?? 0,
  };
}

export function mapPromotionUpdateToDatabase(promotion: Partial<Omit<Promotion, "id" | "createdAt" | "updatedAt">>): DatabasePromotionUpdate {
  return {
    title: promotion.title,
    description: promotion.description,
    price: promotion.price === undefined ? undefined : moneyToDatabase(promotion.price),
    active: promotion.active,
    featured_on_home: promotion.featuredOnHome,
    valid_from: promotion.validFrom,
    valid_until: promotion.validUntil,
    image_url: promotion.imageUrl,
    display_order: promotion.displayOrder,
  };
}

export function mapAddOnFromDatabase(row: DatabaseAddOn): ConfigurableItem {
  return {
    id: row.id,
    name: row.name,
    active: row.active,
    available: row.available,
    extraPrice: numericToNumber(row.extra_price),
    displayOrder: row.display_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapFlavorFromDatabase(row: DatabaseFlavor): ConfigurableItem & { productType: FlavorProductType } {
  return {
    id: row.id,
    name: row.name,
    active: row.active,
    available: row.available,
    previewColor: row.preview_color ?? undefined,
    displayOrder: row.display_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    productType: mapFlavorProductTypeFromDatabase(row.product_type),
  };
}

export function mapFlavorProductTypeToDatabase(value: FlavorProductType): DatabaseFlavorProductType {
  return value;
}

function mapFlavorProductTypeFromDatabase(value: DatabaseFlavorProductType): FlavorProductType {
  return value;
}
