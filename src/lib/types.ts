export type ProductCategory = "Açaí" | "Sorvetes" | "Milk-shakes" | "Sobremesas" | "Promoções" | "Bebidas" | "Outros";
export type PaymentMethod = "Pix" | "Dinheiro" | "Cartão" | "Fiado/Outro";
export type LegacyOrderStatus = "pending_payment" | "paid" | "canceled";
export type PaymentStatus = "pending" | "paid";
export type OrderStatus = "new" | "preparing" | "ready" | "delivered" | "canceled";
export type OrderOrigin = "internal" | "delivery";
export type DeliveryType = "pickup" | "delivery";

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
  paymentStatus: PaymentStatus;
  orderStatus: OrderStatus;
  /** Campo legado mantido durante o MVP para compatibilidade com dados antigos. */
  status?: LegacyOrderStatus;
  total: number;
  createdAt: string;
  updatedAt: string;
  origin: OrderOrigin;
  deliveryType: DeliveryType;
  address?: string;
}

export type NewOrder = Omit<Order, "id" | "createdAt" | "updatedAt">;
