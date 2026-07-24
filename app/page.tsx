'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '@/app/lib/supabase';
import { saveClientOrder } from '@/app/lib/orderStorage';
import Link from 'next/link';

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  is_available: boolean;
  image_url?: string;
}

interface CartItem extends MenuItem {
  quantity: number;
}

type Language = 'ar' | 'en';

const TRANSLATIONS = {
  ar: {
    restaurantName: 'شواية بن ديبان',
    subTitle: 'مشاوي على الفحم - طعم الأصالة والجودة',
    table: 'طاولة',
    noTable: 'لم يتم تحديد طاولة',
    categories: 'الأقسام',
    searchPlaceholder: 'ابحث عن وجبة أو مكونات...',
    freshAndHot: 'بالصحة والعافية',
    heroTitle: 'شهية طيبة! اختر وجبتك المفضلة',
    heroSub: 'سيتم ارسال طلبك مباشرة إلى المطبخ بكل سرعة وسهولة',
    itemsCount: 'وجبة',
    noDishes: 'لا توجد وجبات متاحة',
    noDishesSub: 'جرب اختيار قسم آخر أو تغيير كلمة البحث',
    add: '+ إضافة',
    myOrder: 'طلبي',
    tableNumLabel: 'رقم الطاولة *',
    nameLabel: 'الاسم (اختياري)',
    notesLabel: 'ملاحظات للمطبخ',
    notesPlaceholder: 'بدون بصل، حار جداً...',
    total: 'المجموع الإجمالي:',
    confirmOrder: 'تأكيد إرسال الطلب',
    sendingOrder: 'جاري الإرسال...',
    emptyCart: 'سلة الطلبات فارغة',
    emptyCartSub: 'اضغط على "+ إضافة" للبدء',
    orderConfirmed: 'تم استلام طلبك بنجاح!',
    orderConfirmedSub: 'شكراً لك! يتم الآن تحضير طلبك للطاولة رقم',
    orderMore: 'طلب المزيد من الوجبات',
    priceUnit: 'درهم',
    myActiveOrders: 'الطلبات الجارية',
    viewCart: 'عرض السلة',
    close: 'إغلاق ✕',
  },
  en: {
    restaurantName: 'Chawayat Bin Diyan',
    subTitle: 'Charcoal Grills - Authentic Taste & Quality',
    table: 'Table',
    noTable: 'No Table Selected',
    categories: 'Categories',
    searchPlaceholder: 'Search for dishes or ingredients...',
    freshAndHot: 'Fresh & Hot',
    heroTitle: 'Craving Something Delicious?',
    heroSub: 'Select your favorite items and send your order straight to the kitchen!',
    itemsCount: 'items',
    noDishes: 'No dishes found',
    noDishesSub: 'Try selecting a different category or clearing your search.',
    add: '+ Add',
    myOrder: 'My Order',
    tableNumLabel: 'Table Number *',
    nameLabel: 'Your Name (Optional)',
    notesLabel: 'Kitchen Notes',
    notesPlaceholder: 'No onions, extra spicy...',
    total: 'Total:',
    confirmOrder: 'Confirm Order',
    sendingOrder: 'Sending Order...',
    emptyCart: 'Your order is empty',
    emptyCartSub: 'Click "+ Add" on any item to start',
    orderConfirmed: 'Order Confirmed!',
    orderConfirmedSub: 'Thank you! Your order is being prepared for Table',
    orderMore: 'Order More Items',
    priceUnit: 'MAD',
    myActiveOrders: 'Active Orders',
    viewCart: 'View Order',
    close: 'Close ✕',
  },
};

const HERO_BANNER_IMAGE = 'https://tmpmhcfljtkwivclkdbc.supabase.co/storage/v1/object/public/menu-images/banner.jpg'; // 👈 Background image URL[cite: 2]

const getCategoryIcon = (categoryName: string): string => {
  const name = categoryName.toLowerCase();

  if (name === 'الكل' || name === 'all') return '🍽️';
  if (name.includes('مشاوي') || name.includes('فحم') || name.includes('grill')) return '🔥';
  if (name.includes('طاجن') || name.includes('طواجن') || name.includes('tajine')) return '🍲';
  if (name.includes('سندويش') || name.includes('sandwich')) return '🥪';
  if (name.includes('تاكوس') || name.includes('tacos')) return '🌮';
  if (name.includes('برغر') || name.includes('burger')) return '🍔';
  if (name.includes('شاورما') || name.includes('shawarma')) return '🌯';
  if (name.includes('سلط') || name.includes('salad')) return '🥗';
  if (name.includes('مقل') || name.includes('إضافات') || name.includes('fries') || name.includes('sides')) return '🍟';
  if (name.includes('شاي') || name.includes('tea')) return '🫖';
  if (name.includes('مشروب') || name.includes('عصير') || name.includes('drink') || name.includes('beverage')) return '🥤';
  if (name.includes('حلو') || name.includes('dessert')) return '🍰';
  if (name.includes('بيتزا') || name.includes('pizza')) return '🍕';

  return '🍽️';
};

const RESTAURANT_PHONE = '212762487466'; // Your WhatsApp phone number[cite: 2]

function getWhatsAppLink(
  tableNumber: string,
  customerName: string,
  cart: Array<{ name: string; quantity: number; price: number }>,
  totalAmount: number,
  notes: string
) {
  let message = `*طلب جديد - شواية بن ديبان* 🔥\n`;
  message += `-----------------------------------\n`;
  message += `📍 *رقم الطاولة:* ${tableNumber || 'غير محدد'}\n`;
  if (customerName) message += `👤 *الاسم:* ${customerName}\n`;
  message += `-----------------------------------\n`;
  message += `🛒 *الطلبات:*\n`;

  cart.forEach((item) => {
    message += `• ${item.name} × ${item.quantity} (${(item.price * item.quantity).toFixed(2)} درهم)\n`;
  });

  message += `-----------------------------------\n`;
  message += `💰 *المجموع الإجمالي:* ${totalAmount.toFixed(2)} درهم\n`;
  if (notes) message += `📝 *ملاحظات:* ${notes}\n`;

  return `https://wa.me/${RESTAURANT_PHONE}?text=${encodeURIComponent(message)}`;
}

function MenuContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tableParam = searchParams.get('table');

  const [lang, setLang] = useState<Language>('ar');
  const t = TRANSLATIONS[lang];

  const [tableNumber, setTableNumber] = useState<string>('');
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('الكل');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [customerName, setCustomerName] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);

  useEffect(() => {
    if (tableParam) setTableNumber(tableParam);

    async function fetchMenu() {
      const { data, error } = await supabase
        .from('menu_items')
        .select('*')
        .eq('is_available', true)
        .order('created_at', { ascending: true });

      if (error) console.error('Error loading menu:', error);
      if (data) setMenuItems(data);
      setLoading(false);
    }

    fetchMenu();
  }, [tableParam]);

  const categories = ['الكل', ...Array.from(new Set(menuItems.map((i) => i.category).filter(Boolean)))];

  const filteredItems = menuItems.filter((item) => {
    const matchesCategory = selectedCategory === 'الكل' || item.category === selectedCategory;
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const addToCart = (item: MenuItem) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      if (existing) {
        return prev.map((i) => (i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i));
      }
      return [...prev, { ...item, quantity: 1 }];
    });
    setIsCartOpen(true);
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.id === id) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const totalAmount = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const totalCartCount = cart.reduce((a, c) => a + c.quantity, 0);

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tableNumber) {
      alert(lang === 'ar' ? 'يرجى إدخال رقم الطاولة!' : 'Please enter table number!');
      return;
    }
    if (cart.length === 0) {
      alert(lang === 'ar' ? 'السلة فارغة!' : 'Your cart is empty!');
      return;
    }

    setIsSubmitting(true);

    try {
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert({
          table_number: tableNumber,
          customer_name: customerName || null,
          notes: notes || null,
          total_amount: totalAmount,
          status: 'pending',
        })
        .select()
        .single();

      if (orderError) throw orderError;

      const orderItemsToInsert = cart.map((item) => ({
        order_id: orderData.id,
        menu_item_id: item.id,
        quantity: item.quantity,
        unit_price: item.price,
      }));

      const { error: itemsError } = await supabase.from('order_items').insert(orderItemsToInsert);
      if (itemsError) throw itemsError;

      saveClientOrder(orderData.id);

      setCart([]);
      setNotes('');
      setIsCartOpen(false);

      router.push(`/order/${orderData.id}`);

      setTimeout(() => {
        if (window.location.pathname === '/') {
          window.location.href = `/order/${orderData.id}`;
        }
      }, 500);

    } catch (err) {
      console.error('Failed to submit order:', err);
      alert('حدث خطأ أثناء إرسال الطلب. يرجى المحاولة مرة أخرى.');
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-white">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-sm font-medium tracking-wide text-zinc-400">جاري تحميل القائمة...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 pb-28 lg:pb-0 selection:bg-amber-500 selection:text-zinc-950 flex flex-col justify-between" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <div>
        {/* Top Navbar */}
        <header className="sticky top-0 z-40 border-b border-zinc-800/80 bg-zinc-950/90 backdrop-blur-md px-4 lg:px-8 py-3.5 flex items-center justify-between">
          <div className="flex items-center space-x-3 space-x-reverse">
            <div className="w-10 h-10 rounded-2xl border border-amber-500/40 bg-zinc-900 overflow-hidden shadow-md flex items-center justify-center">
              <img 
                src="https://tmpmhcfljtkwivclkdbc.supabase.co/storage/v1/object/public/menu-images/Adobe%20Express%20-%20file.png"
                alt="Logo" 
                className="w-full h-full object-cover" 
              />
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tight text-white leading-none">
                {t.restaurantName}
              </h1>
              <p className="text-[10px] text-amber-500/90 font-medium mt-0.5">{t.subTitle}</p>
            </div>
          </div>

          <div className="flex items-center space-x-3 space-x-reverse">
            <button
              onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
              className="text-xs font-bold bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-amber-400 px-3 py-1.5 rounded-xl transition-colors"
            >
              {lang === 'ar' ? 'English 🌐' : 'العربية 🌐'}
            </button>

            {tableNumber ? (
              <div className="flex items-center space-x-2 space-x-reverse bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-xl">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                </span>
                <span className="text-xs font-semibold text-zinc-300">{t.table}</span>
                <span className="text-sm font-black text-amber-400">#{tableNumber}</span>
              </div>
            ) : (
              <div className="text-xs text-zinc-500 bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-xl">
                {t.noTable}
              </div>
            )}
          </div>
        </header>

        {/* Main Dashboard Layout */}
        <div className="max-w-[1600px] mx-auto p-4 lg:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* COLUMN 1: Sidebar Categories */}
          <aside className="lg:col-span-2 space-y-4">
            <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-3 backdrop-blur-sm lg:sticky lg:top-20">
              <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 px-3 py-2">
                {t.categories}
              </p>
              <nav className="flex lg:flex-col overflow-x-auto lg:overflow-x-visible gap-1.5 pb-2 lg:pb-0 scrollbar-none">
                {categories.map((cat) => {
                  const isActive = selectedCategory === cat;
                  const icon = getCategoryIcon(cat);

                  return (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`flex items-center space-x-3 space-x-reverse px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 lg:w-full ${
                        isActive
                          ? 'bg-amber-500 text-zinc-950 shadow-lg shadow-amber-500/20'
                          : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
                      }`}
                    >
                      <span className="text-base">{icon}</span>
                      <span className="whitespace-nowrap">{cat}</span>
                    </button>
                  );
                })}
              </nav>
            </div>
          </aside>

          {/* COLUMN 2: Central Feed */}
          <section className="lg:col-span-7 space-y-6">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t.searchPlaceholder}
                className="w-full bg-zinc-900/80 border border-zinc-800 rounded-2xl pr-11 pl-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500 transition-colors shadow-sm"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">🔍</span>
            </div>

            {/* CUSTOM HERO BANNER WITH BACKGROUND IMAGE */}
            <div
              className="relative overflow-hidden rounded-2xl border border-zinc-800 p-6 flex flex-col items-center justify-center gap-4 text-center shadow-xl bg-cover bg-center bg-no-repeat"
              style={{
                backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.65), rgba(0, 0, 0, 0.75)), url(${HERO_BANNER_IMAGE})`,
              }}
            >
              <div className="space-y-2 z-10 max-w-lg mx-auto flex flex-col items-center">
                <span className="inline-block px-3 py-1 rounded-full text-xs font-black uppercase tracking-wide bg-amber-500/30 text-amber-300 border border-amber-500/40 backdrop-blur-md">
                  {t.freshAndHot}
                </span>
                <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-wide">{t.heroTitle}</h2>
                <p className="text-xs text-zinc-300 max-w-md leading-relaxed">{t.heroSub}</p>
              </div>

              <div className="z-10 mt-1">
                <div className="w-14 h-14 rounded-2xl bg-zinc-900/80 border border-amber-500/40 flex items-center justify-center text-2xl shadow-lg backdrop-blur-md">
                  🥩
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <span>{getCategoryIcon(selectedCategory)}</span>
                  <span>{selectedCategory}</span>
                </h3>
                <span className="text-xs font-mono text-zinc-500">
                  {filteredItems.length} {t.itemsCount}
                </span>
              </div>

              {filteredItems.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-zinc-800 rounded-2xl bg-zinc-900/30">
                  <p className="text-3xl mb-2">🔎</p>
                  <p className="text-sm font-semibold text-zinc-400">{t.noDishes}</p>
                  <p className="text-xs text-zinc-600 mt-1">{t.noDishesSub}</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-2 gap-3 sm:gap-4">
                  {filteredItems.map((item) => (
                    <div
                      key={item.id}
                      className="group bg-zinc-900/80 border border-zinc-800 hover:border-amber-500/50 rounded-2xl overflow-hidden flex flex-col justify-between transition-all duration-200 hover:shadow-xl hover:shadow-black/50"
                    >
                      <div>
                        <div className="relative h-32 sm:h-44 w-full bg-zinc-950 overflow-hidden">
                          {item.image_url ? (
                            <img
                              src={item.image_url}
                              alt={item.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center text-zinc-600">
                              <span className="text-2xl sm:text-3xl mb-1">🥩</span>
                              <span className="text-[9px] sm:text-[10px]">شواية بن ديبان</span>
                            </div>
                          )}
                          <span className="absolute top-2 right-2 sm:top-3 sm:right-3 bg-zinc-950/80 backdrop-blur-md text-zinc-300 text-[9px] sm:text-[10px] font-mono px-2 py-0.5 rounded-full border border-zinc-800">
                            {item.category}
                          </span>
                        </div>

                        <div className="p-2.5 sm:p-4">
                          <h4 className="font-bold text-sm sm:text-base text-white group-hover:text-amber-400 transition-colors line-clamp-1">
                            {item.name}
                          </h4>
                          <p className="text-[11px] sm:text-xs text-zinc-400 mt-1 line-clamp-2 leading-relaxed">
                            {item.description}
                          </p>
                        </div>
                      </div>

                      <div className="px-2.5 sm:px-4 pb-2.5 sm:pb-4 pt-1 flex flex-col sm:flex-row gap-2 items-start sm:items-center justify-between border-t border-zinc-800/50 mt-1">
                        <div>
                          <span className="text-sm sm:text-base font-extrabold text-amber-500">
                            {item.price.toFixed(2)} <span className="text-[10px] sm:text-xs font-semibold">{t.priceUnit}</span>
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => addToCart(item)}
                          className="w-full sm:w-auto bg-amber-500 hover:bg-amber-400 text-zinc-950 font-extrabold px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs transition-all flex items-center justify-center space-x-1 shadow-md shadow-amber-500/10 active:scale-95 select-none"
                        >
                          <span>{t.add}</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* COLUMN 3: Right Desktop Sticky Live Order Panel */}
          <aside className="hidden lg:block lg:col-span-3">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 sticky top-20 shadow-2xl">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                <h3 className="font-extrabold text-white text-base flex items-center space-x-2 space-x-reverse">
                  <span>🛒</span>
                  <span>{t.myOrder}</span>
                </h3>
                <span className="text-xs font-mono bg-zinc-800 text-amber-400 px-2.5 py-0.5 rounded-full font-bold">
                  {totalCartCount}
                </span>
              </div>

              <form onSubmit={handlePlaceOrder} className="mt-4 space-y-4">
                {!tableParam && (
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                      {t.tableNumLabel}
                    </label>
                    <input
                      type="text"
                      required
                      value={tableNumber}
                      onChange={(e) => setTableNumber(e.target.value)}
                      placeholder="مثلاً: 5"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                    {t.nameLabel}
                  </label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="الاسم"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="my-3 max-h-60 overflow-y-auto space-y-2.5 pl-1 border-t border-b border-zinc-800/80 py-3 scrollbar-thin">
                  {cart.length === 0 ? (
                    <div className="py-8 text-center">
                      <p className="text-2xl mb-1 opacity-50">🛒</p>
                      <p className="text-xs text-zinc-500 font-medium">{t.emptyCart}</p>
                      <p className="text-[10px] text-zinc-600 mt-0.5">{t.emptyCartSub}</p>
                    </div>
                  ) : (
                    cart.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between text-xs bg-zinc-950/60 p-2.5 rounded-xl border border-zinc-800/50"
                      >
                        <div className="pl-2 min-w-0 flex-1">
                          <p className="font-bold text-white truncate">{item.name}</p>
                          <p className="text-[10px] text-amber-500 font-mono mt-0.5">
                            {(item.price * item.quantity).toFixed(2)} {t.priceUnit}
                          </p>
                        </div>

                        <div className="flex items-center space-x-1.5 space-x-reverse bg-zinc-900 border border-zinc-800 rounded-lg p-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.id, -1)}
                            className="w-6 h-6 flex items-center justify-center text-amber-400 font-bold bg-amber-500/20 border border-amber-500/30 rounded hover:bg-amber-500 hover:text-zinc-950 transition-colors active:scale-95"
                          >
                            -
                          </button>
                          <span className="w-5 text-center font-bold text-amber-400 text-xs">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.id, 1)}
                            className="w-6 h-6 flex items-center justify-center text-amber-400 font-bold bg-amber-500/20 border border-amber-500/30 rounded hover:bg-amber-500 hover:text-zinc-950 transition-colors active:scale-95"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                    {t.notesLabel}
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder={t.notesPlaceholder}
                    rows={2}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="pt-2">
                  <div className="flex items-center justify-between mb-3 text-sm">
                    <span className="text-zinc-400 font-semibold">{t.total}</span>
                    <span className="text-lg font-black text-amber-500">
                      {totalAmount.toFixed(2)} {t.priceUnit}
                    </span>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting || cart.length === 0}
                    className="w-full rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-zinc-950 font-black py-3.5 text-xs tracking-wide uppercase transition-all shadow-lg shadow-amber-500/10"
                  >
                    {isSubmitting ? t.sendingOrder : t.confirmOrder}
                  </button>

                  {/* 💬 WhatsApp Fallback Button (Desktop) */}
                  <a
                    href={getWhatsAppLink(tableNumber, customerName, cart, totalAmount, notes)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 text-xs tracking-wide transition-all shadow-lg mt-2.5 ${
                      cart.length === 0 ? 'pointer-events-none opacity-40' : ''
                    }`}
                  >
                    <span className="text-base">💬</span>
                    <span>إرسال الطلب عبر الواتساب</span>
                  </a>
                </div>
              </form>
            </div>
          </aside>

        </div>

        {/* MOBILE: Sticky Quick Cart Trigger Bar */}
        {totalCartCount > 0 && !isCartOpen && (
          <div className="lg:hidden fixed bottom-16 left-4 right-4 z-40">
            <button
              type="button"
              onClick={() => setIsCartOpen(true)}
              className="w-full bg-gradient-to-r from-amber-500 to-amber-400 text-zinc-950 font-black py-3.5 px-5 rounded-2xl shadow-xl flex items-center justify-between active:scale-[0.98] transition-all border border-amber-300/30"
            >
              <div className="flex items-center gap-3">
                <span className="bg-zinc-950 text-amber-400 min-w-6 h-6 px-1.5 rounded-full flex items-center justify-center text-xs font-extrabold">
                  {totalCartCount}
                </span>
                <span className="text-sm">{t.viewCart}</span>
              </div>
              <span className="text-sm font-extrabold">{totalAmount.toFixed(2)} {t.priceUnit}</span>
            </button>
          </div>
        )}

        {/* MOBILE: Slide-up Cart Drawer Sheet */}
        {isCartOpen && (
          <div className="lg:hidden fixed inset-0 z-50 flex items-end bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full bg-zinc-900 border-t border-zinc-800 rounded-t-3xl p-5 shadow-2xl max-h-[85vh] flex flex-col justify-between overflow-hidden">
              
              {/* Drawer Header */}
              <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                <h3 className="font-extrabold text-white text-base flex items-center gap-2">
                  <span>🛒</span>
                  <span>{t.myOrder}</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setIsCartOpen(false)}
                  className="text-xs font-bold text-zinc-400 hover:text-white bg-zinc-800 px-3 py-1.5 rounded-xl"
                >
                  {t.close}
                </button>
              </div>

              {/* Drawer Content Form */}
              <form onSubmit={handlePlaceOrder} className="flex-1 overflow-y-auto my-3 space-y-4 pr-1">
                {!tableParam && (
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                      {t.tableNumLabel}
                    </label>
                    <input
                      type="text"
                      required
                      value={tableNumber}
                      onChange={(e) => setTableNumber(e.target.value)}
                      placeholder="مثلاً: 5"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                    {t.nameLabel}
                  </label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="الاسم"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                {/* Items List */}
                <div className="space-y-2 max-h-48 overflow-y-auto border-t border-b border-zinc-800 py-3">
                  {cart.length === 0 ? (
                    <div className="py-6 text-center">
                      <p className="text-xl mb-1 opacity-50">🛒</p>
                      <p className="text-xs text-zinc-500 font-medium">{t.emptyCart}</p>
                    </div>
                  ) : (
                    cart.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between text-xs bg-zinc-950/80 p-2.5 rounded-xl border border-zinc-800/80"
                      >
                        <div className="pl-2 min-w-0 flex-1">
                          <p className="font-bold text-white truncate">{item.name}</p>
                          <p className="text-[10px] text-amber-500 font-mono mt-0.5">
                            {(item.price * item.quantity).toFixed(2)} {t.priceUnit}
                          </p>
                        </div>

                        <div className="flex items-center space-x-1.5 space-x-reverse bg-zinc-900 border border-zinc-800 rounded-lg p-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.id, -1)}
                            className="w-6 h-6 flex items-center justify-center text-amber-400 font-bold bg-amber-500/20 border border-amber-500/30 rounded hover:bg-amber-500 hover:text-zinc-950 active:scale-95 transition-colors"
                          >
                            -
                          </button>
                          <span className="w-5 text-center font-bold text-amber-400 text-xs">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.id, 1)}
                            className="w-6 h-6 flex items-center justify-center text-amber-400 font-bold bg-amber-500/20 border border-amber-500/30 rounded hover:bg-amber-500 hover:text-zinc-950 active:scale-95 transition-colors"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                    {t.notesLabel}
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder={t.notesPlaceholder}
                    rows={2}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="pt-2">
                  <div className="flex items-center justify-between mb-3 text-sm">
                    <span className="text-zinc-400 font-semibold">{t.total}</span>
                    <span className="text-lg font-black text-amber-500">
                      {totalAmount.toFixed(2)} {t.priceUnit}
                    </span>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting || cart.length === 0}
                    className="w-full rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-zinc-950 font-black py-3.5 text-xs tracking-wide uppercase transition-all shadow-lg active:scale-98"
                  >
                    {isSubmitting ? t.sendingOrder : t.confirmOrder}
                  </button>

                  {/* 💬 WhatsApp Fallback Button (Mobile Drawer) */}
                  <a
                    href={getWhatsAppLink(tableNumber, customerName, cart, totalAmount, notes)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 text-xs tracking-wide transition-all shadow-lg mt-2.5 ${
                      cart.length === 0 ? 'pointer-events-none opacity-40' : ''
                    }`}
                  >
                    <span className="text-base">💬</span>
                    <span>إرسال الطلب عبر الواتساب</span>
                  </a>
                </div>
              </form>

            </div>
          </div>
        )}

        {/* Floating Bottom Navigation for Mobile */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-zinc-950/95 backdrop-blur-md border-t border-zinc-800 px-6 py-2.5 flex justify-around items-center z-40">
          <Link href="/" className="flex flex-col items-center text-amber-500 text-xs font-bold">
            <span className="text-lg">🍽️</span>
            <span>القائمة</span>
          </Link>
          <Link href="/orders" className="flex flex-col items-center text-zinc-400 hover:text-amber-500 text-xs font-bold transition-colors">
            <span className="text-lg">⏳</span>
            <span>{t.myActiveOrders}</span>
          </Link>
        </nav>
      </div>

      {/* Footer */}
      <footer className="mt-8 border-t border-zinc-800/60 bg-zinc-950 py-6 text-center text-xs text-zinc-500">
        <p>zyn all right reserverd 2026</p>
      </footer>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-white">
          <p className="animate-pulse text-sm font-medium">شواية بن ديبان...</p>
        </div>
      }
    >
      <MenuContent />
    </Suspense>
  );
}