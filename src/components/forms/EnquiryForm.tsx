'use client';

import { useState } from 'react';
import { Input, Textarea } from '@/components/ui/Input';
import Button from '@/components/ui/Button';

interface EnquiryFormProps {
  propertyAddress: string;
  propertyId: string;
  type?: 'viewing' | 'info';
}

export default function EnquiryForm({ propertyAddress, propertyId, type = 'viewing' }: EnquiryFormProps) {
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
      const res = await fetch('/api/inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.get('name'),
          email: data.get('email'),
          phone: data.get('phone') || undefined,
          message: data.get('message') || undefined,
          type,
          property_id: propertyId,
          property_address: propertyAddress,
          preferred_time: data.get('preferred_time') || undefined,
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
      <div className="text-center py-8">
        <h3 className="heading-section text-charcoal">Thank You</h3>
        <p className="mt-3 text-body text-slate font-inter font-light">
          We&apos;ve received your enquiry about {propertyAddress} and will be in touch shortly.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <p className="text-small text-slate font-inter">
        {type === 'viewing' ? 'Request a viewing of' : 'Enquire about'}{' '}
        <span className="text-charcoal font-medium">{propertyAddress}</span>
      </p>
      <Input id="name" name="name" label="Name" placeholder="Your full name" required />
      <Input id="email" name="email" label="Email" type="email" placeholder="your@email.com" required />
      <Input id="phone" name="phone" label="Phone" type="tel" placeholder="Your phone number" />
      {type === 'viewing' && (
        <Input id="preferred_time" name="preferred_time" label="Preferred Time" placeholder="e.g. Weekday mornings" />
      )}
      <Textarea id="message" name="message" label="Message" placeholder="Any additional details..." />
      <div className="flex items-start gap-3 pt-2">
        <input type="checkbox" id="gdpr" required className="mt-1 accent-brand" />
        <label htmlFor="gdpr" className="text-tiny text-slate font-inter">
          I consent to Elizabeth Wightwick storing my details to respond to this enquiry.
        </label>
      </div>
      {error && (
        <p className="text-[13px] font-inter text-red-600">{error}</p>
      )}
      <Button type="submit" loading={loading} className="w-full">
        {type === 'viewing' ? 'Request Viewing' : 'Send Enquiry'}
      </Button>
    </form>
  );
}
