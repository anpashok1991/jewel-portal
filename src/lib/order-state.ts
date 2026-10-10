import { CUSTOMER_CANCELLABLE, ORDER_TRANSITIONS, type OrderStatus } from "./constants";

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return (ORDER_TRANSITIONS[from] ?? []).includes(to);
}

export function assertTransition(from: OrderStatus, to: OrderStatus): void {
  if (!canTransition(from, to)) {
    throw new Error(`Illegal order transition ${from} → ${to}`);
  }
}

export function customerCanCancel(status: string): boolean {
  return CUSTOMER_CANCELLABLE.includes(status as OrderStatus);
}

export function statusLabel(status: string): string {
  return status
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
