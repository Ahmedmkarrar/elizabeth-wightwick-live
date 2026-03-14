'use client';

import { useState, useMemo } from 'react';
import { mockProperties } from '@/lib/mock-data';
import PropertyGrid from '@/components/properties/PropertyGrid';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import ScrollingReviews from '@/components/rent/ScrollingReviews';

const bedroomOptions = [
  { value: '', label: 'Any Beds' },
  { value: '1', label: '1+' },
  { value: '2', label: '2+' },
  { value: '3', label: '3+' },
  { value: '4', label: '4+' },
  { value: '5', label: '5+' },
];

const priceOptions = [
  { value: '', label: 'Any Price' },
  { value: '5000', label: 'Up to £5,000 pcm' },
  { value: '10000', label: 'Up to £10,000 pcm' },
  { value: '15000', label: 'Up to £15,000 pcm' },
  { value: '20000', label: 'Up to £20,000 pcm' },
];

export default function RentPage() {
  const [sort, setSort] = useState<string>('price_desc');
  const [minBeds, setMinBeds] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');

  const properties = useMemo(() => {
    let results = mockProperties.filter((p) => p.department === 'lettings' && p.status === 'available');

    if (minBeds) {
      results = results.filter((p) => p.bedrooms >= parseInt(minBeds));
    }
    if (maxPrice) {
      results = results.filter((p) => p.price <= parseInt(maxPrice));
    }

    if (sort === 'price_asc') return results.sort((a, b) => a.price - b.price);
    if (sort === 'price_desc') return results.sort((a, b) => b.price - a.price);
    return results.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [sort, minBeds, maxPrice]);

  return (
    <>
      {/* Clean Text Header */}
      <section className="pt-36 md:pt-40 pb-10">
        <div className="container-wide">
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
            className="text-[11px] font-inter font-medium uppercase tracking-[0.3em] text-brand"
          >
            Properties to Let
          </motion.span>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="font-cormorant text-[2.5rem] md:text-[3.25rem] font-light text-charcoal mt-3 leading-tight"
          >
            Rent in Wimbledon
          </motion.h1>
        </div>
      </section>

      {/* Inline Filter Bar */}
      <section className="pb-6">
        <div className="container-wide">
          <div className="flex flex-wrap items-center gap-3 border-b border-beige pb-6">
            {/* Bedroom Filter */}
            <div className="flex items-center gap-1">
              {bedroomOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setMinBeds(opt.value)}
                  className={cn(
                    'px-3 py-1.5 text-[12px] font-inter tracking-wide transition-all duration-300 rounded-full',
                    minBeds === opt.value
                      ? 'bg-brand text-white'
                      : 'text-charcoal hover:bg-beige'
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <div className="w-px h-6 bg-taupe/30 hidden sm:block" />

            {/* Price Filter */}
            <select
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              className="bg-white border border-taupe/30 px-4 py-2 text-[12px] font-inter text-charcoal focus:outline-none focus:border-brand/50 transition-colors rounded-sm"
            >
              {priceOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>

            <div className="w-px h-6 bg-taupe/30 hidden sm:block" />

            {/* Sort */}
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="bg-white border border-taupe/30 px-4 py-2 text-[12px] font-inter text-charcoal focus:outline-none focus:border-brand/50 transition-colors rounded-sm"
            >
              <option value="price_desc">Price: High to Low</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="newest">Newest First</option>
            </select>

            <div className="ml-auto">
              <p className="text-[13px] font-inter text-slate">
                <span className="text-charcoal font-medium">{properties.length}</span> properties
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Property Grid */}
      <section className="section-padding pt-6">
        <div className="container-wide">
          <PropertyGrid properties={properties} columns={3} />
        </div>
      </section>

      {/* Scrolling Tenant Reviews */}
      <ScrollingReviews />
    </>
  );
}
