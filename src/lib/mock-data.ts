import { Order, Product } from "./types";

const at = (hours: number, minutes: number) => {
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date.toISOString();
};

export const initialProducts: Product[] = [
  { id: "p1", name: "Açaí 300 ml", category: "Açaí", price: 14, active: true, createdAt: at(8, 0), updatedAt: at(8, 0) },
  { id: "p2", name: "Açaí 500 ml", category: "Açaí", price: 19, active: true, createdAt: at(8, 0), updatedAt: at(8, 0) },
  { id: "p3", name: "Copo de sorvete 2 bolas", category: "Sorvete", price: 12, active: true, createdAt: at(8, 0), updatedAt: at(8, 0) },
  { id: "p4", name: "Casquinha", category: "Sorvete", price: 8, active: true, createdAt: at(8, 0), updatedAt: at(8, 0) },
  { id: "p5", name: "Leite em pó", category: "Complementos", price: 3, active: true, createdAt: at(8, 0), updatedAt: at(8, 0) },
  { id: "p6", name: "Combo Manu", category: "Promoções", price: 25, active: true, createdAt: at(8, 0), updatedAt: at(8, 0) },
];

export const initialOrders: Order[] = [
  {
    id: "o1", customerName: "Juliana Silva", phone: "(11) 99932-1234",
    items: [{ id: "i1", productId: "p2", productName: "Açaí 500 ml", quantity: 2, unitPrice: 19 }],
    paymentMethod: "Pix", status: "pending_payment", total: 38, notes: "Sem banana", createdAt: at(14, 35), updatedAt: at(14, 35),
  },
  {
    id: "o2", customerName: "Marcos", phone: "(11) 98810-4455",
    items: [{ id: "i2", productId: "p6", productName: "Combo Manu", quantity: 1, unitPrice: 25 }],
    paymentMethod: "Dinheiro", status: "paid", total: 25, createdAt: at(13, 10), updatedAt: at(13, 10),
  },
  {
    id: "o3", customerName: "Ana Paula",
    items: [{ id: "i3", productId: "p3", productName: "Copo de sorvete 2 bolas", quantity: 2, unitPrice: 12 }],
    paymentMethod: "Fiado/Outro", status: "pending_payment", total: 24, createdAt: at(11, 50), updatedAt: at(11, 50),
  },
];
