import { PaymentMethod, StoreSettings, WeekdayKey } from "./types";

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
    note: "Consulte a disponibilidade para o seu bairro.",
  },
  payments: {
    accepted: {
      Pix: true,
      Dinheiro: true,
      Cartão: true,
      "Fiado/Outro": true,
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
    whatsapp: "(00) 00000-0000",
    address: "Endereço em atualização",
    instagram: "@sorveteriadamanu",
    displayedHours: "Consulte o horário do dia",
  },
};

export const paymentLabels: Record<PaymentMethod, string> = {
  Pix: "Pix",
  Dinheiro: "Dinheiro",
  Cartão: "Cartão",
  "Fiado/Outro": "A combinar",
};

export function normalizeSettings(saved?: Partial<StoreSettings> | null): StoreSettings {
  if (!saved) return initialSettings;
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
    delivery: { ...initialSettings.delivery, ...saved.delivery },
    payments: {
      ...initialSettings.payments,
      ...saved.payments,
      accepted: { ...initialSettings.payments.accepted, ...saved.payments?.accepted },
    },
    promotions: saved.promotions ?? initialSettings.promotions,
    acaiExtras: saved.acaiExtras ?? initialSettings.acaiExtras,
    iceCreamFlavors: saved.iceCreamFlavors ?? initialSettings.iceCreamFlavors,
    milkshakeFlavors: saved.milkshakeFlavors ?? initialSettings.milkshakeFlavors,
    site: { ...initialSettings.site, ...saved.site },
  };
}

export function getStoreAvailability(settings: StoreSettings, now = new Date()) {
  const key = (["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"] as WeekdayKey[])[now.getDay()];
  const hours = settings.businessHours[key];
  const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const withinHours = hours.enabled && currentTime >= hours.open && currentTime <= hours.close;
  const manuallyUnavailable = !settings.status.deliveryOpen
    || settings.status.pauseOnlineOrders
    || settings.status.closedToday
    || settings.status.temporaryPause;
  const acceptingOrders = !manuallyUnavailable
    && withinHours
    && (settings.status.allowDelivery || settings.status.allowPickup);

  return {
    acceptingOrders,
    withinHours,
    todayLabel: weekdayLabels[key],
    todayHours: hours.enabled ? `${hours.open} às ${hours.close}` : "Fechado",
    message: acceptingOrders
      ? `Delivery aberto hoje, das ${hours.open} às ${hours.close}.`
      : settings.status.closedMessage,
  };
}
