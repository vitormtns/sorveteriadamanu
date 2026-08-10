import { OrderStatus, PaymentStatus } from "./types";

const STORE_TIME_ZONE = "America/Sao_Paulo";

export const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

export const formatTime = (date: string) =>
  new Intl.DateTimeFormat("pt-BR", { timeZone: STORE_TIME_ZONE, hour: "2-digit", minute: "2-digit" }).format(new Date(date));

export const formatDateTime = (date: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: STORE_TIME_ZONE,
  }).format(new Date(date));

export const formatDate = (date: string | Date) =>
  new Intl.DateTimeFormat("pt-BR", { timeZone: STORE_TIME_ZONE, day: "2-digit", month: "long", year: "numeric" }).format(new Date(date));

export const toDateInput = (date: Date) => {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: STORE_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  const values = Object.fromEntries(parts.filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
};

export const isSameDay = (date: string, reference: Date) =>
  toDateInput(new Date(date)) === toDateInput(reference);

export const isToday = (date: string) => isSameDay(date, new Date());

export const paymentStatusLabel: Record<PaymentStatus, string> = {
  pending: "Pendente",
  paid: "Pago",
};

export const orderStatusLabel: Record<OrderStatus, string> = {
  new: "Novo",
  preparing: "Em preparo",
  ready: "Pronto",
  delivered: "Entregue",
  canceled: "Cancelado",
};

export const uid = () => crypto.randomUUID();
