import { OrderStatus, PaymentStatus } from "./types";

export const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

export const formatTime = (date: string) =>
  new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(new Date(date));

export const formatDateTime = (date: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));

export const formatDate = (date: string | Date) =>
  new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "long", year: "numeric" }).format(new Date(date));

export const toDateInput = (date: Date) => {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
};

export const isSameDay = (date: string, reference: Date) =>
  new Date(date).toDateString() === reference.toDateString();

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
