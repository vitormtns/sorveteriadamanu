import type { OrderStatus } from "@/lib/types";

export const ORDER_REFRESH_DEBOUNCE_MS = 250;
export const TRACKING_POLL_INTERVAL_MS = 15_000;

export function isFinalOrderStatus(status: OrderStatus): boolean {
  return status === "delivered" || status === "canceled";
}

export function shouldPollTracking(status: OrderStatus | undefined, isVisible: boolean, requestInFlight: boolean): boolean {
  if (!status) return false;
  return !isFinalOrderStatus(status) && isVisible && !requestInFlight;
}

export function shouldRefreshForOrderEvent(eventType: "INSERT" | "UPDATE" | "DELETE"): boolean {
  return eventType === "INSERT" || eventType === "UPDATE";
}
