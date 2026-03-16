'use client';

import { useState, useEffect, useMemo } from 'react';
import PropertyGrid from '@/components/properties/PropertyGrid';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import type { Property } from '@/types';

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
  { value: '500000', label: 'Up to £500k' },
  { value: '750000', label: 'Up to £750k' },
  { value: '1000000', label: 'Up to £1m' },
  { value: '2000000', label: 'Up to £2m' },
  { value: '5000000', label: 'Up to £5m' },
];

const typeOptions = [
  { value: '', label: 'Any Type' },
  { value: 'house', label: 'House' },
  { value: 'flat', label: 'Flat' },
  { value: 'studio', label: 'Studio' },
];

function PropertySkeleton() {
  return (
    <div className="animate-pulse">
      <div className="aspect-[4/3] bg-beige mb-4" />
      <div className="h-3 w-3/4 bg-beige mb-2" />
      <div className="h-3 w-1/2 bg-beige/60 mb-3" />
      <div className="h-5 w-1/3 bg-beige" />
    </div>
  );
}

export default function BuyPage() {
  const [allProperties, setAllProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<string>('newest');
  const [minBeds, setMinBeds] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');
  const [propType, setPropType] = useState<string>('');

  useEffect(() => {
    fetch('/api/properties?department=sales&limit=200')
      .then((r) => r.json())
      .then((data) => setAllProperties(data.properties || []))
      .finally(() => setLoading(false));
  }, []);

  const properties = useMemo(() => {
    let results = allProperties.filter((p) => p.status === 'available');
    if (minBeds) results = results.filter((p) => p.bedrooms >= parseInt(minBeds));
    if (maxPrice) results = results.filter((p) => p.price <= parseInt(maxPrice));
    if (propType) results = results.filter((p) => p.property_type === propType);
    if (sort === 'price_asc') return [...results].sort((a, b) => a.price - b.price);
    if (sort === 'price_desc') return [...results].sort((a, b) => b.price - a.price);
    return [...results].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [allProperties, sort, minBeds, maxPrice, propType]);

  return (
    <>
      <section className="pt-36 md:pt-40 pb-10">
        <div className="container-wide">
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
            className="text-[11px] font-inter font-medium uppercase tracking-[0.3em] text-brand"
          >
            Properties for Sale
          </motion.span>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="font-cormorant text-[2.5rem] md:text-[3.25rem] font-light text-charcoal mt-3 leading-tight"
          >
            Find Your Home
          </motion.h1>
        </div>
      </section>

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
                    minBeds === opt.value ? 'bg-brand text-white' : 'text-charcoal hover:bg-beige'
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <div className="w-px h-6 bg-taupe/30 hidden sm:block" />

            {/* Property Type */}
            <select
              value={propType}
              onChange={(e) => setPropType(e.target.value)}
              className="bg-white border border-taupe/30 px-4 py-2 text-[12px] font-inter text-charcoal focus:outline-none focus:border-brand/50 transition-colors rounded-sm"
            >
              {typeOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>

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

            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="bg-white border border-taupe/30 px-4 py-2 text-[12px] font-inter text-charcoal focus:outline-none focus:border-brand/50 transition-colors rounded-sm"
            >
              <option value="newest">Newest First</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="price_asc">Price: Low to High</option>
            </select>

            <div className="ml-auto">
              <p className="text-[13px] font-inter text-slate">
                <span className="text-charcoal font-medium">{loading ? '—' : properties.length}</span> properties
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="section-padding pt-6">
        <div className="container-wide">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 lg:gap-12">
              {[...Array(6)].map((_, i) => <PropertySkeleton key={i} />)}
            </div>
          ) : properties.length === 0 ? (
            <div className="text-center py-24">
              <p className="font-cormorant text-[2rem] font-light text-charcoal mb-3">No properties found</p>
              <p className="text-[14px] font-inter text-slate/60 mb-6">Try adjusting your filters or check back soon.</p>
              <button
                onClick={() => { setMinBeds(''); setMaxPrice(''); setPropType(''); }}
                className="text-[12px] font-inter text-brand border-b border-brand pb-0.5 hover:text-brand-dark hover:border-brand-dark transition-colors"
              >
                Clear all filters
              </button>
            </div>
          ) : (
            <PropertyGrid properties={properties} columns={3} />
          )}
        </div>
      </section>
    </>
  );
}
