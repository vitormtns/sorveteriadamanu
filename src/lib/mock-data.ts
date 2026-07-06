import { Order, Product } from "./types";

const at = (hours: number, minutes: number, daysAgo = 0) => {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  date.setHours(hours, minutes, 0, 0);
  return date.toISOString();
};

export const initialProducts: Product[] = [
  { id: "p1", name: "Açaí 300 ml", category: "Açaí", price: 14, active: true, createdAt: at(8, 0), updatedAt: at(8, 0) },
  { id: "p2", name: "Açaí 500 ml", category: "Açaí", price: 19, active: true, createdAt: at(8, 0), updatedAt: at(8, 0) },
  { id: "p3", name: "Copo de sorvete 2 bolas", category: "Sorvetes", price: 12, active: true, createdAt: at(8, 0), updatedAt: at(8, 0) },
  { id: "p4", name: "Casquinha", category: "Sorvetes", price: 8, active: true, createdAt: at(8, 0), updatedAt: at(8, 0) },
  { id: "p5", name: "Taça especial", category: "Sobremesas", price: 16, active: true, createdAt: at(8, 0), updatedAt: at(8, 0) },
  { id: "p6", name: "Combo Manu", category: "Promoções", price: 25, active: true, createdAt: at(8, 0), updatedAt: at(8, 0) },
  { id: "p7", name: "Milk-shake 300 ml", category: "Milk-shakes", price: 12, active: true, createdAt: at(8, 0), updatedAt: at(8, 0) },
  { id: "p8", name: "Milk-shake 500 ml", category: "Milk-shakes", price: 17, active: true, createdAt: at(8, 0), updatedAt: at(8, 0) },
  { id: "p9", name: "Milk-shake de Ovomaltine", category: "Milk-shakes", price: 19, active: true, createdAt: at(8, 0), updatedAt: at(8, 0) },
  { id: "p10", name: "Milk-shake de morango", category: "Milk-shakes", price: 17, active: true, createdAt: at(8, 0), updatedAt: at(8, 0) },
];

export const initialOrders: Order[] = [
  {
    id: "o1", customerName: "Juliana Silva", phone: "(11) 99932-1234",
    items: [{ id: "i1", productId: "p2", productName: "Açaí 500 ml", quantity: 2, unitPrice: 19 }],
    paymentMethod: "Pix", paymentStatus: "pending", orderStatus: "new", status: "pending_payment",
    total: 38, notes: "Sem banana", origin: "delivery", deliveryType: "delivery",
    address: "Rua das Flores, 120 — Centro", createdAt: at(14, 35), updatedAt: at(14, 35),
  },
  {
    id: "o2", customerName: "Marcos Almeida", phone: "(11) 98810-4455",
    items: [{ id: "i2", productId: "p6", productName: "Combo Manu", quantity: 1, unitPrice: 25 }],
    paymentMethod: "Dinheiro", paymentStatus: "paid", orderStatus: "preparing", status: "paid",
    total: 25, origin: "internal", deliveryType: "pickup", createdAt: at(13, 10), updatedAt: at(13, 10),
  },
  {
    id: "o3", customerName: "Ana Paula",
    items: [{ id: "i3", productId: "p3", productName: "Copo de sorvete 2 bolas", quantity: 2, unitPrice: 12 }],
    paymentMethod: "Cartão", paymentStatus: "paid", orderStatus: "ready", status: "paid",
    total: 24, origin: "delivery", deliveryType: "delivery", address: "Av. Brasil, 45 — Jardim",
    createdAt: at(12, 50), updatedAt: at(12, 50),
  },
  {
    id: "o4", customerName: "Rafael Souza",
    items: [{ id: "i4", productId: "p7", productName: "Milk-shake 300 ml", quantity: 1, unitPrice: 12 }],
    paymentMethod: "Pix", paymentStatus: "paid", orderStatus: "delivered", status: "paid",
    total: 12, origin: "internal", deliveryType: "pickup", createdAt: at(10, 20), updatedAt: at(10, 35),
  },
  {
    id: "o5", customerName: "Carla Mendes", phone: "(11) 97777-1010",
    items: [{ id: "i5", productId: "p5", productName: "Taça especial", quantity: 2, unitPrice: 16 }],
    paymentMethod: "Fiado/Outro", paymentStatus: "pending", orderStatus: "delivered", status: "pending_payment",
    total: 32, origin: "internal", deliveryType: "pickup", createdAt: at(17, 15, 1), updatedAt: at(17, 40, 1),
  },
  {
    id: "o6", customerName: "Bruno Lima",
    items: [{ id: "i6", productId: "p4", productName: "Casquinha", quantity: 2, unitPrice: 8 }],
    paymentMethod: "Dinheiro", paymentStatus: "pending", orderStatus: "canceled", status: "canceled",
    total: 16, notes: "Cliente desistiu.", origin: "delivery", deliveryType: "pickup",
    createdAt: at(9, 40), updatedAt: at(9, 45),
  },
];
