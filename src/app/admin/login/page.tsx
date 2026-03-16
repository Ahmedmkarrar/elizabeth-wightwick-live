'use client';

import { useState } from 'react';
import Button from '@/components/ui/Button';
import { useRouter } from 'next/navigation';

export default function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (res.ok) {
        sessionStorage.setItem('ew-admin-auth', 'true');
        router.push('/admin');
      } else {
        setError('Invalid email or password');
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-charcoal flex items-center justify-center px-5">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-10">
          <h1 className="font-cormorant text-[2rem] font-light text-white tracking-wide">
            Elizabeth Wightwick
          </h1>
          <div className="w-10 h-px bg-white/20 mx-auto mt-4 mb-3" />
          <p className="text-[12px] font-inter uppercase tracking-[0.25em] text-white/40">Admin Portal</p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="bg-white p-8 sm:p-10 space-y-5">
          <div>
            <label htmlFor="login-email" className="block text-[11px] font-inter font-medium uppercase tracking-[0.15em] text-slate mb-2">
              Email Address
            </label>
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              autoComplete="email"
              className="w-full border border-taupe/30 px-4 py-3 text-[14px] font-inter text-charcoal placeholder:text-slate/40 focus:outline-none focus:border-brand transition-colors"
            />
          </div>
          <div>
            <label htmlFor="login-password" className="block text-[11px] font-inter font-medium uppercase tracking-[0.15em] text-slate mb-2">
              Password
            </label>
            <input
              id="login-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              required
              autoComplete="current-password"
              className="w-full border border-taupe/30 px-4 py-3 text-[14px] font-inter text-charcoal placeholder:text-slate/40 focus:outline-none focus:border-brand transition-colors"
            />
          </div>

          {error && (
            <p className="text-[13px] font-inter text-red-500">{error}</p>
          )}

          <Button type="submit" loading={loading} className="w-full">
            Sign In
          </Button>
        </form>

        <p className="mt-6 text-center text-[12px] font-inter text-white/30">
          Contact your administrator for access.
        </p>
      </div>
    </div>
  );
}
