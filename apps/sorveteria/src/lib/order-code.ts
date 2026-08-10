import { Order } from "./types";

export function createPublicOrderCode(id: string) {
  let hash = 0;
  for (const character of id) hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  return `M${(hash % 46_656).toString(36).padStart(3, "0").toUpperCase()}`;
}

export function getPublicOrderCode(order: Pick<Order, "id" | "publicCode">) {
  return order.publicCode || createPublicOrderCode(order.id);
}

export function formatPublicOrderCode(order: Pick<Order, "id" | "publicCode">) {
  return `#${getPublicOrderCode(order)}`;
}
