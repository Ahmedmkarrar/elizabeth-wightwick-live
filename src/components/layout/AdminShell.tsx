'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import AdminNav from '@/components/layout/AdminNav';

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isLogin = pathname === '/admin/login';

  useEffect(() => {
    if (!isLogin) {
      const authed = sessionStorage.getItem('ew-admin-auth');
      if (!authed) {
        router.replace('/admin/login');
      }
    }
  }, [isLogin, router]);

  if (isLogin) {
    return <>{children}</>;
  }

  // Don't render protected content until auth is confirmed
  const authed = typeof window !== 'undefined' && sessionStorage.getItem('ew-admin-auth');
  if (!authed) {
    return (
      <div className="min-h-screen bg-[#f7f7f5] flex items-center justify-center">
        <div className="text-[13px] font-inter text-slate/40">Checking authentication...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f7f5]">
      <AdminNav />
      <main className="lg:ml-[260px] pt-14 lg:pt-0">
        <div className="p-6 lg:p-10">
          {children}
        </div>
      </main>
    </div>
  );
}
