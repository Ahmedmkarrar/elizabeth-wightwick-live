'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Property } from '@/types';
import { formatPriceFull, isNewListing } from '@/lib/utils';
import Badge from '@/components/ui/Badge';

interface PropertyCardProps {
  property: Property;
  featured?: boolean;
}

export default function PropertyCard({ property }: PropertyCardProps) {
  const [imgIndex, setImgIndex] = useState(0);
  const address = [property.address_line_1, property.address_line_2].filter(Boolean).join(', ');
  const images = property.images.slice(0, 4);

  const features = [
    property.bedrooms ? `${property.bedrooms} bed${property.bedrooms !== 1 ? 's' : ''}` : null,
    property.bathrooms ? `${property.bathrooms} bath${property.bathrooms !== 1 ? 's' : ''}` : null,
    (property.reception_rooms ?? 0) > 0 ? `${property.reception_rooms} recep` : null,
  ].filter(Boolean);

  const showNewListing = property.status === 'available' && isNewListing(property.created_at);
  const badgeStatus = showNewListing ? 'new_listing' : property.status;

  return (
    <Link href={`/properties/${property.id}`} className="group block">
      {/* Image - Portrait 3:4 with hover slider */}
      <div
        className="relative aspect-[3/4] overflow-hidden bg-beige"
        onMouseLeave={() => setImgIndex(0)}
      >
        {/* Images */}
        {images.map((img, i) => (
          <div
            key={i}
            className="absolute inset-0 transition-opacity duration-500"
            style={{ opacity: imgIndex === i ? 1 : 0 }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={img}
              alt={address}
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-[1500ms] ease-out group-hover:scale-[1.03]"
            />
          </div>
        ))}

        {/* Hover zones */}
        {images.length > 1 && (
          <div className="absolute inset-0 z-10 flex">
            {images.map((_, i) => (
              <div key={i} className="flex-1" onMouseEnter={() => setImgIndex(i)} />
            ))}
          </div>
        )}

        {/* Image indicator dots */}
        {images.length > 1 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1">
            {images.map((_, i) => (
              <div
                key={i}
                className={`h-[3px] rounded-full transition-all duration-300 ${
                  imgIndex === i ? 'w-4 bg-white' : 'w-[3px] bg-white/50'
                }`}
              />
            ))}
          </div>
        )}

        {/* Status badge */}
        <div className="absolute top-4 left-4 z-20">
          <Badge status={badgeStatus} />
        </div>

        {/* Department tag */}
        <div className="absolute top-4 right-4 z-20">
          <span className="bg-white/90 backdrop-blur-sm text-charcoal px-3 py-1.5 text-[9px] font-inter font-semibold uppercase tracking-[0.2em]">
            {property.department === 'sales' ? 'Sale' : 'Let'}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="pt-5 space-y-1.5">
        <h3 className="font-cormorant text-[1.35rem] md:text-[1.5rem] font-light text-charcoal group-hover:text-brand transition-colors duration-500">
          {property.title}
        </h3>
        <p className="text-[12px] text-slate/70 font-inter">
          {address}, {property.city}{property.postcode ? ` ${property.postcode}` : ''}
        </p>
        <p className="font-cormorant text-[1.25rem] text-charcoal font-normal">
          {formatPriceFull(property.price, property.department, property.price_qualifier)}
        </p>
        {features.length > 0 && (
          <div className="flex items-center gap-3 pt-1">
            {features.map((f, i) => (
              <span key={i} className="text-[12px] font-inter text-slate/60 flex items-center gap-2">
                {i > 0 && <span className="w-0.5 h-0.5 bg-taupe rounded-full" />}
                {f}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}
