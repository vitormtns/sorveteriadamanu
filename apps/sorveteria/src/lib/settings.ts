import { DeliveryBuilderOption, PaymentMethod, StoreSettings, WeekdayKey } from "./types";

const standardHours = { enabled: true, open: "12:00", close: "22:00" };

export const weekdayLabels: Record<WeekdayKey, string> = {
  sunday: "Domingo",
  monday: "Segunda-feira",
  tuesday: "Terça-feira",
  wednesday: "Quarta-feira",
  thursday: "Quinta-feira",
  friday: "Sexta-feira",
  saturday: "Sábado",
};

export const weekdayOrder: WeekdayKey[] = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

export const initialSettings: StoreSettings = {
  version: 1,
  status: {
    deliveryOpen: true,
    pauseOnlineOrders: false,
    closedMessage: "No momento, estamos fechados. Volte a pedir durante nosso horário de atendimento.",
    allowPickup: true,
    allowDelivery: true,
    closedToday: false,
    temporaryPause: false,
  },
  businessHours: {
    sunday: { ...standardHours },
    monday: { ...standardHours },
    tuesday: { ...standardHours },
    wednesday: { ...standardHours },
    thursday: { ...standardHours },
    friday: { ...standardHours },
    saturday: { ...standardHours },
  },
  delivery: {
    fee: 5,
    minimumOrder: 0,
    freeAddOnsQuantity: 3,
  },
  payments: {
    accepted: {
      Pix: true,
      Dinheiro: true,
      Cartão: true,
      "A combinar": true,
    },
    pixKey: "",
    note: "",
  },
  promotions: [
    {
      id: "promo-acai",
      title: "Açaí 300 ml especial",
      description: "Açaí, banana, granola e leite condensado",
      price: 16.9,
      active: true,
      featuredOnHome: true,
    },
    {
      id: "promo-casal",
      title: "Combo casal",
      description: "2 açaís de 500 ml com 3 adicionais cada",
      price: 36.9,
      active: true,
      featuredOnHome: false,
    },
  ],
  acaiExtras: [
    { id: "extra-leite-condensado", name: "Leite condensado", available: true, extraPrice: 2 },
    { id: "extra-leite-po", name: "Leite em pó", available: true, extraPrice: 2 },
    { id: "extra-granola", name: "Granola", available: true, extraPrice: 2 },
    { id: "extra-banana", name: "Banana", available: true, extraPrice: 2 },
    { id: "extra-morango", name: "Morango", available: true, extraPrice: 3 },
    { id: "extra-pacoca", name: "Paçoca", available: true, extraPrice: 2 },
    { id: "extra-amendoim", name: "Amendoim", available: true, extraPrice: 2 },
    { id: "extra-nutella", name: "Nutella", available: true, extraPrice: 3 },
  ],
  iceCreamFlavors: [
    { id: "sabor-chocolate", name: "Chocolate", available: true, previewColor: "#6b3528" },
    { id: "sabor-morango", name: "Morango", available: true, previewColor: "#e67b91" },
    { id: "sabor-creme", name: "Creme", available: true, previewColor: "#f5dca6" },
    { id: "sabor-flocos", name: "Flocos", available: true, previewColor: "#e8dfd1" },
    { id: "sabor-napolitano", name: "Napolitano", available: true, previewColor: "#d99887" },
    { id: "sabor-acai", name: "Açaí", available: true, previewColor: "#4b164f" },
  ],
  milkshakeFlavors: [
    { id: "shake-chocolate", name: "Chocolate", available: true, previewColor: "#6b3528" },
    { id: "shake-morango", name: "Morango", available: true, previewColor: "#e67b91" },
    { id: "shake-ovomaltine", name: "Ovomaltine", available: true, previewColor: "#8c5b32" },
    { id: "shake-leite-ninho", name: "Leite Ninho", available: true, previewColor: "#f2e5c6" },
    { id: "shake-acai", name: "Açaí", available: true, previewColor: "#4b164f" },
    { id: "shake-creme", name: "Creme", available: true, previewColor: "#d9b873" },
  ],
  site: {
    headline: "Monte, peça e aproveite.",
    subtitle: "Açaí, sorvetes e milk-shakes preparados para retirada ou delivery.",
    whatsapp: "",
    address: "",
    instagram: "",
    displayedHours: "Todos os dias, das 12h às 22h",
  },
};

export const paymentLabels: Record<PaymentMethod, string> = {
  Pix: "Pix",
  Dinheiro: "Dinheiro",
  Cartão: "Cartão",
  "A combinar": "A combinar",
};

// Dados exclusivos do modo de demonstração quando o Supabase não está configurado.
const demoDeliveryBuilderOptions: Array<[DeliveryBuilderOption["builderType"], DeliveryBuilderOption["optionType"], string, string, number, number | undefined]> = [
  ["acai", "size", "300ml", "300 ml", 14, undefined], ["acai", "size", "500ml", "500 ml", 19, undefined], ["acai", "size", "700ml", "700 ml", 25, undefined], ["acai", "size", "1l", "1 litro", 34, undefined],
  ["ice_cream", "format", "cup", "Copo", 0, undefined], ["ice_cream", "format", "cone", "Casquinha", 0, undefined],
  ["ice_cream", "scoop", "one", "1 bola", 7, 1], ["ice_cream", "scoop", "two", "2 bolas", 12, 2], ["ice_cream", "scoop", "three", "3 bolas", 16, 3],
  ["ice_cream", "topping", "chocolate", "Chocolate", 0, undefined], ["ice_cream", "topping", "strawberry", "Morango", 0, undefined], ["ice_cream", "topping", "condensed-milk", "Leite condensado", 0, undefined], ["ice_cream", "topping", "sprinkles", "Granulado", 0, undefined], ["ice_cream", "topping", "none", "Sem cobertura", 0, undefined],
  ["milkshake", "size", "300ml", "300 ml", 12, undefined], ["milkshake", "size", "500ml", "500 ml", 17, undefined], ["milkshake", "size", "700ml", "700 ml", 22, undefined],
];

export const initialDeliveryBuilderOptions: DeliveryBuilderOption[] = demoDeliveryBuilderOptions.map(([builderType, optionType, code, name, price, maxFlavors], index) => ({
  id: `demo-builder-${code}-${index}`,
  builderType,
  optionType,
  code,
  name,
  price,
  maxFlavors,
  active: true,
  available: true,
  displayOrder: index + 1,
  createdAt: "",
  updatedAt: "",
}));

export function normalizeSettings(saved?: Partial<StoreSettings> | null): StoreSettings {
  if (!saved) return initialSettings;
  const site = { ...initialSettings.site, ...saved.site };
  if (site.whatsapp === "(00) 00000-0000") site.whatsapp = "";
  if (site.address === "Endereço em atualização") site.address = "";
  if (site.displayedHours === "Consulte o horário do dia") site.displayedHours = initialSettings.site.displayedHours;
  const savedAccepted = saved.payments?.accepted as Partial<Record<PaymentMethod | "Fiado/Outro", boolean>> | undefined;
  const accepted = {
    ...initialSettings.payments.accepted,
    ...savedAccepted,
  };
  if (typeof savedAccepted?.["Fiado/Outro"] === "boolean") {
    accepted["A combinar"] = savedAccepted["Fiado/Outro"];
  }
  delete (accepted as Partial<Record<"Fiado/Outro", boolean>>)["Fiado/Outro"];

  return {
    ...initialSettings,
    ...saved,
    version: 1,
    status: { ...initialSettings.status, ...saved.status },
    businessHours: Object.fromEntries(
      Object.entries(initialSettings.businessHours).map(([key, value]) => [
        key,
        { ...value, ...saved.businessHours?.[key as WeekdayKey] },
      ]),
    ) as StoreSettings["businessHours"],
    delivery: {
      fee: Math.max(0, Number(saved.delivery?.fee ?? initialSettings.delivery.fee) || 0),
      minimumOrder: Math.max(0, Number(saved.delivery?.minimumOrder ?? initialSettings.delivery.minimumOrder) || 0),
      freeAddOnsQuantity: Math.max(0, Math.floor(Number(saved.delivery?.freeAddOnsQuantity ?? initialSettings.delivery.freeAddOnsQuantity) || 0)),
    },
    payments: {
      ...initialSettings.payments,
      ...saved.payments,
      accepted,
    },
    promotions: saved.promotions ?? initialSettings.promotions,
    acaiExtras: saved.acaiExtras ?? initialSettings.acaiExtras,
    iceCreamFlavors: saved.iceCreamFlavors ?? initialSettings.iceCreamFlavors,
    milkshakeFlavors: saved.milkshakeFlavors ?? initialSettings.milkshakeFlavors,
    site,
  };
}

export function getStoreAvailability(settings: StoreSettings, now = new Date()) {
  const keys = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"] as WeekdayKey[];
  const key = keys[now.getDay()];
  const previousKey = keys[(now.getDay() + 6) % 7];
  const hours = settings.businessHours[key];
  const previousHours = settings.businessHours[previousKey];
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const toMinutes = (value: string) => {
    const [hour, minute] = value.split(":").map(Number);
    return hour * 60 + minute;
  };
  const isWithinStartingDay = (schedule: typeof hours) => {
    if (!schedule.enabled) return false;
    const open = toMinutes(schedule.open);
    const close = toMinutes(schedule.close);
    return close >= open
      ? currentMinutes >= open && currentMinutes <= close
      : currentMinutes >= open;
  };
  const isWithinPreviousNight = (schedule: typeof hours) => {
    if (!schedule.enabled) return false;
    const open = toMinutes(schedule.open);
    const close = toMinutes(schedule.close);
    return close < open && currentMinutes <= close;
  };
  const withinToday = isWithinStartingDay(hours);
  const withinPreviousNight = isWithinPreviousNight(previousHours);
  const withinHours = withinToday || withinPreviousNight;
  const activeHours = withinPreviousNight ? previousHours : hours;
  const closedMessage = settings.status.closedMessage.trim() || "No momento, não estamos recebendo pedidos online.";
  const hasFulfillment = settings.status.allowDelivery || settings.status.allowPickup;
  const manuallyUnavailable = !settings.status.deliveryOpen
    || settings.status.pauseOnlineOrders
    || settings.status.closedToday
    || settings.status.temporaryPause;
  const acceptingOrders = !manuallyUnavailable && withinHours && hasFulfillment;
  const scheduledMessage = hours.enabled
    ? `${closedMessage} Horário de hoje: ${hours.open} às ${hours.close}.`
    : `${closedMessage} Hoje não teremos atendimento.`;
  const message = acceptingOrders
    ? `Delivery aberto até ${activeHours.close}.`
    : manuallyUnavailable
      ? closedMessage
      : !hasFulfillment
        ? "Retirada e entrega estão indisponíveis no momento."
        : scheduledMessage;

  return {
    acceptingOrders,
    withinHours,
    todayLabel: weekdayLabels[key],
    todayHours: hours.enabled ? `${hours.open} às ${hours.close}` : "Fechado",
    message,
  };
}
