'use client';

import { useState } from 'react';
import { Input, Textarea, Select } from '@/components/ui/Input';
import Button from '@/components/ui/Button';

export default function ContactForm() {
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
          message: data.get('message'),
          type: data.get('subject') || 'contact',
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
        <p className="mt-3 text-body text-slate font-inter font-light">
          We have received your message and will be in touch shortly.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Input id="name" name="name" label="Name" placeholder="Your full name" required />
        <Input id="email" name="email" label="Email" type="email" placeholder="your@email.com" required />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Input id="phone" name="phone" label="Phone" type="tel" placeholder="Your phone number" />
        <Select
          id="subject"
          name="subject"
          label="Subject"
          options={[
            { value: '', label: 'Select a subject' },
            { value: 'sales', label: 'Selling a Property' },
            { value: 'lettings', label: 'Letting a Property' },
            { value: 'buying', label: 'Buying a Property' },
            { value: 'renting', label: 'Renting a Property' },
            { value: 'management', label: 'Property Management' },
            { value: 'valuation', label: 'Valuation Request' },
            { value: 'general', label: 'General Enquiry' },
          ]}
        />
      </div>
      <Textarea id="message" name="message" label="Message" placeholder="How can we help?" required />
      <div className="flex items-start gap-3 pt-2">
        <input type="checkbox" id="gdpr-contact" required className="mt-1 accent-brand" />
        <label htmlFor="gdpr-contact" className="text-tiny text-slate font-inter">
          I consent to Elizabeth Wightwick storing my details to respond to this enquiry.
          Your data will be handled in accordance with our privacy policy.
        </label>
      </div>
      {error && (
        <p className="text-[13px] font-inter text-red-600">{error}</p>
      )}
      <Button type="submit" loading={loading} className="w-full md:w-auto">
        Send Message
      </Button>
    </form>
  );
}
