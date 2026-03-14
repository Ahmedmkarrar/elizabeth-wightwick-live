'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface Valuation {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  property_type?: string;
  bedrooms?: string;
  best_time?: string;
  additional_info?: string;
  status: string;
  created_at: string;
}

const pipelineSteps = ['new', 'contacted', 'booked', 'completed'];
const pipelineLabels: Record<string, string> = { new: 'New', contacted: 'Contacted', booked: 'Booked', completed: 'Completed' };
const pipelineColors: Record<string, string> = {
  new: 'bg-emerald-500',
  contacted: 'bg-blue-500',
  booked: 'bg-amber-500',
  completed: 'bg-slate/40',
};
const badgeColors: Record<string, string> = {
  new: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  contacted: 'bg-blue-50 text-blue-700 border-blue-200',
  booked: 'bg-amber-50 text-amber-700 border-amber-200',
  completed: 'bg-slate/5 text-slate/50 border-slate/15',
};

export default function AdminValuationsPage() {
  const [valuations, setValuations] = useState<Valuation[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/valuations')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setValuations(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleStatusChange = async (id: string, newStatus: string) => {
    setUpdatingId(id);
    try {
      await fetch(`/api/valuations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      setValuations((prev) =>
        prev.map((v) => (v.id === id ? { ...v, status: newStatus } : v))
      );
    } catch {}
    setUpdatingId(null);
  };

  return (
    <div>
      <div className="mb-8">
        <p className="text-[11px] font-inter uppercase tracking-[0.2em] text-slate/60 mb-1">Manage</p>
        <h1 className="font-cormorant text-[2rem] font-light text-charcoal">Valuation Requests</h1>
        <p className="text-[12px] font-inter text-slate/50 mt-1">{valuations.length} total</p>
      </div>

      {/* Pipeline */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        {pipelineSteps.map((step) => {
          const count = valuations.filter((v) => v.status === step).length;
          return (
            <div key={step} className="bg-white border border-beige/80 p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className={`w-2 h-2 rounded-full ${pipelineColors[step]}`} />
                <span className="text-[11px] font-inter uppercase tracking-[0.15em] text-slate/60">{pipelineLabels[step]}</span>
              </div>
              <p className="font-cormorant text-[1.75rem] font-light text-charcoal">{count}</p>
            </div>
          );
        })}
      </div>

      {/* Table */}
      <div className="bg-white border border-beige/80 overflow-x-auto">
        {loading ? (
          <div className="py-16 text-center text-[13px] font-inter text-slate/40">Loading...</div>
        ) : valuations.length === 0 ? (
          <div className="py-16 text-center text-[13px] font-inter text-slate/40">No valuation requests yet.</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-beige/60">
                <th className="text-left py-3.5 px-5 text-[10px] font-inter font-medium uppercase tracking-[0.15em] text-slate/50">Status</th>
                <th className="text-left py-3.5 px-5 text-[10px] font-inter font-medium uppercase tracking-[0.15em] text-slate/50">Name</th>
                <th className="text-left py-3.5 px-5 text-[10px] font-inter font-medium uppercase tracking-[0.15em] text-slate/50">Property</th>
                <th className="text-left py-3.5 px-5 text-[10px] font-inter font-medium uppercase tracking-[0.15em] text-slate/50 hidden md:table-cell">Contact</th>
                <th className="text-left py-3.5 px-5 text-[10px] font-inter font-medium uppercase tracking-[0.15em] text-slate/50 hidden lg:table-cell">Date</th>
                <th className="text-left py-3.5 px-5 text-[10px] font-inter font-medium uppercase tracking-[0.15em] text-slate/50">Actions</th>
              </tr>
            </thead>
            <tbody>
              {valuations.map((val) => (
                <tr key={val.id} className="border-b border-beige/30 hover:bg-cream/30 transition-colors">
                  <td className="py-3.5 px-5">
                    <select
                      value={val.status}
                      onChange={(e) => handleStatusChange(val.id, e.target.value)}
                      disabled={updatingId === val.id}
                      className={cn(
                        'appearance-none cursor-pointer px-2 py-0.5 text-[10px] font-inter font-medium capitalize border rounded-sm focus:outline-none disabled:opacity-50',
                        badgeColors[val.status] ?? 'bg-slate/5 text-slate/50 border-slate/15'
                      )}
                    >
                      {pipelineSteps.map((s) => (
                        <option key={s} value={s}>{pipelineLabels[s]}</option>
                      ))}
                    </select>
                  </td>
                  <td className="py-3.5 px-5 text-[13px] font-inter text-charcoal font-medium">{val.name}</td>
                  <td className="py-3.5 px-5">
                    <p className="text-[12px] font-inter text-slate">{val.address}</p>
                    {val.property_type && (
                      <p className="text-[11px] font-inter text-slate/50 capitalize">{val.property_type}{val.bedrooms ? ` · ${val.bedrooms} bed` : ''}</p>
                    )}
                  </td>
                  <td className="py-3.5 px-5 hidden md:table-cell">
                    <a href={`tel:${val.phone}`} className="text-[12px] font-inter text-slate hover:text-charcoal">{val.phone}</a>
                    <p className="text-[11px] font-inter text-slate/50">{val.best_time ? `Best: ${val.best_time}` : ''}</p>
                  </td>
                  <td className="py-3.5 px-5 text-[12px] font-inter text-slate/60 hidden lg:table-cell">
                    {format(new Date(val.created_at), 'd MMM yyyy')}
                  </td>
                  <td className="py-3.5 px-5">
                    <a
                      href={`mailto:${val.email}?subject=Your Valuation Request&body=Dear ${val.name},%0D%0A%0D%0AThank you for requesting a valuation.`}
                      className="text-[11px] font-inter text-brand hover:text-brand-dark transition-colors font-medium uppercase tracking-wider"
                    >
                      Reply
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
