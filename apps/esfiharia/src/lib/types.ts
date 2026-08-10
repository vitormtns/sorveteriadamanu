export type PaymentMethod = "Pix" | "Dinheiro" | "Cartão" | "A combinar";
export type DeliveryType = "pickup" | "delivery";
export type OrderStatus =
  | "new"
  | "preparing"
  | "ready"
  | "delivered"
  | "canceled";
export type PaymentStatus = "pending" | "paid";

export interface StoreIdentity {
  id: string;
  slug: string;
  name: string;
  type: "sorveteria" | "esfiharia";
  active: boolean;
}

export interface Product {
  id: string;
  storeId: string;
  name: string;
  category: string;
  description?: string;
  price: number;
  active: boolean;
  availableToday: boolean;
  featured: boolean;
  displayOrder: number;
  imageUrl?: string;
}

export interface BusinessHour {
  weekday: number;
  enabled: boolean;
  open: string;
  close: string;
}

export interface StoreSettings {
  deliveryOpen: boolean;
  paused: boolean;
  closedToday: boolean;
  closedMessage: string;
  allowPickup: boolean;
  allowDelivery: boolean;
  deliveryFee: number;
  minimumOrder: number;
  acceptedPaymentMethods: PaymentMethod[];
  whatsapp: string;
  instagram: string;
  address: string;
  headline: string;
  subtitle: string;
  displayedHours: string;
  hours: BusinessHour[];
}

export interface StorefrontSnapshot {
  store: StoreIdentity;
  products: Product[];
  settings: StoreSettings | null;
}

export interface CartItem {
  product: Product;
  quantity: number;
  notes: string;
}

export interface OrderItem {
  id: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  notes?: string;
}

export interface Order {
  id: string;
  publicCode: string;
  customerName: string;
  phone?: string;
  notes?: string;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  orderStatus: OrderStatus;
  deliveryType: DeliveryType;
  address?: string;
  subtotal: number;
  deliveryFee: number;
  discount: number;
  total: number;
  createdAt: string;
  items: OrderItem[];
}
