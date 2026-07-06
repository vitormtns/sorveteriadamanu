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
  availableToday: boolean;
  featured: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

export type WeekdayKey = "sunday" | "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday";

export interface BusinessHour {
  enabled: boolean;
  open: string;
  close: string;
}

export interface Promotion {
  id: string;
  title: string;
  description: string;
  price: number;
  active: boolean;
  featuredOnHome: boolean;
  validUntil?: string;
  imageUrl?: string;
}

export interface ConfigurableItem {
  id: string;
  name: string;
  available: boolean;
  extraPrice?: number;
  previewColor?: string;
}

export interface StoreSettings {
  version: 1;
  status: {
    deliveryOpen: boolean;
    pauseOnlineOrders: boolean;
    closedMessage: string;
    allowPickup: boolean;
    allowDelivery: boolean;
    closedToday: boolean;
    temporaryPause: boolean;
  };
  businessHours: Record<WeekdayKey, BusinessHour>;
  delivery: {
    fee: number;
  };
  payments: {
    accepted: Record<PaymentMethod, boolean>;
    pixKey: string;
    note: string;
  };
  promotions: Promotion[];
  acaiExtras: ConfigurableItem[];
  iceCreamFlavors: ConfigurableItem[];
  milkshakeFlavors: ConfigurableItem[];
  site: {
    headline: string;
    subtitle: string;
    whatsapp: string;
    address: string;
    instagram: string;
    displayedHours: string;
  };
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
  deliveryFee?: number;
  address?: string;
  publicCode?: string;
}

export type NewOrder = Omit<Order, "id" | "createdAt" | "updatedAt">;
