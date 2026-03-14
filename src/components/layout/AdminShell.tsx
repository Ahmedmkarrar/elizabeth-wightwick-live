'use client';

import { usePathname } from 'next/navigation';
import AdminNav from '@/components/layout/AdminNav';

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLogin = pathname === '/admin/login';

  if (isLogin) {
    return <>{children}</>;
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
