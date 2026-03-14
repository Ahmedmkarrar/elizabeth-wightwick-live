'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import {
  HomeIcon,
  BuildingOfficeIcon,
  ChatBubbleLeftIcon,
  DocumentTextIcon,
  Cog6ToothIcon,
  ArrowLeftOnRectangleIcon,
  ArrowRightOnRectangleIcon,
  Bars3Icon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

const adminLinks = [
  { href: '/admin', label: 'Dashboard', icon: HomeIcon },
  { href: '/admin/properties', label: 'Properties', icon: BuildingOfficeIcon },
  { href: '/admin/inquiries', label: 'Inquiries', icon: ChatBubbleLeftIcon, badge: 3 },
  { href: '/admin/valuations', label: 'Valuations', icon: DocumentTextIcon, badge: 1 },
  { href: '/admin/settings', label: 'Settings', icon: Cog6ToothIcon },
];

export default function AdminNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    sessionStorage.removeItem('ew-admin-auth');
    router.push('/admin/login');
  };

  const isActive = (href: string) =>
    pathname === href || (href !== '/admin' && pathname.startsWith(href));

  const navContent = (
    <>
      {/* Header */}
      <div className="p-6 pb-5">
        <Link
          href="/admin"
          onClick={() => setMobileOpen(false)}
          className="font-cormorant text-[1.25rem] text-white font-light tracking-wide"
        >
          Elizabeth Wightwick
        </Link>
        <p className="text-[10px] font-inter uppercase tracking-[0.2em] text-white/30 mt-1.5">Admin Portal</p>
      </div>

      {/* User */}
      <div className="mx-4 mb-4 p-3 bg-white/5 rounded-sm flex items-center gap-3">
        <div className="w-8 h-8 bg-brand/80 rounded-full flex items-center justify-center">
          <span className="text-[11px] font-inter font-medium text-white">EW</span>
        </div>
        <div>
          <p className="text-[12px] font-inter text-white/90 font-medium">Elizabeth</p>
          <p className="text-[10px] font-inter text-white/40">Administrator</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-2">
        <p className="text-[9px] font-inter uppercase tracking-[0.25em] text-white/25 px-6 mb-2">Menu</p>
        {adminLinks.map((link) => {
          const Icon = link.icon;
          const active = isActive(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                'flex items-center gap-3 px-6 py-2.5 text-[13px] font-inter transition-all duration-300 relative',
                active
                  ? 'text-white bg-white/10'
                  : 'text-white/50 hover:text-white/80 hover:bg-white/[0.03]'
              )}
            >
              {active && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-brand rounded-r" />}
              <Icon className="w-[18px] h-[18px]" />
              <span className="flex-1">{link.label}</span>
              {link.badge && (
                <span className={cn(
                  'text-[10px] font-medium min-w-[20px] h-5 flex items-center justify-center rounded-full',
                  active ? 'bg-brand text-white' : 'bg-white/10 text-white/50'
                )}>
                  {link.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 space-y-1 border-t border-white/5">
        <Link
          href="/"
          target="_blank"
          onClick={() => setMobileOpen(false)}
          className="flex items-center gap-3 px-2 py-2 text-[12px] font-inter text-white/30 hover:text-white/60 transition-colors"
        >
          <ArrowLeftOnRectangleIcon className="w-[16px] h-[16px]" />
          Back to Website
        </Link>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-2 py-2 text-[12px] font-inter text-white/30 hover:text-red-400 transition-colors w-full"
        >
          <ArrowRightOnRectangleIcon className="w-[16px] h-[16px]" />
          Sign Out
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-[260px] bg-charcoal min-h-screen fixed left-0 top-0 z-40">
        {navContent}
      </aside>

      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 h-14 bg-charcoal border-b border-white/10 px-4 flex items-center justify-between">
        <Link href="/admin" className="font-cormorant text-[1.1rem] text-white font-light tracking-wide">
          Elizabeth Wightwick
        </Link>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 text-white/50 hover:text-white transition-colors"
          aria-label="Toggle menu"
        >
          {mobileOpen ? <XMarkIcon className="w-5 h-5" /> : <Bars3Icon className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="fixed inset-y-0 left-0 w-[260px] bg-charcoal z-50 flex flex-col lg:hidden overflow-y-auto">
            {navContent}
          </aside>
        </>
      )}
    </>
  );
}
