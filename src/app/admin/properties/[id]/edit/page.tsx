'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { mockProperties } from '@/lib/mock-data';
import { Input, Textarea, Select } from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import type { PropertyStatus } from '@/types';

export default function EditPropertyPage() {
  const { id } = useParams();
  const router = useRouter();
  const property = mockProperties.find((p) => p.id === id);

  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  if (!property) {
    return (
      <div className="py-12 text-center">
        <h1 className="heading-title text-charcoal">Property Not Found</h1>
        <Link
          href="/admin/properties"
          className="text-brand hover:text-brand-dark mt-4 inline-block font-inter text-small"
        >
          Back to Properties
        </Link>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1200));
    setLoading(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div>
      {/* Header */}
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

      <form onSubmit={handleSubmit} className="max-w-4xl space-y-6">
        {/* Address */}
        <div className="bg-white border border-beige/80 p-8">
          <h2 className="font-cormorant text-[1.25rem] font-normal text-charcoal mb-6">Address</h2>
          <div className="space-y-5">
            <Input
              id="address1"
              label="Address Line 1"
              defaultValue={property.address_line_1}
              required
            />
            <Input
              id="address2"
              label="Address Line 2"
              defaultValue={property.address_line_2 ?? ''}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Input id="city" label="City" defaultValue={property.city} required />
              <Input id="postcode" label="Postcode" defaultValue={property.postcode} required />
            </div>
          </div>
        </div>

        {/* Property Details */}
        <div className="bg-white border border-beige/80 p-8">
          <h2 className="font-cormorant text-[1.25rem] font-normal text-charcoal mb-6">
            Property Details
          </h2>
          <div className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Select
                id="department"
                label="Department"
                defaultValue={property.department}
                options={[
                  { value: 'sales', label: 'For Sale' },
                  { value: 'lettings', label: 'To Let' },
                ]}
              />
              <Select
                id="type"
                label="Property Type"
                defaultValue={property.property_type}
                options={[
                  { value: 'house', label: 'House' },
                  { value: 'flat', label: 'Flat / Apartment' },
                  { value: 'studio', label: 'Studio' },
                  { value: 'land', label: 'Land' },
                ]}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <Input
                id="price"
                label="Price"
                type="number"
                defaultValue={String(property.price)}
                required
              />
              <Select
                id="qualifier"
                label="Price Qualifier"
                defaultValue={property.price_qualifier ?? 'fixed'}
                options={[
                  { value: 'fixed', label: 'Fixed Price' },
                  { value: 'OIRO', label: 'OIRO' },
                  { value: 'OIEO', label: 'OIEO' },
                  { value: 'guide_price', label: 'Guide Price' },
                  { value: 'POA', label: 'POA' },
                ]}
              />
              <Select
                id="status"
                label="Status"
                defaultValue={property.status}
                options={[
                  { value: 'available', label: 'Available' },
                  { value: 'under_offer', label: 'Under Offer' },
                  { value: 'sold', label: 'Sold' },
                  { value: 'let_agreed', label: 'Let Agreed' },
                ] as { value: PropertyStatus; label: string }[]}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <Input
                id="bedrooms"
                label="Bedrooms"
                type="number"
                defaultValue={String(property.bedrooms)}
              />
              <Input
                id="bathrooms"
                label="Bathrooms"
                type="number"
                defaultValue={String(property.bathrooms)}
              />
              <Input
                id="receptions"
                label="Reception Rooms"
                type="number"
                defaultValue={String(property.reception_rooms ?? 0)}
              />
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="bg-white border border-beige/80 p-8">
          <h2 className="font-cormorant text-[1.25rem] font-normal text-charcoal mb-6">
            Description
          </h2>
          <Textarea
            id="description"
            label="Full Description"
            defaultValue={property.description}
            className="min-h-[200px]"
          />
          <div className="mt-5">
            <Input
              id="features"
              label="Key Features (comma separated)"
              defaultValue={property.features.join(', ')}
            />
          </div>
        </div>

        {/* Additional Details */}
        <div className="bg-white border border-beige/80 p-8">
          <h2 className="font-cormorant text-[1.25rem] font-normal text-charcoal mb-6">
            Additional Details
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <Select
              id="tenure"
              label="Tenure"
              defaultValue={property.tenure ?? ''}
              options={[
                { value: '', label: 'N/A' },
                { value: 'Freehold', label: 'Freehold' },
                { value: 'Leasehold', label: 'Leasehold' },
                { value: 'Share of Freehold', label: 'Share of Freehold' },
              ]}
            />
            <Select
              id="epc"
              label="EPC Rating"
              defaultValue={property.epc_rating ?? ''}
              options={[
                { value: '', label: 'N/A' },
                ...['A', 'B', 'C', 'D', 'E'].map((b) => ({ value: b, label: b })),
              ]}
            />
            <Select
              id="council-tax"
              label="Council Tax Band"
              defaultValue={property.council_tax_band ?? ''}
              options={[
                { value: '', label: 'N/A' },
                ...['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].map((b) => ({
                  value: b,
                  label: `Band ${b}`,
                })),
              ]}
            />
          </div>
        </div>

        {/* Current Images */}
        <div className="bg-white border border-beige/80 p-8">
          <h2 className="font-cormorant text-[1.25rem] font-normal text-charcoal mb-2">Images</h2>
          <p className="text-[12px] font-inter text-slate/50 mb-5">
            {property.images.length} images currently attached
          </p>
          <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-2 mb-6">
            {property.images.slice(0, 8).map((img, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <div key={i} className="relative aspect-square bg-beige overflow-hidden group">
                <img src={img} alt="" className="w-full h-full object-cover" />
                {i === 0 && (
                  <span className="absolute bottom-0 left-0 right-0 bg-brand text-white text-[8px] font-inter text-center py-0.5">
                    Main
                  </span>
                )}
              </div>
            ))}
            {property.images.length > 8 && (
              <div className="aspect-square bg-beige/50 flex items-center justify-center">
                <span className="text-[11px] font-inter text-slate/50">+{property.images.length - 8}</span>
              </div>
            )}
          </div>
          <div className="border-2 border-dashed border-taupe/30 p-8 text-center">
            <p className="text-[13px] font-inter text-slate">Add more images</p>
            <p className="text-[11px] font-inter text-slate/40 mt-1">JPG, PNG, WebP — max 10MB each</p>
            <input type="file" multiple accept="image/*" className="mt-4 text-[12px] font-inter text-slate" />
          </div>
        </div>

        {/* Submit */}
        <div className="flex items-center gap-4">
          <Button type="submit" loading={loading}>
            Save Changes
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => router.push('/admin/properties')}
          >
            Cancel
          </Button>
          {saved && (
            <span className="text-[13px] font-inter text-emerald-600">
              ✓ Changes saved successfully
            </span>
          )}
        </div>
      </form>
    </div>
  );
}
