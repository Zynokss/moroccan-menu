'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/app/lib/supabase';
import Link from 'next/link';
import PinGate from '../components/PinGate';

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  is_available: boolean;
  image_url?: string;
}

export default function AdminMenuPage() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states for creating a new item
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('Mains');
  const [imageUrl, setImageUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchMenu = async () => {
    try {
      const { data, error } = await supabase
        .from('menu_items')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) console.error('Fetch error:', error);
      if (data) setItems(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMenu();
  }, []);

  const toggleAvailability = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from('menu_items')
      .update({ is_available: !currentStatus })
      .eq('id', id);

    if (error) {
      console.error('Failed to update availability:', error);
      alert(`خطأ في قاعدة البيانات: ${error.message}`);
    } else {
      setItems((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, is_available: !currentStatus } : item
        )
      );
    }
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !price) return;

    setIsSubmitting(true);
    const cleanImageUrl = imageUrl.trim();

    try {
      const { data, error } = await supabase
        .from('menu_items')
        .insert({
          name,
          description,
          price: parseFloat(price),
          category,
          is_available: true,
          image_url: cleanImageUrl || null,
        })
        .select()
        .single();

      if (error) {
        console.error('Supabase error details:', error);
        alert(`فشل إدخال الوجبة: ${error.message}`);
        return;
      }

      if (data) {
        setItems((prev) => [...prev, data]);
        setName('');
        setDescription('');
        setPrice('');
        setImageUrl('');
      }
    } catch (err: any) {
      console.error('Error adding item:', err);
      alert(`خطأ غير متوقع: ${err?.message || 'فشل في إضافة الوجبة'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (!confirm('هل أنت أؤكد أنك تريد حذف هذه الوجبة؟')) return;

    const { error } = await supabase.from('menu_items').delete().eq('id', id);

    if (error) {
      console.error('Failed to delete item:', error);
      alert(`فشل الحذف: ${error.message}`);
    } else {
      setItems((prev) => prev.filter((item) => item.id !== id));
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-white">
        <p className="text-lg font-medium animate-pulse">جاري تحميل قائمة التحكم...</p>
      </div>
    );
  }

  return (
    <PinGate title="إدارة القائمة">
      <main className="min-h-screen bg-zinc-950 text-zinc-100 p-4 sm:p-8 max-w-5xl mx-auto" dir="rtl">
        <header className="mb-8 flex justify-between items-center border-b border-zinc-800 pb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-amber-500">
              إدارة القائمة
            </h1>
            <p className="text-zinc-400 text-sm mt-1">
              إضافة أطباق، تعديل الأسعار، وتحديث التوفر مباشرة
            </p>
          </div>
          <Link
            href="/kitchen"
            className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold px-4 py-2 rounded-xl transition-colors"
          >
            ← الذهاب للمطبخ
          </Link>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Form to Add New Dish */}
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl h-fit shadow-xl">
            <h2 className="text-xl font-bold text-white mb-4 border-b border-zinc-800 pb-2">
              إضافة طبق جديد
            </h2>
            <form onSubmit={handleAddItem} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-zinc-400 mb-1">
                  اسم الطبق *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="مثال: طاجين بالبرقوق"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-amber-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-zinc-400 mb-1">
                  الفئة
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-amber-500 text-sm"
                >
                  <option value="Starters">المقبلات (Starters)</option>
                  <option value="Mains">الأطباق الرئيسية (Mains)</option>
                  <option value="Desserts">الحلويات (Desserts)</option>
                  <option value="Drinks">المشروبات (Drinks)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-zinc-400 mb-1">
                  الثمن (د.م) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="80.00"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-amber-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-zinc-400 mb-1">
                  رابط الصورة
                </label>
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/photo-..."
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-amber-500 text-sm font-mono text-xs"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-zinc-400 mb-1">
                  الوصف
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="مكونات الطبق أو تفاصيل سريعة..."
                  rows={3}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-amber-500 text-sm"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-amber-600 hover:bg-amber-500 text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-50 text-sm"
              >
                {isSubmitting ? 'جاري الحفظ...' : 'إضافة إلى القائمة'}
              </button>
            </form>
          </div>

          {/* List of Existing Menu Items */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-xl font-bold text-white mb-4">
              الأطباق الحالية ({items.length})
            </h2>

            {items.map((item) => (
              <div
                key={item.id}
                className={`bg-zinc-900 border rounded-2xl p-5 flex flex-col sm:flex-row justify-between sm:items-center gap-4 transition-all ${
                  item.is_available
                    ? 'border-zinc-800'
                    : 'border-red-900/40 bg-zinc-900/50 opacity-60'
                }`}
              >
                <div className="flex items-start sm:items-center gap-4">
                  {item.image_url ? (
                    <img
                      src={item.image_url}
                      alt={item.name}
                      className="w-16 h-16 rounded-xl object-cover border border-zinc-800 shrink-0"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-center text-xs text-zinc-600 shrink-0">
                      بدون صورة
                    </div>
                  )}

                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-lg text-white">{item.name}</h3>
                      <span className="text-xs bg-zinc-800 text-zinc-400 px-2.5 py-0.5 rounded-full font-mono">
                        {item.category}
                      </span>
                    </div>
                    <p className="text-zinc-400 text-xs mt-1">{item.description}</p>
                    <p className="text-amber-500 font-bold mt-2 text-sm">
                      {item.price.toFixed(2)} د.م
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-3 sm:pt-0 border-t sm:border-0 border-zinc-800 shrink-0">
                  <button
                    onClick={() => toggleAvailability(item.id, item.is_available)}
                    className={`text-xs font-bold px-3 py-2 rounded-xl transition-colors whitespace-nowrap ${
                      item.is_available
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20'
                        : 'bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20'
                    }`}
                  >
                    {item.is_available ? 'متوفر' : 'غير متوفر'}
                  </button>

                  <button
                    onClick={() => handleDeleteItem(item.id)}
                    className="bg-zinc-800 hover:bg-red-600/80 text-zinc-400 hover:text-white p-2 rounded-xl transition-colors"
                    title="حذف الوجبة"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </PinGate>
  );
}