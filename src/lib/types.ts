export type ProductCategory = "Açaí" | "Sorvetes" | "Milk-shakes" | "Sobremesas" | "Promoções" | "Bebidas" | "Outros";
export type PaymentMethod = "Pix" | "Dinheiro" | "Cartão" | "Fiado/Outro";
export type OrderStatus = "pending_payment" | "paid" | "canceled";

export interface Product {
  id: string;
  name: string;
  category: ProductCategory;
  price: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
}

export interface Order {
  id: string;
  customerName: string;
  phone?: string;
  items: OrderItem[];
  notes?: string;
  paymentMethod: PaymentMethod;
  status: OrderStatus;
  total: number;
  createdAt: string;
  updatedAt: string;
  origin?: "internal" | "delivery";
  deliveryType?: "pickup" | "delivery";
  address?: string;
}

export type NewOrder = Omit<Order, "id" | "createdAt" | "updatedAt">;
