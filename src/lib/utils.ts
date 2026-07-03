import { OrderStatus } from "./types";

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

export const isToday = (date: string) => new Date(date).toDateString() === new Date().toDateString();

export const statusLabel: Record<OrderStatus, string> = {
  pending_payment: "Pendente",
  paid: "Pago",
  canceled: "Cancelado",
};

export const uid = () => crypto.randomUUID();
