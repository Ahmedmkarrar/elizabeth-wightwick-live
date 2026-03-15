'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import type { Property, PropertyStatus } from '@/types';
import {
  MagnifyingGlassIcon,
  PencilSquareIcon,
  TrashIcon,
  ArrowTopRightOnSquareIcon,
  StarIcon,
  CheckIcon,
  PlusIcon,
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';

const STATUS_OPTIONS: { value: PropertyStatus; label: string }[] = [
  { value: 'available', label: 'Available' },
  { value: 'under_offer', label: 'Under Offer' },
  { value: 'let_agreed', label: 'Let Agreed' },
  { value: 'sold', label: 'Sold' },
];

const STATUS_COLORS: Record<PropertyStatus, string> = {
  available: 'bg-emerald-50 text-emerald-700',
  under_offer: 'bg-amber-50 text-amber-700',
  let_agreed: 'bg-blue-50 text-blue-700',
  sold: 'bg-slate/10 text-slate',
};

export default function AdminPropertiesPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [deptFilter, setDeptFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [statusLoading, setStatusLoading] = useState<string | null>(null);
  const [statusSuccess, setStatusSuccess] = useState<string | null>(null);
  const [featuredLoading, setFeaturedLoading] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadProperties = useCallback(async () => {
    setLoadingData(true);
    try {
      const res = await fetch('/api/properties?limit=200');
      const json = await res.json();
      setProperties(json.properties || []);
    } catch {
      setProperties([]);
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => { loadProperties(); }, [loadProperties]);

  const filtered = properties.filter((p) => {
    if (deptFilter !== 'all' && p.department !== deptFilter) return false;
    if (statusFilter !== 'all' && p.status !== statusFilter) return false;
    if (
      search &&
      !p.address_line_1.toLowerCase().includes(search.toLowerCase()) &&
      !p.city.toLowerCase().includes(search.toLowerCase()) &&
      !p.postcode.toLowerCase().includes(search.toLowerCase())
    ) return false;
    return true;
  });

  const handleStatusChange = async (id: string, newStatus: PropertyStatus) => {
    setStatusLoading(id);
    try {
      await fetch(`/api/properties/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      setProperties((prev) => prev.map((p) => p.id === id ? { ...p, status: newStatus } : p));
      setStatusSuccess(id);
      setTimeout(() => setStatusSuccess(null), 1500);
    } finally {
      setStatusLoading(null);
    }
  };

  const handleFeaturedToggle = async (id: string, current: boolean) => {
    setFeaturedLoading(id);
    try {
      await fetch(`/api/properties/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ featured: !current }),
      });
      setProperties((prev) => prev.map((p) => p.id === id ? { ...p, featured: !current } : p));
    } finally {
      setFeaturedLoading(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await fetch(`/api/properties/${deleteId}`, { method: 'DELETE' });
      setProperties((prev) => prev.filter((p) => p.id !== deleteId));
    } finally {
      setDeleting(false);
      setDeleteId(null);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-[11px] font-inter uppercase tracking-[0.2em] text-slate/60 mb-1">Manage</p>
          <h1 className="font-cormorant text-[2rem] font-light text-charcoal">Properties</h1>
          <p className="text-[12px] font-inter text-slate/50 mt-1">
            {loadingData ? 'Loading...' : `${filtered.length} of ${properties.length} properties`}
          </p>
        </div>
        <Link
          href="/admin/properties/new"
          className="inline-flex items-center gap-2 bg-brand text-white px-5 py-2.5 text-[12px] font-inter font-medium tracking-[0.08em] uppercase hover:bg-brand-dark transition-colors"
        >
          <PlusIcon className="w-4 h-4" />
          Add Property
        </Link>
      </div>

      {/* Search + Filters */}
      <div className="bg-white border border-beige/80 p-4 mb-6 flex flex-col gap-3">
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate/40" />
          <input
            type="text"
            placeholder="Search by address, city or postcode..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 border border-beige text-[13px] font-inter text-charcoal placeholder:text-slate/30 focus:outline-none focus:border-brand/50 transition-colors"
          />
        </div>

        <div className="flex flex-wrap gap-3">
          <div className="flex border border-beige overflow-hidden">
            {(['all', 'sales', 'lettings'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setDeptFilter(f)}
                className={cn(
                  'px-3 py-1.5 text-[11px] font-inter font-medium uppercase tracking-wider transition-colors',
                  deptFilter === f ? 'bg-charcoal text-white' : 'bg-white text-slate hover:bg-cream'
                )}
              >
                {f === 'all' ? 'All' : f}
              </button>
            ))}
          </div>

          <div className="flex border border-beige overflow-hidden">
            {[
              { v: 'all', l: 'Any Status' },
              { v: 'available', l: 'Available' },
              { v: 'under_offer', l: 'Under Offer' },
              { v: 'let_agreed', l: 'Let Agreed' },
              { v: 'sold', l: 'Sold' },
            ].map((s) => (
              <button
                key={s.v}
                onClick={() => setStatusFilter(s.v)}
                className={cn(
                  'px-3 py-1.5 text-[11px] font-inter font-medium uppercase tracking-wider transition-colors border-r border-beige last:border-r-0',
                  statusFilter === s.v ? 'bg-charcoal text-white' : 'bg-white text-slate hover:bg-cream'
                )}
              >
                {s.l}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-beige/80 overflow-x-auto">
        {loadingData ? (
          <div className="text-center py-16 text-slate/40 font-inter text-[13px]">
            Loading properties...
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-beige/60">
                <th className="text-left py-3.5 px-4 text-[10px] font-inter font-medium uppercase tracking-[0.15em] text-slate/50">Property</th>
                <th className="text-left py-3.5 px-4 text-[10px] font-inter font-medium uppercase tracking-[0.15em] text-slate/50">Status</th>
                <th className="text-left py-3.5 px-4 text-[10px] font-inter font-medium uppercase tracking-[0.15em] text-slate/50 hidden md:table-cell">Dept</th>
                <th className="text-left py-3.5 px-4 text-[10px] font-inter font-medium uppercase tracking-[0.15em] text-slate/50 hidden lg:table-cell">Price</th>
                <th className="text-right py-3.5 px-4 text-[10px] font-inter font-medium uppercase tracking-[0.15em] text-slate/50">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((property) => (
                <tr key={property.id} className="border-b border-beige/30 hover:bg-cream/30 transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="relative w-14 h-10 overflow-hidden bg-beige flex-shrink-0">
                        {property.main_image ? (
                          <Image src={property.main_image} alt="" fill className="object-cover" sizes="56px" />
                        ) : (
                          <div className="w-full h-full bg-beige" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[13px] font-inter text-charcoal font-medium truncate max-w-[160px] lg:max-w-[260px]">
                          {property.address_line_1}
                        </p>
                        <p className="text-[11px] font-inter text-slate/50">{property.city}, {property.postcode}</p>
                      </div>
                    </div>
                  </td>

                  <td className="py-3 px-4">
                    {statusLoading === property.id ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-inter bg-slate/5 text-slate/60">
                        <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Saving...
                      </span>
                    ) : statusSuccess === property.id ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-inter bg-emerald-50 text-emerald-700">
                        <CheckIcon className="w-3 h-3" />
                        Saved!
                      </span>
                    ) : (
                      <select
                        value={property.status}
                        onChange={(e) => handleStatusChange(property.id, e.target.value as PropertyStatus)}
                        className={cn(
                          'appearance-none cursor-pointer px-2.5 py-1 text-[10px] font-inter font-semibold uppercase tracking-wider border-0 focus:outline-none focus:ring-1 focus:ring-brand/20',
                          STATUS_COLORS[property.status]
                        )}
                      >
                        {STATUS_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    )}
                  </td>

                  <td className="py-3 px-4 hidden md:table-cell">
                    <span className="text-[11px] font-inter text-slate capitalize bg-beige/50 px-2 py-0.5">
                      {property.department}
                    </span>
                  </td>

                  <td className="py-3 px-4 hidden lg:table-cell">
                    <span className="text-[13px] font-inter text-charcoal font-medium">
                      £{property.price.toLocaleString()}{property.rent_period ? ' pcm' : ''}
                    </span>
                  </td>

                  <td className="py-3 px-4">
                    <div className="flex items-center justify-end gap-0.5">
                      <button
                        onClick={() => handleFeaturedToggle(property.id, property.featured)}
                        disabled={featuredLoading === property.id}
                        title={property.featured ? 'Remove from featured' : 'Add to featured'}
                        className={cn(
                          'p-2 rounded transition-colors disabled:opacity-40',
                          property.featured
                            ? 'text-amber-500 hover:text-amber-600 hover:bg-amber-50'
                            : 'text-slate/30 hover:text-amber-500 hover:bg-amber-50'
                        )}
                      >
                        {property.featured ? <StarIconSolid className="w-4 h-4" /> : <StarIcon className="w-4 h-4" />}
                      </button>

                      <Link
                        href={`/admin/properties/${property.id}/edit`}
                        className="p-2 text-slate/40 hover:text-brand hover:bg-brand/5 rounded transition-colors"
                        title="Edit property"
                      >
                        <PencilSquareIcon className="w-4 h-4" />
                      </Link>

                      <a
                        href={`/properties/${property.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 text-slate/40 hover:text-charcoal hover:bg-beige rounded transition-colors"
                        title="View on site"
                      >
                        <ArrowTopRightOnSquareIcon className="w-4 h-4" />
                      </a>

                      <button
                        onClick={() => setDeleteId(property.id)}
                        className="p-2 text-slate/30 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                        title="Delete property"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {!loadingData && filtered.length === 0 && (
          <div className="text-center py-16 text-slate/40 font-inter text-[13px]">
            No properties found.{' '}
            <Link href="/admin/properties/new" className="text-brand hover:text-brand-dark">
              Add your first property →
            </Link>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={!!deleteId} onClose={() => setDeleteId(null)} title="Delete Property" size="sm">
        <p className="text-body text-slate font-inter font-light mb-6">
          Are you sure you want to delete this property? This action cannot be undone.
        </p>
        <div className="flex gap-3 justify-end">
          <Button variant="secondary" onClick={() => setDeleteId(null)}>Cancel</Button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="bg-red-600 text-white px-5 py-2.5 text-[12px] font-inter font-medium uppercase tracking-wider hover:bg-red-700 transition-colors disabled:opacity-60"
          >
            {deleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
