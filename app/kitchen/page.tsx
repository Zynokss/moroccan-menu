'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/app/lib/supabase';
import PinGate from '../components/PinGate';

interface OrderItem {
  id: string;
  quantity: number;
  unit_price: number;
  menu_items: {
    name: string;
  } | null;
}

interface Order {
  id: string;
  table_number: string;
  customer_name: string | null;
  notes: string | null;
  total_amount: number;
  status: 'pending' | 'preparing' | 'ready' | 'completed' | 'cancelled';
  created_at: string;
  order_items: OrderItem[];
}

export default function KitchenDashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            id,
            quantity,
            unit_price,
            menu_items ( name )
          )
        `)
        .order('created_at', { ascending: false });

      if (error) console.error('Error fetching orders:', error);
      if (data) setOrders(data as unknown as Order[]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();

    const channel = supabase
      .channel('realtime-kitchen-orders')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => {
          fetchOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const updateStatus = async (orderId: string, newStatus: Order['status']) => {
    const { error } = await supabase
      .from('orders')
      .update({ status: newStatus })
      .eq('id', orderId);

    if (error) {
      console.error('Failed to update status:', error);
    } else {
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
      );
    }
  };

  const getStatusInfo = (status: Order['status']) => {
    switch (status) {
      case 'pending':
        return { label: 'جديد 📩', color: 'bg-amber-500/10 text-amber-500 border-amber-500/20' };
      case 'preparing':
        return { label: 'جاري التحضير 👨‍🍳', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' };
      case 'ready':
        return { label: 'جاهز للتقديم 🎉', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' };
      case 'completed':
        return { label: 'مكتمل ✓', color: 'bg-zinc-800 text-zinc-400 border-zinc-700' };
      case 'cancelled':
        return { label: 'ملغى ❌', color: 'bg-red-500/10 text-red-400 border-red-500/20' };
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-white">
        <p className="text-lg font-medium animate-pulse">جاري تحميل شاشة المطبخ...</p>
      </div>
    );
  }

  const activeOrders = orders.filter(
    (o) => o.status !== 'completed' && o.status !== 'cancelled'
  );

  return (
    <PinGate title="شاشة المطبخ" requiredPin={process.env.NEXT_PUBLIC_KITCHEN_PIN}>
      <main className="min-h-screen bg-zinc-950 text-zinc-100 p-4 sm:p-8 max-w-7xl mx-auto" dir="rtl">
        <header className="mb-8 flex justify-between items-center border-b border-zinc-800 pb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-amber-500">
              شاشة المطبخ
            </h1>
            <p className="text-zinc-400 text-sm mt-1">
              الطلبات المباشرة ({activeOrders.length} نشطة)
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 bg-emerald-500 rounded-full animate-ping"></span>
            <span className="text-xs font-semibold text-emerald-400 tracking-wider">
              مباشر (Live)
            </span>
          </div>
        </header>

        {activeOrders.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-zinc-800 rounded-2xl">
            <p className="text-zinc-500 text-lg">لا توجد طلبات نشطة حالياً.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {activeOrders.map((order) => {
              const statusInfo = getStatusInfo(order.status);

              return (
                <div
                  key={order.id}
                  className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between"
                >
                  <div>
                    {/* Header: Table & Status */}
                    <div className="flex justify-between items-start mb-4 pb-3 border-b border-zinc-800">
                      <div>
                        <h2 className="text-2xl font-bold text-white">
                          طاولة #{order.table_number}
                        </h2>
                        {order.customer_name && (
                          <p className="text-zinc-400 text-xs mt-0.5">
                            الزبون: {order.customer_name}
                          </p>
                        )}
                      </div>
                      <span
                        className={`text-xs font-bold px-3 py-1 rounded-full border ${statusInfo.color}`}
                      >
                        {statusInfo.label}
                      </span>
                    </div>

                    {/* Line Items */}
                    <div className="space-y-3 mb-6">
                      {order.order_items?.map((item) => (
                        <div
                          key={item.id}
                          className="flex justify-between items-center text-sm"
                        >
                          <span className="font-semibold text-white">
                            <span className="text-amber-500 ml-2 font-bold">
                              {item.quantity}x
                            </span>
                            {item.menu_items?.name || 'وجبة'}
                          </span>
                          <span className="text-zinc-400 text-xs font-mono">
                            {(item.unit_price * item.quantity).toFixed(2)} د.م
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Notes if present */}
                    {order.notes && (
                      <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-3 mb-6">
                        <p className="text-amber-400 text-xs font-semibold mb-1">
                          ملاحظة:
                        </p>
                        <p className="text-zinc-300 text-sm italic">
                          "{order.notes}"
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-4 border-t border-zinc-800 space-y-2">
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-xs text-zinc-500 font-mono">
                        {new Date(order.created_at).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      <span className="font-bold text-amber-500">
                        {order.total_amount.toFixed(2)} د.م
                      </span>
                    </div>

                    <div className="grid grid-cols-1 gap-2">
                      {order.status === 'pending' && (
                        <button
                          onClick={() => updateStatus(order.id, 'preparing')}
                          className="bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors"
                        >
                          بدء التحضير
                        </button>
                      )}

                      {order.status === 'preparing' && (
                        <button
                          onClick={() => updateStatus(order.id, 'ready')}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors"
                        >
                          تحديد كـ "جاهز"
                        </button>
                      )}

                      {order.status === 'ready' && (
                        <button
                          onClick={() => updateStatus(order.id, 'completed')}
                          className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold py-2.5 rounded-xl text-sm transition-colors"
                        >
                          إنهاء وأرشفة الطلب
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </PinGate>
  );
}