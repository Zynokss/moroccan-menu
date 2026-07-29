'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/app/lib/supabase';
import PinGate from '../../components/PinGate';

interface MenuItem {
  id: string;
  name: string;
  price: number;
  category: string;
}

interface ActiveOrderItem {
  menu_item_id: string;
  name: string;
  quantity: number;
  unit_price: number;
}

interface ActiveOrder {
  id: string;
  table_number: string;
  customer_name: string | null;
  notes: string | null;
  total_amount: number;
  status: string;
  created_at: string;
  order_items: {
    id: string;
    quantity: number;
    unit_price: number;
    menu_item_id: string;
    menu_items: { name: string } | null;
  }[];
}

interface ProcessedOrderRecord {
  id: string;
  table_number: string;
  customer_name: string | null;
  total_amount: number;
  created_at: string;
  order_items: {
    quantity: number;
    unit_price: number;
    menu_items: { name: string } | null;
  }[];
}

export default function POSCheckoutPage() {
  const [activeOrders, setActiveOrders] = useState<ActiveOrder[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<ActiveOrder | null>(null);
  const [billItems, setBillItems] = useState<ActiveOrderItem[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('الكل');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card'>('cash');
  const [walkInLabel, setWalkInLabel] = useState('طلب مباشر / سفري');
  const [isSettling, setIsSettling] = useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  
  // History Modal States
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [historyOrders, setHistoryOrders] = useState<ProcessedOrderRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Thermal Print Target Data
  const [receiptData, setReceiptData] = useState<{
    orderId: string;
    table: string;
    items: ActiveOrderItem[];
    total: number;
    date: string;
  } | null>(null);

  useEffect(() => {
    document.title = 'شواية بن ديبان | الكاسير (POS)';
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    const { data: ordersData } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (
          id,
          quantity,
          unit_price,
          menu_item_id,
          menu_items ( name )
        )
      `)
      .neq('status', 'completed')
      .neq('status', 'cancelled')
      .order('created_at', { ascending: false });

    if (ordersData) setActiveOrders(ordersData as unknown as ActiveOrder[]);

    const { data: menuData } = await supabase
      .from('menu_items')
      .select('id, name, price, category')
      .eq('is_available', true);

    if (menuData) {
      setMenuItems(menuData);
      setCategories(['الكل', ...Array.from(new Set(menuData.map((m) => m.category).filter(Boolean)))]);
    }

    setLoading(false);
  };

  // Fetch past completed orders for the history modal
  const fetchOrderHistory = async () => {
    setLoadingHistory(true);
    const { data, error } = await supabase
      .from('orders')
      .select(`
        id,
        table_number,
        customer_name,
        total_amount,
        created_at,
        order_items (
          quantity,
          unit_price,
          menu_items ( name )
        )
      `)
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(30);

    if (error) console.error('Error fetching history:', error);
    if (data) setHistoryOrders(data as unknown as ProcessedOrderRecord[]);
    setLoadingHistory(false);
  };

  const handleOpenHistory = () => {
    setIsHistoryOpen(true);
    fetchOrderHistory();
  };

  const handleSelectOrder = (order: ActiveOrder) => {
    setSelectedOrder(order);
    const formatted = order.order_items.map((item) => ({
      menu_item_id: item.menu_item_id,
      name: item.menu_items?.name || 'وجبة',
      quantity: item.quantity,
      unit_price: item.unit_price,
    }));
    setBillItems(formatted);
    setIsMobileDrawerOpen(true);
  };

  const handleStartWalkInOrder = () => {
    setSelectedOrder(null);
    setBillItems([]);
  };

  const handleAddItemToBill = (menuItem: MenuItem) => {
    setBillItems((prev) => {
      const existing = prev.find((i) => i.menu_item_id === menuItem.id);
      if (existing) {
        return prev.map((i) =>
          i.menu_item_id === menuItem.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [
        ...prev,
        {
          menu_item_id: menuItem.id,
          name: menuItem.name,
          quantity: 1,
          unit_price: menuItem.price,
        },
      ];
    });
  };

  const updateQuantity = (menuItemId: string, delta: number) => {
    setBillItems((prev) =>
      prev
        .map((item) => {
          if (item.menu_item_id === menuItemId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as ActiveOrderItem[]
    );
  };

  const calculatedTotal = billItems.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);

  // Store in DB FIRST, then trigger window.print()
  const handleSettleAndPrint = async () => {
    if (billItems.length === 0) return;
    setIsSettling(true);

    try {
      let finalOrderId = '';
      let targetTableLabel = selectedOrder ? `طاولة #${selectedOrder.table_number}` : walkInLabel;

      if (selectedOrder) {
        // App Order: Update database status to completed
        const { error } = await supabase
          .from('orders')
          .update({
            status: 'completed',
            total_amount: calculatedTotal,
          })
          .eq('id', selectedOrder.id);

        if (error) throw error;
        finalOrderId = selectedOrder.id.slice(0, 8);
      } else {
        // Walk-in Order: Insert new completed order directly into Supabase
        const { data: newOrder, error: insertError } = await supabase
          .from('orders')
          .insert({
            table_number: walkInLabel,
            customer_name: 'زبون كاسير',
            total_amount: calculatedTotal,
            status: 'completed',
          })
          .select()
          .single();

        if (insertError) throw insertError;

        const orderItemsToInsert = billItems.map((item) => ({
          order_id: newOrder.id,
          menu_item_id: item.menu_item_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
        }));

        await supabase.from('order_items').insert(orderItemsToInsert);
        finalOrderId = newOrder.id.slice(0, 8);
      }

      // Prepare receipt template data
      const printInfo = {
        orderId: finalOrderId,
        table: targetTableLabel,
        items: [...billItems],
        total: calculatedTotal,
        date: new Date().toLocaleString('ar-MA'),
      };

      setReceiptData(printInfo);

      // Clean active panel states
      if (selectedOrder) {
        setActiveOrders((prev) => prev.filter((o) => o.id !== selectedOrder.id));
      }
      setSelectedOrder(null);
      setBillItems([]);
      setIsMobileDrawerOpen(false);

      // Fire print dialog asynchronously (Data is ALREADY safe in Supabase!)
      setTimeout(() => {
        window.print();
      }, 300);
    } catch (err) {
      console.error('Failed to settle bill:', err);
      alert('حدث خطأ أثناء تصفية الحساب.');
    } finally {
      setIsSettling(false);
    }
  };

  // Trigger printing a historical order directly from the history modal
  const handleReprintHistory = (record: ProcessedOrderRecord) => {
    const formattedItems: ActiveOrderItem[] = record.order_items.map((i) => ({
      menu_item_id: '',
      name: i.menu_items?.name || 'وجبة',
      quantity: i.quantity,
      unit_price: i.unit_price,
    }));

    setReceiptData({
      orderId: record.id.slice(0, 8),
      table: record.table_number,
      items: formattedItems,
      total: record.total_amount,
      date: new Date(record.created_at).toLocaleString('ar-MA'),
    });

    setTimeout(() => {
      window.print();
    }, 300);
  };

  const filteredMenuItems = menuItems.filter((item) => {
    const matchesCat = selectedCategory === 'الكل' || item.category === selectedCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-white">
        <p className="animate-pulse font-medium">جاري تحميل نظام الكاسير...</p>
      </div>
    );
  }

  const renderCheckoutContent = () => (
    <div className="flex flex-col justify-between h-full">
      <div>
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <h3 className="font-extrabold text-white text-base">
            {selectedOrder ? `فاتورة طاولة #${selectedOrder.table_number}` : 'طلب مباشر (الكاسير)'}
          </h3>
          <span className="text-xs bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded-full font-bold">
            {billItems.length} عناصر
          </span>
        </div>

        {!selectedOrder && (
          <div className="mt-3">
            <input
              type="text"
              value={walkInLabel}
              onChange={(e) => setWalkInLabel(e.target.value)}
              placeholder="وصف الطلب (مثال: سفري / طاولة 3)"
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
            />
          </div>
        )}

        <div className="mt-4 space-y-2 max-h-60 lg:max-h-64 overflow-y-auto pr-1">
          {billItems.length === 0 ? (
            <p className="text-center text-xs text-zinc-500 py-12">
              اختر وجبة من القائمة لإضافتها للفاتورة
            </p>
          ) : (
            billItems.map((item) => (
              <div
                key={item.menu_item_id}
                className="flex items-center justify-between bg-zinc-950 p-2.5 rounded-xl border border-zinc-800 text-xs"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-white truncate">{item.name}</p>
                  <p className="text-[10px] text-zinc-400 font-mono mt-0.5">
                    {item.unit_price.toFixed(2)} × {item.quantity} = {(item.unit_price * item.quantity).toFixed(2)} د.م
                  </p>
                </div>

                <div className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 rounded-lg p-1">
                  <button
                    type="button"
                    onClick={() => updateQuantity(item.menu_item_id, -1)}
                    className="w-5 h-5 flex items-center justify-center text-amber-400 font-bold bg-zinc-800 rounded hover:bg-amber-500 hover:text-black"
                  >
                    -
                  </button>
                  <span className="w-5 text-center font-bold text-white text-xs">{item.quantity}</span>
                  <button
                    type="button"
                    onClick={() => updateQuantity(item.menu_item_id, 1)}
                    className="w-5 h-5 flex items-center justify-center text-amber-400 font-bold bg-zinc-800 rounded hover:bg-amber-500 hover:text-black"
                  >
                    +
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {billItems.length > 0 && (
          <div className="mt-4 pt-3 border-t border-zinc-800">
            <label className="block text-[11px] font-bold text-zinc-400 mb-1.5">طريقة الدفع</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMethod('cash')}
                className={`py-2 rounded-xl text-xs font-bold border transition-colors ${
                  paymentMethod === 'cash'
                    ? 'bg-amber-500 text-zinc-950 border-amber-500'
                    : 'bg-zinc-950 text-zinc-400 border-zinc-800'
                }`}
              >
                💵 نقداً (Cash)
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('card')}
                className={`py-2 rounded-xl text-xs font-bold border transition-colors ${
                  paymentMethod === 'card'
                    ? 'bg-amber-500 text-zinc-950 border-amber-500'
                    : 'bg-zinc-950 text-zinc-400 border-zinc-800'
                }`}
              >
                💳 بطاقة (Card)
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="pt-4 border-t border-zinc-800 mt-4">
        <div className="flex justify-between items-center mb-3">
          <span className="text-zinc-400 font-bold text-sm">المجموع الكلي:</span>
          <span className="text-2xl font-black text-amber-500">
            {calculatedTotal.toFixed(2)} د.م
          </span>
        </div>

        <button
          type="button"
          onClick={handleSettleAndPrint}
          disabled={isSettling || billItems.length === 0}
          className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-3.5 rounded-xl text-xs transition-all shadow-lg active:scale-95 disabled:opacity-40"
        >
          {isSettling ? 'جاري تصفية الحساب...' : '✅ تصفية الحساب وطباعة الوصل'}
        </button>
      </div>
    </div>
  );

  return (
    <PinGate title="شواية بن ديبان | الكاسير" requiredPin={process.env.NEXT_PUBLIC_KITCHEN_PIN}>
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col justify-between pb-24 lg:pb-0 print:bg-white print:text-black" dir="rtl">
        <main className="p-4 lg:p-6 max-w-[1700px] mx-auto w-full flex-grow space-y-6">
          
          {/* HEADER NAV */}
          <header className="flex flex-wrap items-center justify-between gap-4 bg-zinc-900 border border-zinc-800 p-4 rounded-2xl print:hidden">
            <div className="flex items-center gap-3">
              <Link
                href="/kitchen"
                className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-3.5 py-2 rounded-xl text-xs font-bold transition-colors"
              >
                ← العودة للمطبخ
              </Link>
              <div>
                <h1 className="text-xl font-black text-amber-500 flex items-center gap-2">
                  <span>🏧</span> نظام الكاسير وطباعة الفاتورة (POS)
                </h1>
                <p className="text-xs text-zinc-400 mt-0.5">حساب طاولات التطبيق + طلبات الكاسير المباشرة</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* 📜 HISTORY BUTTON */}
              <button
                onClick={handleOpenHistory}
                className="bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black text-xs px-3.5 py-2 rounded-xl transition-all shadow-md flex items-center gap-1.5"
              >
                <span>📜</span> سجل الطلبات المعالجة
              </button>

              <button
                onClick={fetchInitialData}
                className="bg-zinc-800 hover:bg-zinc-700 text-xs px-3 py-2 rounded-xl text-zinc-300 font-bold"
              >
                🔄 تحديث
              </button>
            </div>
          </header>

          {/* MAIN GRID */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 print:hidden">
            
            {/* LEFT: ACTIVE TABLES + DIRECT ORDER TRIGGER (COL 3) */}
            <section className="lg:col-span-3 space-y-3">
              <button
                type="button"
                onClick={handleStartWalkInOrder}
                className={`w-full p-3.5 rounded-2xl border text-right font-black text-xs transition-all flex items-center justify-between ${
                  selectedOrder === null
                    ? 'bg-amber-500 text-zinc-950 border-amber-500 shadow-lg shadow-amber-500/10'
                    : 'bg-zinc-900 text-zinc-300 border-zinc-800 hover:border-zinc-700'
                }`}
              >
                <span className="flex items-center gap-2">
                  <span>🛍️</span> طلب جديد (مباشر / سفري)
                </span>
                <span className="text-[10px] bg-zinc-950/40 px-2 py-0.5 rounded-md font-mono">جديد +</span>
              </button>

              <div className="pt-2">
                <h3 className="text-xs font-bold text-zinc-400 mb-2">طاولات التطبيق النشطة ({activeOrders.length})</h3>

                {activeOrders.length === 0 ? (
                  <div className="bg-zinc-900/40 border border-dashed border-zinc-800 rounded-2xl p-4 text-center text-zinc-500 text-xs">
                    لا توجد طاولات نشطة
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                    {activeOrders.map((order) => {
                      const isSelected = selectedOrder?.id === order.id;
                      return (
                        <button
                          key={order.id}
                          onClick={() => handleSelectOrder(order)}
                          className={`w-full p-3 rounded-xl border text-right transition-all flex flex-col justify-between ${
                            isSelected
                              ? 'bg-amber-500/10 border-amber-500 text-white'
                              : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700 text-zinc-300'
                          }`}
                        >
                          <div className="flex justify-between items-center w-full">
                            <span className="font-bold text-sm text-white">طاولة #{order.table_number}</span>
                            <span className="text-[10px] bg-zinc-800 px-2 py-0.5 rounded-md font-mono text-amber-400">
                              {order.total_amount.toFixed(2)} د.م
                            </span>
                          </div>
                          {order.customer_name && (
                            <span className="text-[11px] text-zinc-400 mt-1">الزبون: {order.customer_name}</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </section>

            {/* CENTER: MENU SELECTION GRID FOR DIRECT ORDERS / ADD-ONS (COL 5) */}
            <section className="lg:col-span-5 bg-zinc-900 border border-zinc-800 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
                <h3 className="font-bold text-white text-sm">قائمة الوجبات (تحديد مباشر) 🥩</h3>
                <input
                  type="text"
                  placeholder="ابحث عن وجبة..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-1 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500 w-36 sm:w-48"
                />
              </div>

              {/* Category Pills */}
              <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                {categories.map((c) => (
                  <button
                    key={c}
                    onClick={() => setSelectedCategory(c)}
                    className={`px-3 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${
                      selectedCategory === c
                        ? 'bg-amber-500 text-zinc-950'
                        : 'bg-zinc-950 text-zinc-400 hover:text-white border border-zinc-800'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>

              {/* Items Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-[520px] overflow-y-auto pr-1">
                {filteredMenuItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleAddItemToBill(item)}
                    className="bg-zinc-950 hover:bg-zinc-800/90 border border-zinc-800 hover:border-amber-500/40 p-3 rounded-xl text-right transition-all flex flex-col justify-between h-24 group active:scale-95"
                  >
                    <span className="font-bold text-xs text-white group-hover:text-amber-400 truncate">
                      {item.name}
                    </span>
                    <div className="flex items-center justify-between mt-2 pt-1 border-t border-zinc-900">
                      <span className="text-amber-500 font-black text-xs">{item.price.toFixed(2)} د.م</span>
                      <span className="text-[10px] bg-amber-500/10 text-amber-400 px-1.5 py-0.5 rounded font-bold">
                        +
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </section>

            {/* DESKTOP RIGHT: CURRENT BILL & CHECKOUT (COL 4) */}
            <section className="hidden lg:flex lg:col-span-4 bg-zinc-900 border border-zinc-800 rounded-2xl p-5 flex-col justify-between">
              {renderCheckoutContent()}
            </section>

          </div>

          {/* MOBILE: FLOATING BOTTOM ACTION BAR */}
          {billItems.length > 0 && !isMobileDrawerOpen && (
            <div className="lg:hidden fixed bottom-4 left-4 right-4 z-40">
              <button
                type="button"
                onClick={() => setIsMobileDrawerOpen(true)}
                className="w-full bg-gradient-to-r from-emerald-600 to-emerald-500 text-white font-black py-3.5 px-5 rounded-2xl shadow-xl flex items-center justify-between active:scale-[0.98] transition-all border border-emerald-400/30"
              >
                <div className="flex items-center gap-3">
                  <span className="bg-zinc-950 text-emerald-400 min-w-6 h-6 px-1.5 rounded-full flex items-center justify-center text-xs font-extrabold">
                    {billItems.length}
                  </span>
                  <span className="text-xs font-bold">عرض الحساب وإغلاقه 💳</span>
                </div>
                <span className="text-sm font-extrabold">{calculatedTotal.toFixed(2)} د.م</span>
              </button>
            </div>
          )}

          {/* MOBILE: SLIDE-UP DRAWER SHEET */}
          {isMobileDrawerOpen && (
            <div className="lg:hidden fixed inset-0 z-50 flex items-end bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="w-full bg-zinc-900 border-t border-zinc-800 rounded-t-3xl p-5 shadow-2xl max-h-[85vh] flex flex-col justify-between overflow-hidden">
                <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                  <span className="w-12 h-1 bg-zinc-700 rounded-full mx-auto absolute left-1/2 -translate-x-1/2 top-3"></span>
                  <span className="text-xs font-bold text-zinc-400 mt-2">إغلاق وتصفية الحساب</span>
                  <button
                    type="button"
                    onClick={() => setIsMobileDrawerOpen(false)}
                    className="text-xs font-bold text-zinc-400 hover:text-white bg-zinc-800 px-3 py-1.5 rounded-xl mt-2"
                  >
                    إغلاق ✕
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto mt-3">
                  {renderCheckoutContent()}
                </div>
              </div>
            </div>
          )}

          {/* PROCESSED ORDERS HISTORY MODAL */}
          {isHistoryOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-2xl w-full p-5 max-h-[85vh] flex flex-col justify-between shadow-2xl">
                <div>
                  <div className="flex justify-between items-center pb-3 border-b border-zinc-800">
                    <h3 className="font-extrabold text-white text-base flex items-center gap-2">
                      <span>📜</span> سجل الطلبات المعالجة والمدفوعة
                    </h3>
                    <button
                      onClick={() => setIsHistoryOpen(false)}
                      className="text-xs font-bold text-zinc-400 hover:text-white bg-zinc-800 px-3 py-1.5 rounded-xl"
                    >
                      إغلاق ✕
                    </button>
                  </div>

                  <div className="my-4 max-h-[55vh] overflow-y-auto space-y-3 pr-1">
                    {loadingHistory ? (
                      <p className="text-center text-xs text-zinc-500 py-8 animate-pulse">جاري تحميل السجل...</p>
                    ) : historyOrders.length === 0 ? (
                      <p className="text-center text-xs text-zinc-500 py-8">لا توجد طلبات معالجة سابقة.</p>
                    ) : (
                      historyOrders.map((rec) => (
                        <div
                          key={rec.id}
                          className="bg-zinc-950 border border-zinc-800 p-3.5 rounded-xl flex items-center justify-between text-xs"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold text-white">{rec.table_number}</span>
                              <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded font-mono">
                                مكتمل ✓
                              </span>
                            </div>
                            <p className="text-[10px] text-zinc-500 font-mono mt-1">
                              #{rec.id.slice(0, 8)} • {new Date(rec.created_at).toLocaleString('ar-MA')}
                            </p>
                            <p className="text-zinc-400 text-[11px] mt-1">
                              {rec.order_items?.map((i) => `${i.quantity}x ${i.menu_items?.name || 'وجبة'}`).join(', ')}
                            </p>
                          </div>

                          <div className="flex flex-col items-end gap-2">
                            <span className="font-black text-amber-500 text-sm">
                              {rec.total_amount.toFixed(2)} د.م
                            </span>
                            <button
                              type="button"
                              onClick={() => handleReprintHistory(rec)}
                              className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold px-3 py-1.5 rounded-lg text-[10px] transition-colors flex items-center gap-1 active:scale-95"
                            >
                              <span>🖨️</span> إعادة طباعة
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-zinc-800 text-left">
                  <button
                    onClick={() => setIsHistoryOpen(false)}
                    className="bg-zinc-800 text-white font-bold text-xs px-4 py-2 rounded-xl"
                  >
                    تم
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* THERMAL RECEIPT PRINT LAYOUT */}
          {receiptData && (
            <div className="hidden print:block text-black text-xs font-mono p-2 leading-tight">
              <div className="text-center mb-3 pb-2 border-b border-black">
                <h2 className="font-black text-base">شواية بن ديبان</h2>
                <p className="text-[10px]">مشاوي على الفحم - طعم الأصالة</p>
                <div className="mt-2 text-[10px]">
                  <p>وصل رقم: #{receiptData.orderId}</p>
                  <p className="font-bold">{receiptData.table}</p>
                  <p>{receiptData.date}</p>
                </div>
              </div>

              <div className="space-y-1 mb-3">
                {receiptData.items.map((i, idx) => (
                  <div key={idx} className="flex justify-between text-xs">
                    <span>{i.quantity}x {i.name}</span>
                    <span>{(i.unit_price * i.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div className="border-t border-black pt-2 flex justify-between font-black text-sm">
                <span>المجموع الكلي:</span>
                <span>{receiptData.total.toFixed(2)} درهم</span>
              </div>

              <p className="text-center text-[10px] mt-6">شكراً لزيارتكم وشهية طيبة! 🙏</p>
            </div>
          )}

        </main>
      </div>
    </PinGate>
  );
}