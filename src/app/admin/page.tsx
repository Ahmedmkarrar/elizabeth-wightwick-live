'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  BuildingOfficeIcon,
  CurrencyPoundIcon,
  HomeModernIcon,
  ChatBubbleLeftEllipsisIcon,
  ClipboardDocumentListIcon,
  PlusIcon,
} from '@heroicons/react/24/outline';

interface Stats {
  total: number;
  forSale: number;
  toLet: number;
  available: number;
  newInquiries: number;
  totalInquiries: number;
  newValuations: number;
  totalValuations: number;
}

interface RecentProperty {
  id: string;
  address_line_1: string;
  city: string;
  postcode: string;
  price: number;
  rent_period?: string;
  status: string;
  main_image?: string;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentProperties, setRecentProperties] = useState<RecentProperty[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/stats').then((r) => r.ok ? r.json() : null),
      fetch('/api/properties?limit=6').then((r) => r.json()),
    ]).then(([s, p]) => {
      if (s) setStats(s);
      setRecentProperties(p?.properties || []);
    }).finally(() => setLoading(false));
  }, []);

  const statCards = stats ? [
    {
      label: 'Total Properties',
      value: stats.total,
      icon: BuildingOfficeIcon,
      sub: `${stats.available} available`,
    },
    {
      label: 'For Sale',
      value: stats.forSale,
      icon: CurrencyPoundIcon,
      sub: `${stats.available} active`,
    },
    {
      label: 'To Let',
      value: stats.toLet,
      icon: HomeModernIcon,
      sub: 'lettings',
    },
    {
      label: 'New Inquiries',
      value: stats.newInquiries,
      icon: ChatBubbleLeftEllipsisIcon,
      sub: `${stats.totalInquiries} total`,
    },
    {
      label: 'New Valuations',
      value: stats.newValuations,
      icon: ClipboardDocumentListIcon,
      sub: `${stats.totalValuations} total`,
    },
  ] : [];

  return (
    <div>
      <div className="mb-8">
        <p className="text-[11px] font-inter uppercase tracking-[0.2em] text-slate/60 mb-1">Welcome back</p>
        <h1 className="font-cormorant text-[2rem] font-light text-charcoal">Dashboard</h1>
      </div>

      {/* Stats Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-5 mb-10">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-white p-6 border border-beige/80 animate-pulse">
              <div className="w-10 h-10 bg-beige rounded-sm mb-4" />
              <div className="h-8 w-16 bg-beige rounded mb-2" />
              <div className="h-3 w-24 bg-beige/60 rounded" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-5 mb-10">
          {statCards.map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="bg-white p-6 border border-beige/80 hover:border-brand/20 transition-colors">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-10 h-10 bg-brand/8 flex items-center justify-center rounded-sm">
                    <Icon className="w-5 h-5 text-brand" />
                  </div>
                  <span className="text-[11px] font-inter text-slate/50">{stat.sub}</span>
                </div>
                <p className="font-cormorant text-[2.5rem] font-light text-charcoal leading-none">{stat.value}</p>
                <p className="text-[11px] font-inter uppercase tracking-[0.15em] text-slate/60 mt-2">{stat.label}</p>
              </div>
            );
          })}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Properties */}
        <div className="lg:col-span-2">
          <div className="bg-white border border-beige/80">
            <div className="flex items-center justify-between p-5 border-b border-beige/60">
              <h2 className="font-cormorant text-[1.25rem] font-normal text-charcoal">Recent Properties</h2>
              <Link
                href="/admin/properties"
                className="text-[11px] font-inter uppercase tracking-[0.15em] text-brand hover:text-brand-dark transition-colors"
              >
                View All
              </Link>
            </div>
            <div className="divide-y divide-beige/40">
              {recentProperties.length === 0 && !loading ? (
                <div className="px-5 py-8 text-center text-[13px] font-inter text-slate/40">
                  No properties yet.{' '}
                  <Link href="/admin/properties/new" className="text-brand hover:text-brand-dark">
                    Add one →
                  </Link>
                </div>
              ) : (
                recentProperties.map((property) => (
                  <Link
                    key={property.id}
                    href={`/admin/properties/${property.id}/edit`}
                    className="flex items-center gap-4 px-5 py-3.5 hover:bg-cream/40 transition-colors group"
                  >
                    <div className="w-12 h-9 bg-beige rounded-sm overflow-hidden relative flex-shrink-0">
                      {property.main_image && (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={property.main_image} alt="" className="w-full h-full object-cover" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-inter text-charcoal font-medium truncate group-hover:text-brand transition-colors">
                        {property.address_line_1}
                      </p>
                      <p className="text-[11px] font-inter text-slate/50">
                        {property.city}, {property.postcode}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-[13px] font-inter text-charcoal">
                        £{property.price.toLocaleString()}{property.rent_period ? ' pcm' : ''}
                      </p>
                      <span className={`text-[10px] font-inter uppercase tracking-wider ${
                        property.status === 'available' ? 'text-emerald-600' :
                        property.status === 'under_offer' ? 'text-amber-600' :
                        property.status === 'let_agreed' ? 'text-blue-600' :
                        'text-slate/50'
                      }`}>
                        {property.status.replace('_', ' ')}
                      </span>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div>
          <div className="bg-white border border-beige/80 p-5 mb-5">
            <h2 className="font-cormorant text-[1.25rem] font-normal text-charcoal mb-5">Quick Actions</h2>
            <div className="space-y-2.5">
              <Link
                href="/admin/properties/new"
                className="flex items-center justify-center gap-2 bg-brand text-white px-5 py-3 text-[12px] font-inter font-medium tracking-[0.1em] uppercase hover:bg-brand-dark transition-colors w-full"
              >
                <PlusIcon className="w-4 h-4" />
                Add Property
              </Link>
              <Link
                href="/admin/inquiries"
                className="flex items-center justify-center gap-2 border border-charcoal/20 text-charcoal px-5 py-3 text-[12px] font-inter font-medium tracking-[0.1em] uppercase hover:bg-charcoal hover:text-white transition-colors w-full"
              >
                View Inquiries
                {stats && stats.newInquiries > 0 && (
                  <span className="bg-brand text-white rounded-full w-5 h-5 text-[10px] flex items-center justify-center">
                    {stats.newInquiries}
                  </span>
                )}
              </Link>
              <Link
                href="/admin/valuations"
                className="flex items-center justify-center gap-2 border border-charcoal/20 text-charcoal px-5 py-3 text-[12px] font-inter font-medium tracking-[0.1em] uppercase hover:bg-charcoal hover:text-white transition-colors w-full"
              >
                Valuations
                {stats && stats.newValuations > 0 && (
                  <span className="bg-brand text-white rounded-full w-5 h-5 text-[10px] flex items-center justify-center">
                    {stats.newValuations}
                  </span>
                )}
              </Link>
            </div>
          </div>

          {/* Help card */}
          <div className="bg-brand/5 border border-brand/10 p-5">
            <p className="text-[11px] font-inter uppercase tracking-[0.15em] text-brand mb-2">Getting Started</p>
            <p className="text-[13px] font-inter text-charcoal/70 leading-relaxed">
              Add properties, manage inquiries, and track valuations — all from this dashboard.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
