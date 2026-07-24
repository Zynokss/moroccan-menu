'use client';

import { useEffect, useState } from 'react';
import { getClientOrders } from '@/app/lib/orderStorage';
import { supabase } from '@/app/lib/supabase';
import Link from 'next/link';

interface Order {
  id: string;
  table_number: string;
  total_amount: number;
  status: 'pending' | 'preparing' | 'ready' | 'completed' | 'cancelled';
  created_at: string;
}

const STATUS_LABELS: Record<Order['status'], { label: string; color: string }> = {
  pending: { label: 'في انتظار المطبخ 📩', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  preparing: { label: 'جاري التحضير 👨‍🍳', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  ready: { label: 'جاهز للتقديم! 🎉', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  completed: { label: 'مكتمل ✓', color: 'bg-zinc-800 text-zinc-400 border-zinc-700' },
  cancelled: { label: 'ملغى ❌', color: 'bg-red-500/10 text-red-400 border-red-500/20' },
};

export default function ClientOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSavedOrders() {
      const savedIds = getClientOrders();

      if (savedIds.length === 0) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('orders')
          .select('id, table_number, total_amount, status, created_at')
          .in('id', savedIds)
          .order('created_at', { ascending: false });

        if (error) console.error('Error fetching orders:', error);
        if (data) setOrders(data as Order[]);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    fetchSavedOrders();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-white">
        <p className="text-xs font-medium animate-pulse text-zinc-400">جاري تحميل طلباتك...</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-4 sm:p-8 max-w-lg mx-auto" dir="rtl">
      <header className="mb-6 flex items-center justify-between border-b border-zinc-800 pb-4">
        <div>
          <h1 className="text-xl font-black text-white">طلباتي الجارية</h1>
          <p className="text-xs text-zinc-500 mt-0.5">شواية بن ديان</p>
        </div>
        <Link
          href="/"
          className="text-xs font-bold bg-amber-500 text-zinc-950 px-3.5 py-2 rounded-xl hover:bg-amber-400 transition-colors"
        >
          + طلب جديد
        </Link>
      </header>

      {orders.length === 0 ? (
        <div className="text-center py-16 bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
          <p className="text-3xl mb-2">🛒</p>
          <h2 className="text-sm font-bold text-zinc-300">لا توجد طلبات مسجلة</h2>
          <p className="text-xs text-zinc-500 mt-1 mb-6">لم تقم بإرسال أي طلب من هذا المتصفح بعد.</p>
          <Link
            href="/"
            className="inline-block text-xs font-bold text-amber-400 hover:underline"
          >
            تصفح القائمة والطلب الآن ←
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => {
            const statusInfo = STATUS_LABELS[order.status] || STATUS_LABELS.pending;

            return (
              <Link
                key={order.id}
                href={`/order/${order.id}`}
                className="block bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-2xl p-4 transition-all hover:shadow-lg"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-amber-500 font-mono">
                    طاولة #{order.table_number}
                  </span>
                  <span
                    className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${statusInfo.color}`}
                  >
                    {statusInfo.label}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs text-zinc-400 mt-3 pt-2 border-t border-zinc-800/60">
                  <span className="font-mono text-[10px] text-zinc-500">
                    #{order.id.slice(0, 8)}
                  </span>
                  <span className="font-extrabold text-amber-400 text-sm">
                    {order.total_amount.toFixed(2)} د.م
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}
