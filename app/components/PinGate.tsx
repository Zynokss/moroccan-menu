'use client';

import { useState, useEffect } from 'react';

// Change this PIN to whatever you want for your staff!
const STAFF_PIN = '5555';

interface PinGateProps {
  children: React.ReactNode;
  title?: string;
}

export default function PinGate({ children, title = 'Staff Access Required' }: PinGateProps) {
  const [pin, setPin] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if staff already logged in during this session
    const authStatus = sessionStorage.getItem('staff_authenticated');
    if (authStatus === 'true') {
      setIsAuthenticated(true);
    }
    setLoading(false);
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin === STAFF_PIN) {
      sessionStorage.setItem('staff_authenticated', 'true');
      setIsAuthenticated(true);
      setError(false);
    } else {
      setError(true);
      setPin('');
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('staff_authenticated');
    setIsAuthenticated(false);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-white">
        <p className="animate-pulse font-medium">Checking authorization...</p>
      </div>
    );
  }

  // If not logged in, show lock screen
  if (!isAuthenticated) {
    return (
      <main className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-4">
        <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-2xl w-full max-w-sm text-center shadow-2xl">
          <div className="w-12 h-12 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-4 text-xl">
            🔒
          </div>
          <h1 className="text-2xl font-bold text-white mb-1">{title}</h1>
          <p className="text-zinc-400 text-xs mb-6">
            Enter the 4-digit staff PIN to continue.
          </p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <input
                type="password"
                maxLength={4}
                value={pin}
                onChange={(e) => {
                  setError(false);
                  setPin(e.target.value);
                }}
                placeholder="••••"
                className="w-full text-center text-3xl tracking-[1em] font-mono bg-zinc-950 border border-zinc-800 rounded-xl py-3 text-white focus:outline-none focus:border-amber-500"
                autoFocus
              />
            </div>

            {error && (
              <p className="text-xs text-red-400 font-semibold animate-bounce">
                Incorrect PIN. Try again.
              </p>
            )}

            <button
              type="submit"
              className="w-full bg-amber-600 hover:bg-amber-500 text-white font-bold py-3 rounded-xl transition-colors text-sm"
            >
              Unlock Dashboard
            </button>
          </form>
        </div>
      </main>
    );
  }

  // If authenticated, render protected page with a small Logout button
  return (
    <>
      <div className="fixed top-3 right-3 z-50 print:hidden">
        <button
          onClick={handleLogout}
          className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white px-3 py-1.5 rounded-lg border border-zinc-700 transition-colors"
        >
          Lock Screen 🔒
        </button>
      </div>
      {children}
    </>
  );
}
