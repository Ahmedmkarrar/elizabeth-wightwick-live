'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { mockProperties } from '@/lib/mock-data';
import { formatPriceFull, getDepartmentLabel } from '@/lib/utils';
import PropertyGallery from '@/components/properties/PropertyGallery';
import PropertyCard from '@/components/properties/PropertyCard';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import EnquiryForm from '@/components/forms/EnquiryForm';
import { motion } from 'framer-motion';
import {
  PhoneIcon,
  EnvelopeIcon,
  HomeIcon,
  CheckIcon,
} from '@heroicons/react/24/outline';

export default function PropertyDetailPage() {
  const { id } = useParams();
  const [enquiryOpen, setEnquiryOpen] = useState(false);
  const [enquiryType, setEnquiryType] = useState<'viewing' | 'info'>('viewing');

  const property = mockProperties.find((p) => p.id === id);

  if (!property) {
    return (
      <div className="pt-40 pb-20 text-center">
        <h1 className="heading-display text-charcoal">Property Not Found</h1>
        <p className="mt-4 text-body text-slate font-inter">
          This property may have been removed or the link is incorrect.
        </p>
        <Link
          href="/buy"
          className="inline-block mt-8 bg-brand text-white px-8 py-3 text-small font-inter hover:bg-brand-dark transition-colors"
        >
          Browse Properties
        </Link>
      </div>
    );
  }

  const address = [property.address_line_1, property.address_line_2].filter(Boolean).join(', ');
  const fullAddress = [address, property.city, property.postcode].join(', ');

  const similar = mockProperties
    .filter((p) => p.id !== property.id && p.department === property.department && p.status === 'available')
    .slice(0, 3);

  const openEnquiry = (type: 'viewing' | 'info') => {
    setEnquiryType(type);
    setEnquiryOpen(true);
  };

  return (
    <>
      {/* Gallery */}
      <div className="pt-20 lg:pt-24">
        <PropertyGallery images={property.images} address={address} />
      </div>

      {/* Content */}
      <section className="section-padding">
        <div className="container-wide">
          {/* Breadcrumbs */}
          <nav className="mb-8 text-tiny font-inter text-slate">
            <Link href="/" className="hover:text-charcoal transition-colors">Home</Link>
            <span className="mx-2 text-taupe">/</span>
            <Link href={property.department === 'sales' ? '/buy' : '/rent'} className="hover:text-charcoal transition-colors">
              {property.department === 'sales' ? 'Buy' : 'Rent'}
            </Link>
            <span className="mx-2 text-taupe">/</span>
            <span className="text-charcoal">{property.address_line_1}</span>
          </nav>

          <div className="flex flex-col lg:flex-row gap-12 lg:gap-20">
            {/* Left Column - Main Content */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="flex-1 min-w-0"
            >
              {/* Title Block */}
              <div className="mb-10">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-tiny font-inter font-medium uppercase tracking-widest text-brand">
                    {getDepartmentLabel(property.department)}
                  </span>
                  {property.status !== 'available' && <Badge status={property.status} />}
                </div>
                <h1 className="font-cormorant text-[2rem] md:text-[2.75rem] font-light text-charcoal leading-tight">
                  {address}
                </h1>
                <p className="text-body text-slate font-inter font-light mt-2">
                  {property.city}, {property.postcode}
                </p>
                <p className="font-cormorant text-[2rem] md:text-title text-brand mt-4">
                  {formatPriceFull(property.price, property.department, property.price_qualifier)}
                </p>
              </div>

              {/* Key Stats Bar */}
              <div className="flex flex-wrap gap-8 py-6 border-y border-beige mb-10">
                {property.bedrooms > 0 && (
                  <div>
                    <p className="font-cormorant text-[2rem] text-charcoal leading-none">{property.bedrooms}</p>
                    <p className="text-tiny font-inter uppercase tracking-widest text-slate mt-1">Bedrooms</p>
                  </div>
                )}
                {property.bathrooms > 0 && (
                  <div>
                    <p className="font-cormorant text-[2rem] text-charcoal leading-none">{property.bathrooms}</p>
                    <p className="text-tiny font-inter uppercase tracking-widest text-slate mt-1">Bathrooms</p>
                  </div>
                )}
                {(property.reception_rooms ?? 0) > 0 && (
                  <div>
                    <p className="font-cormorant text-[2rem] text-charcoal leading-none">{property.reception_rooms}</p>
                    <p className="text-tiny font-inter uppercase tracking-widest text-slate mt-1">Reception</p>
                  </div>
                )}
                <div>
                  <p className="font-cormorant text-[2rem] text-charcoal leading-none capitalize">{property.property_type}</p>
                  <p className="text-tiny font-inter uppercase tracking-widest text-slate mt-1">Type</p>
                </div>
              </div>

              {/* Description */}
              <div className="mb-12">
                <h2 className="heading-section text-charcoal mb-6">About This Property</h2>
                {property.description.split('\n\n').map((paragraph, i) => (
                  <p key={i} className="text-body text-slate font-inter font-light leading-[1.85] mb-5">
                    {paragraph}
                  </p>
                ))}
              </div>

              {/* Key Features */}
              <div className="mb-12">
                <h2 className="heading-section text-charcoal mb-6">Key Features</h2>
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-y-3 gap-x-8">
                  {property.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <CheckIcon className="w-4 h-4 text-brand mt-1 flex-shrink-0" />
                      <span className="text-body text-slate font-inter font-light">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Property Details Grid */}
              <div className="mb-12">
                <h2 className="heading-section text-charcoal mb-6">Property Details</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-y-6 gap-x-8 p-8 bg-beige/30">
                  {property.tenure && (
                    <div>
                      <p className="text-tiny font-inter uppercase tracking-widest text-slate/60 mb-1">Tenure</p>
                      <p className="text-body text-charcoal font-inter">{property.tenure}</p>
                    </div>
                  )}
                  {property.epc_rating && (
                    <div>
                      <p className="text-tiny font-inter uppercase tracking-widest text-slate/60 mb-1">EPC Rating</p>
                      <p className="text-body text-charcoal font-inter">{property.epc_rating}</p>
                    </div>
                  )}
                  {property.council_tax_band && (
                    <div>
                      <p className="text-tiny font-inter uppercase tracking-widest text-slate/60 mb-1">Council Tax</p>
                      <p className="text-body text-charcoal font-inter">Band {property.council_tax_band}</p>
                    </div>
                  )}
                  {property.lease_length && (
                    <div>
                      <p className="text-tiny font-inter uppercase tracking-widest text-slate/60 mb-1">Lease Length</p>
                      <p className="text-body text-charcoal font-inter">{property.lease_length} years</p>
                    </div>
                  )}
                  {property.service_charge && (
                    <div>
                      <p className="text-tiny font-inter uppercase tracking-widest text-slate/60 mb-1">Service Charge</p>
                      <p className="text-body text-charcoal font-inter">£{property.service_charge.toLocaleString()} p.a.</p>
                    </div>
                  )}
                  {property.ground_rent && (
                    <div>
                      <p className="text-tiny font-inter uppercase tracking-widest text-slate/60 mb-1">Ground Rent</p>
                      <p className="text-body text-charcoal font-inter">£{property.ground_rent.toLocaleString()} p.a.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Location */}
              <div>
                <h2 className="heading-section text-charcoal mb-4">Location</h2>
                <p className="text-body text-slate font-inter font-light mb-6">{fullAddress}</p>
                <div className="overflow-hidden h-[360px]">
                  <iframe
                    title="Property location"
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    src={`https://maps.google.com/maps?q=${encodeURIComponent(fullAddress)}&output=embed&z=15`}
                  />
                </div>
              </div>
            </motion.div>

            {/* Right Column - Sticky Sidebar */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="w-full lg:w-[380px] flex-shrink-0"
            >
              <div className="sticky top-28 space-y-6">
                {/* Contact Card */}
                <div className="bg-white border border-beige p-8 space-y-6">
                  <div>
                    <p className="font-cormorant text-subtitle text-charcoal">
                      {formatPriceFull(property.price, property.department, property.price_qualifier)}
                    </p>
                    <p className="text-small text-slate font-inter mt-1">
                      {getDepartmentLabel(property.department)}
                    </p>
                  </div>

                  <div className="h-px bg-beige" />

                  <Button onClick={() => openEnquiry('viewing')} className="w-full">
                    Book a Viewing
                  </Button>
                  <Button variant="secondary" onClick={() => openEnquiry('info')} className="w-full">
                    Request Information
                  </Button>

                  <div className="h-px bg-beige" />

                  <div className="space-y-4">
                    <p className="font-cormorant text-section text-charcoal">Elizabeth Wightwick</p>
                    <div className="flex items-center gap-3 text-small text-slate font-inter">
                      <PhoneIcon className="w-4 h-4 text-brand" />
                      <a href="tel:02035973484" className="hover:text-charcoal transition-colors">
                        0203 597 3484
                      </a>
                    </div>
                    <div className="flex items-center gap-3 text-small text-slate font-inter">
                      <EnvelopeIcon className="w-4 h-4 text-brand" />
                      <a href="mailto:info@elizabeth-wightwick.co.uk" className="hover:text-charcoal transition-colors">
                        info@elizabeth-wightwick.co.uk
                      </a>
                    </div>
                    <div className="flex items-center gap-3 text-small text-slate font-inter">
                      <HomeIcon className="w-4 h-4 text-brand" />
                      <span>60 High Street, Wimbledon Village</span>
                    </div>
                  </div>
                </div>

                {/* Opening Hours */}
                <div className="bg-beige/30 p-6">
                  <p className="text-tiny font-inter font-medium uppercase tracking-widest text-brand mb-3">Opening Hours</p>
                  <div className="space-y-1.5 text-small font-inter text-slate">
                    <div className="flex justify-between">
                      <span>Monday - Friday</span>
                      <span className="text-charcoal">9am - 5pm</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Saturday</span>
                      <span className="text-charcoal">9am - 1pm</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Sunday</span>
                      <span className="text-charcoal">Closed</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Similar Properties */}
      {similar.length > 0 && (
        <section className="section-padding bg-beige/20">
          <div className="container-wide">
            <div className="flex items-end justify-between mb-12">
              <h2 className="heading-display text-charcoal">Similar Properties</h2>
              <Link
                href={property.department === 'sales' ? '/buy' : '/rent'}
                className="text-small font-inter text-charcoal border-b border-charcoal pb-0.5 hover:text-brand hover:border-brand transition-colors duration-400"
              >
                View All
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 lg:gap-12">
              {similar.map((p) => (
                <PropertyCard key={p.id} property={p} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Enquiry Modal */}
      <Modal
        isOpen={enquiryOpen}
        onClose={() => setEnquiryOpen(false)}
        title={enquiryType === 'viewing' ? 'Book a Viewing' : 'Request Information'}
      >
        <EnquiryForm
          propertyAddress={address}
          propertyId={property.id}
          type={enquiryType}
        />
      </Modal>
    </>
  );
}
