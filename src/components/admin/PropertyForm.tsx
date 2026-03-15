'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Input, Textarea, Select } from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { createProperty, updateProperty } from '@/lib/data';
import type { Property, PropertyStatus } from '@/types';
import {
  PhotoIcon,
  XMarkIcon,
  ArrowUpTrayIcon,
  StarIcon,
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';

interface PropertyFormProps {
  property?: Property;
  mode: 'create' | 'edit';
}

export default function PropertyForm({ property, mode }: PropertyFormProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [address1, setAddress1] = useState(property?.address_line_1 ?? '');
  const [address2, setAddress2] = useState(property?.address_line_2 ?? '');
  const [city, setCity] = useState(property?.city ?? '');
  const [postcode, setPostcode] = useState(property?.postcode ?? '');
  const [department, setDepartment] = useState<'sales' | 'lettings'>(property?.department ?? 'sales');
  const [propertyType, setPropertyType] = useState<Property['property_type']>(property?.property_type ?? 'house');
  const [price, setPrice] = useState(String(property?.price ?? ''));
  const [priceQualifier, setPriceQualifier] = useState<Property['price_qualifier']>(property?.price_qualifier ?? 'fixed');
  const [rentPeriod, setRentPeriod] = useState(property?.rent_period ?? 'pcm');
  const [status, setStatus] = useState<PropertyStatus>(property?.status ?? 'available');
  const [bedrooms, setBedrooms] = useState(String(property?.bedrooms ?? ''));
  const [bathrooms, setBathrooms] = useState(String(property?.bathrooms ?? ''));
  const [receptions, setReceptions] = useState(String(property?.reception_rooms ?? ''));
  const [description, setDescription] = useState(property?.description ?? '');
  const [features, setFeatures] = useState(property?.features.join(', ') ?? '');
  const [tenure, setTenure] = useState(property?.tenure ?? '');
  const [epcRating, setEpcRating] = useState(property?.epc_rating ?? '');
  const [councilTax, setCouncilTax] = useState(property?.council_tax_band ?? '');
  const [leaseLength, setLeaseLength] = useState(String(property?.lease_length ?? ''));
  const [serviceCharge, setServiceCharge] = useState(String(property?.service_charge ?? ''));
  const [groundRent, setGroundRent] = useState(String(property?.ground_rent ?? ''));
  const [featured, setFeatured] = useState(property?.featured ?? false);

  // Image state
  const [images, setImages] = useState<string[]>(property?.images ?? []);
  const [mainImage, setMainImage] = useState(property?.main_image ?? '');
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const handleFileUpload = async (files: FileList) => {
    setUploading(true);
    setUploadError('');
    const newUrls: string[] = [];

    for (const file of Array.from(files)) {
      const formData = new FormData();
      formData.append('file', file);
      try {
        const res = await fetch('/api/admin/upload', { method: 'POST', body: formData });
        if (!res.ok) throw new Error('Upload failed');
        const json = await res.json();
        newUrls.push(json.url);
      } catch {
        setUploadError(`Failed to upload ${file.name}`);
      }
    }

    setImages((prev) => {
      const updated = [...prev, ...newUrls];
      if (!mainImage && updated.length > 0) setMainImage(updated[0]);
      return updated;
    });
    setUploading(false);
  };

  const handleAddUrl = () => {
    const url = imageUrlInput.trim();
    if (!url) return;
    setImages((prev) => {
      const updated = [...prev, url];
      if (!mainImage) setMainImage(url);
      return updated;
    });
    setImageUrlInput('');
  };

  const handleRemoveImage = (url: string) => {
    setImages((prev) => {
      const updated = prev.filter((u) => u !== url);
      if (mainImage === url) setMainImage(updated[0] ?? '');
      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      const data = {
        title: address1,
        address_line_1: address1,
        address_line_2: address2 || undefined,
        city,
        postcode,
        description,
        department,
        property_type: propertyType as Property['property_type'],
        price: parseFloat(price),
        price_qualifier: (priceQualifier || undefined) as Property['price_qualifier'],
        rent_period: department === 'lettings' ? rentPeriod : undefined,
        status,
        bedrooms: parseInt(bedrooms) || 0,
        bathrooms: parseInt(bathrooms) || 0,
        reception_rooms: receptions ? parseInt(receptions) : undefined,
        features: features.split(',').map((f) => f.trim()).filter(Boolean),
        images,
        main_image: mainImage || images[0] || '',
        epc_rating: epcRating || undefined,
        council_tax_band: councilTax || undefined,
        tenure: tenure || undefined,
        lease_length: leaseLength ? parseInt(leaseLength) : undefined,
        service_charge: serviceCharge ? parseFloat(serviceCharge) : undefined,
        ground_rent: groundRent ? parseFloat(groundRent) : undefined,
        featured,
      };

      if (mode === 'create') {
        await createProperty(data);
        router.push('/admin/properties');
      } else if (mode === 'edit' && property) {
        await updateProperty(property.id, data);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-4xl space-y-6">
      {/* Address */}
      <section className="bg-white border border-beige/80 p-8">
        <h2 className="font-cormorant text-[1.25rem] font-normal text-charcoal mb-6">Address</h2>
        <div className="space-y-5">
          <Input
            id="address1"
            label="Address Line 1"
            placeholder="e.g. 14 Marryat Road"
            value={address1}
            onChange={(e) => setAddress1(e.target.value)}
            required
          />
          <Input
            id="address2"
            label="Address Line 2 (optional)"
            placeholder="e.g. Wimbledon Village"
            value={address2}
            onChange={(e) => setAddress2(e.target.value)}
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Input
              id="city"
              label="City"
              placeholder="London"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              required
            />
            <Input
              id="postcode"
              label="Postcode"
              placeholder="SW19 5BB"
              value={postcode}
              onChange={(e) => setPostcode(e.target.value)}
              required
            />
          </div>
        </div>
      </section>

      {/* Property Details */}
      <section className="bg-white border border-beige/80 p-8">
        <h2 className="font-cormorant text-[1.25rem] font-normal text-charcoal mb-6">Property Details</h2>
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Select
              id="department"
              label="Department"
              value={department}
              onChange={(e) => setDepartment(e.target.value as 'sales' | 'lettings')}
              options={[
                { value: 'sales', label: 'For Sale' },
                { value: 'lettings', label: 'To Let' },
              ]}
            />
            <Select
              id="property_type"
              label="Property Type"
              value={propertyType}
              onChange={(e) => setPropertyType(e.target.value as Property['property_type'])}
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
              label={department === 'lettings' ? 'Monthly Rent (£)' : 'Price (£)'}
              type="number"
              placeholder={department === 'lettings' ? '2500' : '1250000'}
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              required
            />
            {department === 'sales' ? (
              <Select
                id="price_qualifier"
                label="Price Qualifier"
                value={priceQualifier}
                onChange={(e) => setPriceQualifier(e.target.value as Property['price_qualifier'])}
                options={[
                  { value: 'fixed', label: 'Fixed Price' },
                  { value: 'OIRO', label: 'OIRO' },
                  { value: 'OIEO', label: 'OIEO' },
                  { value: 'guide_price', label: 'Guide Price' },
                  { value: 'POA', label: 'POA' },
                ]}
              />
            ) : (
              <Select
                id="rent_period"
                label="Rent Period"
                value={rentPeriod}
                onChange={(e) => setRentPeriod(e.target.value)}
                options={[
                  { value: 'pcm', label: 'Per Calendar Month' },
                  { value: 'pw', label: 'Per Week' },
                ]}
              />
            )}
            <Select
              id="status"
              label="Status"
              value={status}
              onChange={(e) => setStatus(e.target.value as PropertyStatus)}
              options={[
                { value: 'available', label: 'Available' },
                { value: 'under_offer', label: 'Under Offer' },
                { value: 'let_agreed', label: 'Let Agreed' },
                { value: 'sold', label: 'Sold' },
              ]}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <Input
              id="bedrooms"
              label="Bedrooms"
              type="number"
              placeholder="4"
              value={bedrooms}
              onChange={(e) => setBedrooms(e.target.value)}
            />
            <Input
              id="bathrooms"
              label="Bathrooms"
              type="number"
              placeholder="3"
              value={bathrooms}
              onChange={(e) => setBathrooms(e.target.value)}
            />
            <Input
              id="receptions"
              label="Reception Rooms"
              type="number"
              placeholder="2"
              value={receptions}
              onChange={(e) => setReceptions(e.target.value)}
            />
          </div>

          {/* Featured toggle */}
          <label className="flex items-center gap-3 cursor-pointer group">
            <button
              type="button"
              onClick={() => setFeatured((v) => !v)}
              className={`w-5 h-5 flex items-center justify-center transition-colors ${
                featured ? 'text-amber-500' : 'text-slate/30 group-hover:text-amber-400'
              }`}
            >
              {featured ? <StarIconSolid className="w-5 h-5" /> : <StarIcon className="w-5 h-5" />}
            </button>
            <span className="text-[13px] font-inter text-charcoal">Featured on homepage</span>
          </label>
        </div>
      </section>

      {/* Description */}
      <section className="bg-white border border-beige/80 p-8">
        <h2 className="font-cormorant text-[1.25rem] font-normal text-charcoal mb-6">Description</h2>
        <Textarea
          id="description"
          label="Full Description"
          placeholder="Write a compelling description of the property..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="min-h-[200px]"
        />
        <div className="mt-5">
          <Input
            id="features"
            label="Key Features (comma separated)"
            placeholder="Period features, South-facing garden, Off-street parking, EV charging"
            value={features}
            onChange={(e) => setFeatures(e.target.value)}
          />
        </div>
      </section>

      {/* Images */}
      <section className="bg-white border border-beige/80 p-8">
        <h2 className="font-cormorant text-[1.25rem] font-normal text-charcoal mb-2">Images</h2>
        <p className="text-[12px] font-inter text-slate/50 mb-5">
          Click the star to set the main/cover image. Drag files or paste URLs below.
        </p>

        {/* Image grid */}
        {images.length > 0 && (
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2 mb-5">
            {images.map((url, i) => (
              <div key={i} className="relative group aspect-square bg-beige overflow-hidden rounded-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" className="w-full h-full object-cover" />

                {/* Actions overlay */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                  <button
                    type="button"
                    onClick={() => setMainImage(url)}
                    title="Set as main image"
                    className="p-1.5 bg-white/90 rounded-full hover:bg-white transition-colors"
                  >
                    {mainImage === url ? (
                      <StarIconSolid className="w-3.5 h-3.5 text-amber-500" />
                    ) : (
                      <StarIcon className="w-3.5 h-3.5 text-charcoal" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(url)}
                    title="Remove image"
                    className="p-1.5 bg-white/90 rounded-full hover:bg-red-50 transition-colors"
                  >
                    <XMarkIcon className="w-3.5 h-3.5 text-red-500" />
                  </button>
                </div>

                {mainImage === url && (
                  <span className="absolute bottom-0 left-0 right-0 bg-brand text-white text-[8px] font-inter text-center py-0.5">
                    Main
                  </span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Upload area */}
        <div
          className="border-2 border-dashed border-beige hover:border-brand/30 transition-colors p-8 text-center cursor-pointer"
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            if (e.dataTransfer.files.length > 0) handleFileUpload(e.dataTransfer.files);
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            className="hidden"
            onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
          />
          {uploading ? (
            <div className="flex items-center justify-center gap-2 text-brand">
              <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span className="text-[13px] font-inter">Uploading...</span>
            </div>
          ) : (
            <>
              <ArrowUpTrayIcon className="w-8 h-8 text-slate/30 mx-auto mb-3" />
              <p className="text-[13px] font-inter text-slate">
                <span className="text-brand font-medium">Click to upload</span> or drag and drop
              </p>
              <p className="text-[11px] font-inter text-slate/40 mt-1">JPG, PNG, WebP — max 10MB each</p>
            </>
          )}
        </div>

        {uploadError && (
          <p className="mt-2 text-[12px] font-inter text-red-500">{uploadError}</p>
        )}

        {/* URL paste */}
        <div className="mt-4 flex gap-2">
          <input
            type="url"
            placeholder="Or paste an image URL..."
            value={imageUrlInput}
            onChange={(e) => setImageUrlInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddUrl())}
            className="flex-1 border border-beige px-3 py-2 text-[12px] font-inter text-charcoal placeholder:text-slate/30 focus:outline-none focus:border-brand/50"
          />
          <button
            type="button"
            onClick={handleAddUrl}
            className="px-4 py-2 bg-brand text-white text-[12px] font-inter font-medium hover:bg-brand-dark transition-colors"
          >
            <PhotoIcon className="w-4 h-4" />
          </button>
        </div>
      </section>

      {/* Additional Details */}
      <section className="bg-white border border-beige/80 p-8">
        <h2 className="font-cormorant text-[1.25rem] font-normal text-charcoal mb-6">Additional Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <Select
            id="tenure"
            label="Tenure"
            value={tenure}
            onChange={(e) => setTenure(e.target.value)}
            options={[
              { value: '', label: 'N/A' },
              { value: 'Freehold', label: 'Freehold' },
              { value: 'Leasehold', label: 'Leasehold' },
              { value: 'Share of Freehold', label: 'Share of Freehold' },
            ]}
          />
          <Select
            id="epc_rating"
            label="EPC Rating"
            value={epcRating}
            onChange={(e) => setEpcRating(e.target.value)}
            options={[
              { value: '', label: 'N/A' },
              ...['A', 'B', 'C', 'D', 'E', 'F', 'G'].map((b) => ({ value: b, label: b })),
            ]}
          />
          <Select
            id="council_tax_band"
            label="Council Tax Band"
            value={councilTax}
            onChange={(e) => setCouncilTax(e.target.value)}
            options={[
              { value: '', label: 'N/A' },
              ...['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].map((b) => ({ value: b, label: `Band ${b}` })),
            ]}
          />
        </div>
        {tenure === 'Leasehold' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-5">
            <Input
              id="lease_length"
              label="Lease Length (years)"
              type="number"
              placeholder="125"
              value={leaseLength}
              onChange={(e) => setLeaseLength(e.target.value)}
            />
            <Input
              id="service_charge"
              label="Service Charge (£/yr)"
              type="number"
              placeholder="3600"
              value={serviceCharge}
              onChange={(e) => setServiceCharge(e.target.value)}
            />
            <Input
              id="ground_rent"
              label="Ground Rent (£/yr)"
              type="number"
              placeholder="250"
              value={groundRent}
              onChange={(e) => setGroundRent(e.target.value)}
            />
          </div>
        )}
      </section>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 px-5 py-3">
          <p className="text-[13px] font-inter text-red-600">{error}</p>
        </div>
      )}

      {/* Submit */}
      <div className="flex items-center gap-4 pb-8">
        <Button type="submit" loading={saving}>
          {mode === 'create' ? 'Publish Property' : 'Save Changes'}
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => router.push('/admin/properties')}
        >
          Cancel
        </Button>
        {saved && (
          <span className="text-[13px] font-inter text-emerald-600">✓ Saved successfully</span>
        )}
      </div>
    </form>
  );
}
