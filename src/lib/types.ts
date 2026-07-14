export type ProductCategory = "Açaí" | "Sorvetes" | "Milk-shakes" | "Sobremesas" | "Promoções" | "Bebidas" | "Outros";
export type PaymentMethod = "Pix" | "Dinheiro" | "Cartão" | "A combinar";
export type LegacyPaymentMethod = "Fiado/Outro";
export type LegacyOrderStatus = "pending_payment" | "paid" | "canceled";
export type PaymentStatus = "pending" | "paid";
export type OrderStatus = "new" | "preparing" | "ready" | "delivered" | "canceled";
export type OrderOrigin = "internal" | "delivery";
export type DeliveryType = "pickup" | "delivery";
export type FlavorProductType = "ice_cream" | "milkshake";
export type DeliveryBuilderType = "acai" | "ice_cream" | "milkshake";
export type DeliveryBuilderOptionType = "size" | "format" | "scoop" | "topping";

export interface Product {
  id: string;
  name: string;
  category: ProductCategory;
  description?: string;
  price: number;
  active: boolean;
  availableToday: boolean;
  featured: boolean;
  displayOrder: number;
  imageUrl?: string;
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
  validFrom?: string;
  validUntil?: string;
  imageUrl?: string;
  displayOrder?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface ConfigurableItem {
  id: string;
  name: string;
  active?: boolean;
  available: boolean;
  extraPrice?: number;
  previewColor?: string;
  displayOrder?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface DeliveryBuilderOption {
  id: string;
  builderType: DeliveryBuilderType;
  optionType: DeliveryBuilderOptionType;
  code: string;
  name: string;
  price: number;
  maxFlavors?: number;
  active: boolean;
  available: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
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
    minimumOrder: number;
    freeAddOnsQuantity: number;
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
  productId?: string;
  productName: string;
  category?: ProductCategory;
  quantity: number;
  unitPrice: number;
  subtotal?: number;
  details?: Record<string, unknown>;
  notes?: string;
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
  subtotal?: number;
  deliveryFee?: number;
  discount?: number;
  total: number;
  cancellationReason?: string;
  acceptedAt?: string;
  preparingAt?: string;
  readyAt?: string;
  completedAt?: string;
  canceledAt?: string;
  createdAt: string;
  updatedAt: string;
  origin: OrderOrigin;
  deliveryType: DeliveryType;
  address?: string;
  publicCode?: string;
  createdBy?: string;
}

export type NewOrder = Omit<Order, "id" | "createdAt" | "updatedAt">;
