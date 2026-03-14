'use client';

import { useState } from 'react';
import { Input, Textarea, Select } from '@/components/ui/Input';
import Button from '@/components/ui/Button';

export default function ValuationForm() {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const form = e.currentTarget;
    const data = new FormData(form);

    try {
      const res = await fetch('/api/valuations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: data.get('address'),
          property_type: data.get('property_type') || undefined,
          bedrooms: data.get('bedrooms') || undefined,
          name: data.get('name'),
          email: data.get('email'),
          phone: data.get('phone'),
          best_time: data.get('best_time') || undefined,
          additional_info: data.get('additional_info') || undefined,
        }),
      });

      if (!res.ok && res.status !== 201) {
        throw new Error('Submission failed');
      }

      setSubmitted(true);
    } catch {
      setError('Something went wrong. Please try again or call us on 0203 597 3484.');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="text-center py-12">
        <h3 className="heading-subtitle text-charcoal">Thank You</h3>
        <p className="mt-3 text-body text-slate font-inter font-light max-w-md mx-auto">
          We have received your valuation request and will be in touch within 24 hours to arrange a convenient time.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <Input id="val-address" name="address" label="Property Address" placeholder="Full property address" required />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Select
          id="val-type"
          name="property_type"
          label="Property Type"
          options={[
            { value: '', label: 'Select type' },
            { value: 'house', label: 'House' },
            { value: 'flat', label: 'Flat / Apartment' },
            { value: 'studio', label: 'Studio' },
            { value: 'other', label: 'Other' },
          ]}
        />
        <Select
          id="val-bedrooms"
          name="bedrooms"
          label="Bedrooms"
          options={[
            { value: '', label: 'Select bedrooms' },
            { value: '1', label: '1 bedroom' },
            { value: '2', label: '2 bedrooms' },
            { value: '3', label: '3 bedrooms' },
            { value: '4', label: '4 bedrooms' },
            { value: '5', label: '5+ bedrooms' },
          ]}
        />
      </div>
      <div className="divider my-2" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Input id="val-name" name="name" label="Your Name" placeholder="Full name" required />
        <Input id="val-email" name="email" label="Email" type="email" placeholder="your@email.com" required />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Input id="val-phone" name="phone" label="Phone" type="tel" placeholder="Your phone number" required />
        <Select
          id="val-time"
          name="best_time"
          label="Best Time to Contact"
          options={[
            { value: '', label: 'Any time' },
            { value: 'morning', label: 'Morning (9am-12pm)' },
            { value: 'afternoon', label: 'Afternoon (12pm-5pm)' },
            { value: 'evening', label: 'Evening (5pm-7pm)' },
          ]}
        />
      </div>
      <Textarea id="val-info" name="additional_info" label="Additional Information" placeholder="Anything else we should know about your property..." />
      <div className="flex items-start gap-3 pt-2">
        <input type="checkbox" id="gdpr-val" required className="mt-1 accent-brand" />
        <label htmlFor="gdpr-val" className="text-tiny text-slate font-inter">
          I consent to Elizabeth Wightwick storing my details to process this valuation request.
        </label>
      </div>
      {error && (
        <p className="text-[13px] font-inter text-red-600">{error}</p>
      )}
      <Button type="submit" loading={loading} className="w-full md:w-auto">
        Request Valuation
      </Button>
    </form>
  );
}
