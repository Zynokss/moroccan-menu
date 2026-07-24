'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/app/lib/supabase';
import { saveClientOrder } from '@/app/lib/orderStorage';
import Link from 'next/link';

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

export default function OrderStatusPage() {
  const params = useParams();
  const orderId = params?.id as string;

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchOrder = async () => {
    if (!orderId) return;

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
        .eq('id', orderId)
        .single();

      if (error) console.error('Error fetching order:', error);
      if (data) {
        setOrder(data as unknown as Order);
        // Automatically save order ID to client local storage
        saveClientOrder(orderId);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrder();

    // Listen for real-time status updates on THIS specific order
    const channel = supabase
      .channel(`order-status-${orderId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${orderId}`,
        },
        () => {
          fetchOrder();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orderId]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-white">
        <p className="text-sm font-medium animate-pulse text-zinc-400">جاري تحميل حالة الطلب...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 p-8 flex flex-col items-center justify-center text-center" dir="rtl">
        <h1 className="text-xl font-bold text-red-400 mb-2">لم يتم العثور على الطلب</h1>
        <p className="text-zinc-400 text-xs mb-6">تأكد من اختيار رابط صحيح أو تقديم طلب جديد.</p>
        <Link
          href="/"
          className="bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold px-6 py-2.5 rounded-xl transition-colors text-xs"
        >
          العودة للقائمة الرئيسية
        </Link>
      </div>
    );
  }

  // Progress tracker steps in Arabic
  const steps = [
    { key: 'pending', label: 'تم إرسال الطلب 📩', desc: 'في انتظار استلام المطبخ' },
    { key: 'preparing', label: 'جاري التحضير 👨‍🍳', desc: 'الطباخ يحضر وجبتك الآن' },
    { key: 'ready', label: 'الطلب جاهز! 🎉', desc: 'في طريقه إلى طاولتك' },
  ];

  const getStepIndex = (status: Order['status']) => {
    switch (status) {
      case 'pending':
        return 0;
      case 'preparing':
        return 1;
      case 'ready':
      case 'completed':
        return 2;
      default:
        return 0;
    }
  };

  const currentStep = getStepIndex(order.status);

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-4 sm:p-8 max-w-lg mx-auto" dir="rtl">
      <header className="mb-6 text-center border-b border-zinc-800 pb-5">
        <span className="text-xs font-bold text-amber-500 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
          طاولة #{order.table_number}
        </span>
        <h1 className="text-2xl font-black text-white mt-3">
          متابعة الطلب مباشر
        </h1>
        <p className="text-zinc-500 text-[11px] mt-1 font-mono">
          رقم الطلب: #{order.id.slice(0, 8)}
        </p>
      </header>

      {/* Progress Timeline */}
      {order.status === 'cancelled' ? (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-2xl text-center mb-6">
          <p className="font-bold text-sm">تم إلغاء هذا الطلب ❌</p>
          <p className="text-xs mt-1 text-red-300">
            يرجى الاستفسار من أحد العاملين بالمطعم.
          </p>
        </div>
      ) : (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 mb-6 shadow-xl">
          <div className="space-y-5">
            {steps.map((step, idx) => {
              const isDone = idx < currentStep;
              const isCurrent = idx === currentStep;

              return (
                <div key={step.key} className="flex items-start space-x-3 space-x-reverse">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                        isDone
                          ? 'bg-emerald-500 text-zinc-950'
                          : isCurrent
                          ? 'bg-amber-500 text-zinc-950 animate-pulse'
                          : 'bg-zinc-800 text-zinc-500 border border-zinc-700'
                      }`}
                    >
                      {isDone ? '✓' : idx + 1}
                    </div>
                    {idx < steps.length - 1 && (
                      <div
                        className={`w-0.5 h-6 my-1 ${
                          idx < currentStep ? 'bg-emerald-500' : 'bg-zinc-800'
                        }`}
                      />
                    )}
                  </div>
                  <div className="pt-0.5">
                    <p
                      className={`font-bold text-sm ${
                        isCurrent
                          ? 'text-amber-400'
                          : isDone
                          ? 'text-emerald-400'
                          : 'text-zinc-500'
                      }`}
                    >
                      {step.label}
                    </p>
                    <p className="text-[11px] text-zinc-400 mt-0.5">{step.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Order Items Summary */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 mb-6 shadow-sm">
        <h2 className="text-sm font-bold text-white mb-3 border-b border-zinc-800 pb-2">
          تفاصيل الوجبات المطلوبة:
        </h2>
        <div className="space-y-2 mb-3">
          {order.order_items?.map((item) => (
            <div
              key={item.id}
              className="flex justify-between items-center text-xs bg-zinc-950 p-2.5 rounded-xl border border-zinc-800/50"
            >
              <span className="text-zinc-200">
                <span className="text-amber-500 font-bold ml-2">
                  {item.quantity}x
                </span>
                {item.menu_items?.name || 'وجبة'}
              </span>
              <span className="text-zinc-400 font-mono">
                {(item.unit_price * item.quantity).toFixed(2)} د.م
              </span>
            </div>
          ))}
        </div>

        <div className="border-t border-zinc-800 pt-3 flex justify-between items-center font-bold">
          <span className="text-zinc-400 text-xs">المجموع الإجمالي:</span>
          <span className="text-amber-500 text-base">
            {order.total_amount.toFixed(2)} د.م
          </span>
        </div>
      </div>

      <div className="flex justify-between items-center text-xs">
        <Link
          href="/"
          className="text-amber-500 hover:underline font-bold"
        >
          ← طلب المزيد من الوجبات
        </Link>
        <Link
          href="/orders"
          className="text-zinc-400 hover:text-white"
        >
          جميع طلباتي ⏳
        </Link>
      </div>
    </main>
  );
}