'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import PropertyForm from '@/components/admin/PropertyForm';
import type { Property } from '@/types';

export default function EditPropertyPage() {
  const { id } = useParams<{ id: string }>();
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    fetch(`/api/properties/${id}`)
      .then((res) => {
        if (!res.ok) { setNotFound(true); return null; }
        return res.json();
      })
      .then((data) => {
        if (data) setProperty(data);
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-slate/40 font-inter text-[13px]">
        Loading...
      </div>
    );
  }

  if (notFound || !property) {
    return (
      <div className="py-12 text-center">
        <h1 className="font-cormorant text-[2rem] font-light text-charcoal">Property Not Found</h1>
        <Link
          href="/admin/properties"
          className="text-brand hover:text-brand-dark mt-4 inline-block font-inter text-[13px]"
        >
          ← Back to Properties
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-start justify-between mb-8">
        <div>
          <p className="text-[11px] font-inter uppercase tracking-[0.2em] text-slate/60 mb-1">Edit</p>
          <h1 className="font-cormorant text-[2rem] font-light text-charcoal">
            {property.address_line_1}
          </h1>
          <p className="text-[12px] font-inter text-slate/50 mt-1">
            {property.city}, {property.postcode}
          </p>
        </div>
        <div className="flex gap-3">
          <a
            href={`/properties/${property.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="border border-charcoal/20 text-charcoal px-5 py-2.5 text-[12px] font-inter font-medium tracking-[0.08em] uppercase hover:bg-charcoal hover:text-white transition-colors"
          >
            View Live
          </a>
          <Link
            href="/admin/properties"
            className="text-[12px] font-inter text-slate/50 hover:text-slate transition-colors px-2 py-2.5"
          >
            ← Back
          </Link>
        </div>
      </div>

      <PropertyForm mode="edit" property={property} />
    </div>
  );
}
