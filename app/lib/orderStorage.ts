const STORAGE_KEY = 'bin_diyan_client_orders';

export function saveClientOrder(orderId: string): void {
  if (typeof window === 'undefined') return;

  try {
    const existing = getClientOrders();
    if (!existing.includes(orderId)) {
      const updated = [orderId, ...existing];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    }
  } catch (error) {
    console.error('Failed to save order to localStorage:', error);
  }
}

export function getClientOrders(): string[] {
  if (typeof window === 'undefined') return [];

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Failed to read orders from localStorage:', error);
    return [];
  }
}
