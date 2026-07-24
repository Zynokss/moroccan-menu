const LOCAL_STORAGE_KEY = 'client_active_orders';

export function saveClientOrder(orderId: string) {
  if (typeof window === 'undefined') return;
  const existing = getClientOrders();
  if (!existing.includes(orderId)) {
    const updated = [orderId, ...existing];
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
  }
}

export function getClientOrders(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(LOCAL_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}
