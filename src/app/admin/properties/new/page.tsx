'use client';

import Link from 'next/link';
import PropertyForm from '@/components/admin/PropertyForm';

export default function NewPropertyPage() {
  return (
    <div>
      <div className="flex items-start justify-between mb-8">
        <div>
          <p className="text-[11px] font-inter uppercase tracking-[0.2em] text-slate/60 mb-1">New Listing</p>
          <h1 className="font-cormorant text-[2rem] font-light text-charcoal">Add Property</h1>
          <p className="text-[12px] font-inter text-slate/50 mt-1">Create a new property listing</p>
        </div>
        <Link
          href="/admin/properties"
          className="text-[12px] font-inter text-slate/50 hover:text-slate transition-colors py-2.5"
        >
          ← Back to Properties
        </Link>
      </div>

      <PropertyForm mode="create" />
    </div>
  );
}
