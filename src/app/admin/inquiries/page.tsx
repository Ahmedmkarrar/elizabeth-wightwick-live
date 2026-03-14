'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface Inquiry {
  id: string;
  name: string;
  email: string;
  phone?: string;
  type: string;
  property_id?: string;
  message?: string;
  preferred_time?: string;
  status: string;
  created_at: string;
}

const statusColors: Record<string, string> = {
  new: 'bg-emerald-500',
  replied: 'bg-amber-500',
  closed: 'bg-slate/30',
};

const statusBadge: Record<string, string> = {
  new: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  replied: 'bg-amber-50 text-amber-700 border-amber-200',
  closed: 'bg-slate/5 text-slate/50 border-slate/15',
};

export default function AdminInquiriesPage() {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/inquiries')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setInquiries(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleStatusChange = async (id: string, newStatus: string) => {
    setUpdatingId(id);
    try {
      await fetch(`/api/inquiries/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      setInquiries((prev) =>
        prev.map((i) => (i.id === id ? { ...i, status: newStatus } : i))
      );
    } catch {}
    setUpdatingId(null);
  };

  const filtered = filter === 'all' ? inquiries : inquiries.filter((i) => i.status === filter);
  const newCount = inquiries.filter((i) => i.status === 'new').length;

  return (
    <div>
      <div className="flex items-start justify-between mb-8">
        <div>
          <p className="text-[11px] font-inter uppercase tracking-[0.2em] text-slate/60 mb-1">Manage</p>
          <h1 className="font-cormorant text-[2rem] font-light text-charcoal">Inquiries</h1>
          <p className="text-[12px] font-inter text-slate/50 mt-1">{inquiries.length} total</p>
        </div>
        {newCount > 0 && (
          <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1.5 text-[11px] font-inter font-medium rounded-sm">
            {newCount} new
          </span>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {['all', 'new', 'replied', 'closed'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              'px-4 py-2 text-[12px] font-inter capitalize transition-all border',
              filter === f
                ? 'bg-charcoal text-white border-charcoal'
                : 'bg-white text-slate border-beige hover:border-charcoal/30'
            )}
          >
            {f}{f !== 'all' && ` (${inquiries.filter((i) => i.status === f).length})`}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white border border-beige/80 overflow-x-auto">
        {loading ? (
          <div className="py-16 text-center text-[13px] font-inter text-slate/40">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-[13px] font-inter text-slate/40">No inquiries yet.</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-beige/60">
                <th className="text-left py-3.5 px-5 text-[10px] font-inter font-medium uppercase tracking-[0.15em] text-slate/50">Status</th>
                <th className="text-left py-3.5 px-5 text-[10px] font-inter font-medium uppercase tracking-[0.15em] text-slate/50">Name</th>
                <th className="text-left py-3.5 px-5 text-[10px] font-inter font-medium uppercase tracking-[0.15em] text-slate/50">Contact</th>
                <th className="text-left py-3.5 px-5 text-[10px] font-inter font-medium uppercase tracking-[0.15em] text-slate/50">Type</th>
                <th className="text-left py-3.5 px-5 text-[10px] font-inter font-medium uppercase tracking-[0.15em] text-slate/50 hidden md:table-cell">Date</th>
                <th className="text-left py-3.5 px-5 text-[10px] font-inter font-medium uppercase tracking-[0.15em] text-slate/50">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((inquiry) => (
                <tr key={inquiry.id} className="border-b border-beige/30 hover:bg-cream/30 transition-colors">
                  <td className="py-3.5 px-5">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${statusColors[inquiry.status] ?? 'bg-slate/30'}`} />
                      <span className={`inline-block px-2 py-0.5 text-[10px] font-inter font-medium capitalize border rounded-sm ${statusBadge[inquiry.status] ?? 'bg-slate/5 text-slate/50 border-slate/15'}`}>
                        {inquiry.status}
                      </span>
                    </div>
                  </td>
                  <td className="py-3.5 px-5 text-[13px] font-inter text-charcoal font-medium">{inquiry.name}</td>
                  <td className="py-3.5 px-5">
                    <a href={`mailto:${inquiry.email}`} className="text-[12px] font-inter text-brand hover:underline">{inquiry.email}</a>
                    {inquiry.phone && <p className="text-[11px] font-inter text-slate/50">{inquiry.phone}</p>}
                  </td>
                  <td className="py-3.5 px-5">
                    <span className="text-[12px] font-inter text-slate capitalize bg-beige/50 px-2 py-0.5">{inquiry.type}</span>
                    {inquiry.preferred_time && (
                      <p className="text-[11px] font-inter text-slate/50 mt-0.5">{inquiry.preferred_time}</p>
                    )}
                  </td>
                  <td className="py-3.5 px-5 text-[12px] font-inter text-slate/60 hidden md:table-cell">
                    {format(new Date(inquiry.created_at), 'd MMM yyyy')}
                  </td>
                  <td className="py-3.5 px-5">
                    <div className="flex items-center gap-3">
                      <a
                        href={`mailto:${inquiry.email}?subject=Re: Your enquiry&body=Dear ${inquiry.name},%0D%0A%0D%0AThank you for your enquiry.`}
                        className="text-[11px] font-inter text-brand hover:text-brand-dark transition-colors font-medium uppercase tracking-wider"
                      >
                        Reply
                      </a>
                      {inquiry.status === 'new' && (
                        <button
                          onClick={() => handleStatusChange(inquiry.id, 'replied')}
                          disabled={updatingId === inquiry.id}
                          className="text-[11px] font-inter text-slate/50 hover:text-slate transition-colors uppercase tracking-wider disabled:opacity-40"
                        >
                          Mark replied
                        </button>
                      )}
                    </div>
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
