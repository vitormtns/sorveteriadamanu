export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];
export type PostgresNumeric = number | string;

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: DatabaseProfile;
        Insert: DatabaseProfileInsert;
        Update: DatabaseProfileUpdate;
        Relationships: [];
      };
      products: {
        Row: DatabaseProduct;
        Insert: DatabaseProductInsert;
        Update: DatabaseProductUpdate;
        Relationships: [];
      };
      orders: {
        Row: DatabaseOrder;
        Insert: DatabaseOrderInsert;
        Update: DatabaseOrderUpdate;
        Relationships: [];
      };
      order_items: {
        Row: DatabaseOrderItem;
        Insert: DatabaseOrderItemInsert;
        Update: DatabaseOrderItemUpdate;
        Relationships: [];
      };
      order_status_history: {
        Row: DatabaseOrderStatusHistory;
        Insert: DatabaseOrderStatusHistoryInsert;
        Update: DatabaseOrderStatusHistoryUpdate;
        Relationships: [];
      };
      store_settings: {
        Row: DatabaseStoreSettings;
        Insert: DatabaseStoreSettingsInsert;
        Update: DatabaseStoreSettingsUpdate;
        Relationships: [];
      };
      business_hours: {
        Row: DatabaseBusinessHour;
        Insert: DatabaseBusinessHourInsert;
        Update: DatabaseBusinessHourUpdate;
        Relationships: [];
      };
      promotions: {
        Row: DatabasePromotion;
        Insert: DatabasePromotionInsert;
        Update: DatabasePromotionUpdate;
        Relationships: [];
      };
      add_ons: {
        Row: DatabaseAddOn;
        Insert: DatabaseAddOnInsert;
        Update: DatabaseAddOnUpdate;
        Relationships: [];
      };
      flavors: {
        Row: DatabaseFlavor;
        Insert: DatabaseFlavorInsert;
        Update: DatabaseFlavorUpdate;
        Relationships: [];
      };
    };
    Views: {
      public_store_settings: {
        Row: DatabasePublicStoreSettings;
        Relationships: [];
      };
    };
    Functions: {
      cancel_order: {
        Args: {
          p_order_id: string;
          p_cancellation_reason: string;
        };
        Returns: DatabaseOrder;
      };
      create_internal_order: {
        Args: {
          p_customer_name: string;
          p_payment_method: DatabasePaymentMethod;
          p_items: Json;
          p_phone: string | null;
          p_notes: string | null;
          p_payment_status: DatabasePaymentStatus;
          p_delivery_type: DatabaseDeliveryType;
          p_address: string | null;
          p_delivery_fee: PostgresNumeric;
          p_discount: PostgresNumeric;
        };
        Returns: string;
      };
      current_profile_role: {
        Args: Record<string, never>;
        Returns: DatabaseProfileRole | null;
      };
      generate_order_public_code: {
        Args: Record<string, never>;
        Returns: string;
      };
      is_internal_user: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      is_active_user: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      is_owner: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      save_store_configuration: {
        Args: {
          p_settings: Json;
          p_business_hours: Json;
          p_promotions: Json;
          p_add_ons: Json;
          p_flavors: Json;
        };
        Returns: undefined;
      };
      update_order_status: {
        Args: {
          p_order_id: string;
          p_new_status: DatabaseOrderStatus;
          p_cancellation_reason?: string | null;
        };
        Returns: DatabaseOrder;
      };
      update_payment_status: {
        Args: {
          p_order_id: string;
          p_payment_status: DatabasePaymentStatus;
        };
        Returns: DatabaseOrder;
      };
    };
    Enums: {
      profile_role: DatabaseProfileRole;
      product_category: DatabaseProductCategory;
      payment_method: DatabasePaymentMethod;
      payment_status: DatabasePaymentStatus;
      order_status: DatabaseOrderStatus;
      order_origin: DatabaseOrderOrigin;
      delivery_type: DatabaseDeliveryType;
      flavor_product_type: DatabaseFlavorProductType;
    };
    CompositeTypes: Record<string, never>;
  };
}

export type DatabaseProfileRole = "owner" | "attendant";
export type DatabaseProductCategory = "Açaí" | "Sorvetes" | "Milk-shakes" | "Sobremesas" | "Promoções" | "Bebidas" | "Outros";
export type DatabasePaymentMethod = "Pix" | "Dinheiro" | "Cartão" | "A combinar";
export type DatabasePaymentStatus = "pending" | "paid";
export type DatabaseOrderStatus = "new" | "preparing" | "ready" | "delivered" | "canceled";
export type DatabaseOrderOrigin = "internal" | "delivery";
export type DatabaseDeliveryType = "pickup" | "delivery";
export type DatabaseFlavorProductType = "ice_cream" | "milkshake";

export type DatabaseProfile = {
  id: string;
  name: string;
  role: DatabaseProfileRole;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type DatabaseProfileInsert = {
  id: string;
  name: string;
  role?: DatabaseProfileRole;
  active?: boolean;
  created_at?: string;
  updated_at?: string;
};

export type DatabaseProfileUpdate = Partial<DatabaseProfileInsert>;

export type DatabaseProduct = {
  id: string;
  name: string;
  category: DatabaseProductCategory;
  description: string | null;
  price: PostgresNumeric;
  active: boolean;
  available_today: boolean;
  featured: boolean;
  display_order: number;
  image_url: string | null;
  created_at: string;
  updated_at: string;
};

export type DatabaseProductInsert = Omit<DatabaseProduct, "id" | "created_at" | "updated_at"> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};
export type DatabaseProductUpdate = Partial<DatabaseProductInsert>;

export type DatabaseOrder = {
  id: string;
  public_code: string;
  customer_name: string;
  phone: string | null;
  notes: string | null;
  payment_method: DatabasePaymentMethod;
  payment_status: DatabasePaymentStatus;
  order_status: DatabaseOrderStatus;
  origin: DatabaseOrderOrigin;
  delivery_type: DatabaseDeliveryType;
  address: string | null;
  subtotal: PostgresNumeric;
  delivery_fee: PostgresNumeric;
  discount: PostgresNumeric;
  total: PostgresNumeric;
  cancellation_reason: string | null;
  created_by: string | null;
  accepted_at: string | null;
  preparing_at: string | null;
  ready_at: string | null;
  completed_at: string | null;
  canceled_at: string | null;
  created_at: string;
  updated_at: string;
};

export type DatabaseOrderInsert = Omit<DatabaseOrder, "id" | "public_code" | "created_at" | "updated_at"> & {
  id?: string;
  public_code?: string;
  created_at?: string;
  updated_at?: string;
};
export type DatabaseOrderUpdate = Partial<DatabaseOrderInsert>;

export type DatabaseOrderItem = {
  id: string;
  order_id: string;
  product_id: string | null;
  product_name: string;
  category: DatabaseProductCategory | null;
  quantity: number;
  unit_price: PostgresNumeric;
  subtotal: PostgresNumeric;
  details: Json;
  notes: string | null;
  created_at: string;
};

export type DatabaseOrderItemInsert = Omit<DatabaseOrderItem, "id" | "created_at"> & {
  id?: string;
  created_at?: string;
};
export type DatabaseOrderItemUpdate = Partial<DatabaseOrderItemInsert>;

export type DatabaseOrderStatusHistory = {
  id: string;
  order_id: string;
  previous_status: DatabaseOrderStatus | null;
  new_status: DatabaseOrderStatus;
  changed_by: string | null;
  notes: string | null;
  created_at: string;
};

export type DatabaseOrderStatusHistoryInsert = Omit<DatabaseOrderStatusHistory, "id" | "created_at"> & {
  id?: string;
  created_at?: string;
};
export type DatabaseOrderStatusHistoryUpdate = Partial<DatabaseOrderStatusHistoryInsert>;

export type DatabaseStoreSettings = {
  id: boolean;
  delivery_open: boolean;
  pause_online_orders: boolean;
  temporary_pause: boolean;
  closed_today: boolean;
  closed_message: string;
  allow_pickup: boolean;
  allow_delivery: boolean;
  delivery_fee: PostgresNumeric;
  minimum_order: PostgresNumeric;
  free_add_ons_quantity: number;
  accepted_payment_methods: DatabasePaymentMethod[];
  pix_key: string;
  payment_note: string;
  whatsapp: string;
  instagram: string;
  address: string;
  headline: string;
  subtitle: string;
  displayed_hours: string;
  config_version: number;
  created_at: string;
  updated_at: string;
};

export type DatabaseStoreSettingsInsert = Omit<DatabaseStoreSettings, "created_at" | "updated_at"> & {
  created_at?: string;
  updated_at?: string;
};
export type DatabaseStoreSettingsUpdate = Partial<DatabaseStoreSettingsInsert>;

export type DatabasePublicStoreSettings = {
  delivery_open: boolean;
  pause_online_orders: boolean;
  temporary_pause: boolean;
  closed_today: boolean;
  closed_message: string;
  allow_pickup: boolean;
  allow_delivery: boolean;
  delivery_fee: PostgresNumeric;
  minimum_order: PostgresNumeric;
  free_add_ons_quantity: number;
  accepted_payment_methods: DatabasePaymentMethod[];
  whatsapp: string;
  instagram: string;
  address: string;
  headline: string;
  subtitle: string;
  displayed_hours: string;
  config_version: number;
  updated_at: string;
};

export type DatabaseBusinessHour = {
  id: string;
  weekday: number;
  enabled: boolean;
  open_time: string;
  close_time: string;
  created_at: string;
  updated_at: string;
};

export type DatabaseBusinessHourInsert = Omit<DatabaseBusinessHour, "id" | "created_at" | "updated_at"> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};
export type DatabaseBusinessHourUpdate = Partial<DatabaseBusinessHourInsert>;

export type DatabasePromotion = {
  id: string;
  title: string;
  description: string;
  price: PostgresNumeric;
  active: boolean;
  featured_on_home: boolean;
  valid_from: string | null;
  valid_until: string | null;
  image_url: string | null;
  display_order: number;
  created_at: string;
  updated_at: string;
};

export type DatabasePromotionInsert = Omit<DatabasePromotion, "id" | "created_at" | "updated_at"> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};
export type DatabasePromotionUpdate = Partial<DatabasePromotionInsert>;

export type DatabaseAddOn = {
  id: string;
  name: string;
  active: boolean;
  available: boolean;
  extra_price: PostgresNumeric;
  display_order: number;
  created_at: string;
  updated_at: string;
};

export type DatabaseAddOnInsert = Omit<DatabaseAddOn, "id" | "created_at" | "updated_at"> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};
export type DatabaseAddOnUpdate = Partial<DatabaseAddOnInsert>;

export type DatabaseFlavor = {
  id: string;
  name: string;
  product_type: DatabaseFlavorProductType;
  active: boolean;
  available: boolean;
  preview_color: string | null;
  display_order: number;
  created_at: string;
  updated_at: string;
};

export type DatabaseFlavorInsert = Omit<DatabaseFlavor, "id" | "created_at" | "updated_at"> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};
export type DatabaseFlavorUpdate = Partial<DatabaseFlavorInsert>;
