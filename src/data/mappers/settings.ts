import { StoreSettings, WeekdayKey } from "@/lib/types";
import { initialSettings, normalizeSettings } from "@/lib/settings";
import { DatabaseBusinessHour, DatabaseBusinessHourInsert, DatabasePublicStoreSettings, DatabaseStoreSettings, DatabaseStoreSettingsInsert } from "@/data/supabase/database.types";
import { moneyToDatabase, numericToNumber } from "./numeric";

const weekdayKeys: WeekdayKey[] = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

export function mapStoreSettingsFromDatabase(row: DatabaseStoreSettings, hours: DatabaseBusinessHour[] = []): StoreSettings {
  const businessHours = { ...initialSettings.businessHours };

  for (const hour of hours) {
    const key = weekdayKeys[hour.weekday];
    if (!key) continue;
    businessHours[key] = {
      enabled: hour.enabled,
      open: formatTime(hour.open_time),
      close: formatTime(hour.close_time),
    };
  }

  return normalizeSettings({
    version: row.config_version as StoreSettings["version"],
    status: {
      deliveryOpen: row.delivery_open,
      pauseOnlineOrders: row.pause_online_orders,
      closedToday: row.closed_today,
      closedMessage: row.closed_message,
      allowPickup: row.allow_pickup,
      allowDelivery: row.allow_delivery,
      temporaryPause: row.pause_online_orders,
    },
    businessHours,
    delivery: {
      fee: numericToNumber(row.delivery_fee),
      minimumOrder: numericToNumber(row.minimum_order),
      freeAddOnsQuantity: row.free_add_ons_quantity,
    },
    payments: {
      accepted: initialSettings.payments.accepted,
      pixKey: row.pix_key,
      note: row.payment_note,
    },
    site: {
      headline: row.headline,
      subtitle: row.subtitle,
      whatsapp: row.whatsapp,
      address: row.address,
      instagram: row.instagram,
      displayedHours: row.displayed_hours,
    },
  });
}

export function mapPublicStoreSettingsFromDatabase(row: DatabasePublicStoreSettings, hours: DatabaseBusinessHour[] = []): StoreSettings {
  return mapStoreSettingsFromDatabase({
    id: true,
    delivery_open: row.delivery_open,
    pause_online_orders: row.pause_online_orders,
    closed_today: row.closed_today,
    closed_message: row.closed_message,
    allow_pickup: row.allow_pickup,
    allow_delivery: row.allow_delivery,
    delivery_fee: row.delivery_fee,
    minimum_order: row.minimum_order,
    free_add_ons_quantity: initialSettings.delivery.freeAddOnsQuantity,
    pix_key: "",
    payment_note: "",
    whatsapp: row.whatsapp,
    instagram: row.instagram,
    address: row.address,
    headline: row.headline,
    subtitle: row.subtitle,
    displayed_hours: row.displayed_hours,
    config_version: row.config_version,
    created_at: row.updated_at,
    updated_at: row.updated_at,
  }, hours);
}

export function mapStoreSettingsUpdateToDatabase(settings: StoreSettings): DatabaseStoreSettingsInsert {
  return {
    id: true,
    delivery_open: settings.status.deliveryOpen,
    pause_online_orders: settings.status.pauseOnlineOrders || settings.status.temporaryPause,
    closed_today: settings.status.closedToday,
    closed_message: settings.status.closedMessage,
    allow_pickup: settings.status.allowPickup,
    allow_delivery: settings.status.allowDelivery,
    delivery_fee: moneyToDatabase(settings.delivery.fee),
    minimum_order: moneyToDatabase(settings.delivery.minimumOrder),
    free_add_ons_quantity: Math.max(0, Math.floor(settings.delivery.freeAddOnsQuantity)),
    pix_key: settings.payments.pixKey,
    payment_note: settings.payments.note,
    whatsapp: settings.site.whatsapp,
    instagram: settings.site.instagram,
    address: settings.site.address,
    headline: settings.site.headline,
    subtitle: settings.site.subtitle,
    displayed_hours: settings.site.displayedHours,
    config_version: settings.version,
  };
}

export function mapBusinessHoursToDatabase(settings: StoreSettings): DatabaseBusinessHourInsert[] {
  return weekdayKeys.map((key, weekday) => ({
    weekday,
    enabled: settings.businessHours[key].enabled,
    open_time: settings.businessHours[key].open,
    close_time: settings.businessHours[key].close,
  }));
}

function formatTime(value: string): string {
  return value.slice(0, 5);
}
