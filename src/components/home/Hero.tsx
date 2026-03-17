'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { formatPrice } from '@/lib/utils';
import MagneticButton from '@/components/ui/MagneticButton';
import type { Property } from '@/types';

// Fallback slides shown while/if no real properties load
const FALLBACK_SLIDES = [
  {
    id: 'f1',
    image: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=2000&q=80',
    title: 'Wimbledon Village',
    address: 'SW19',
    city: 'London',
    postcode: '',
    department: 'sales' as const,
    price: null,
    bedrooms: null,
    bathrooms: null,
    reception_rooms: null,
    href: '/buy',
  },
  {
    id: 'f2',
    image: 'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?auto=format&fit=crop&w=2000&q=80',
    title: 'South West London',
    address: 'Premium Lettings',
    city: 'London',
    postcode: '',
    department: 'lettings' as const,
    price: null,
    bedrooms: null,
    bathrooms: null,
    reception_rooms: null,
    href: '/rent',
  },
  {
    id: 'f3',
    image: 'https://images.unsplash.com/photo-1605276374104-dee2a0ed3cd6?auto=format&fit=crop&w=2000&q=80',
    title: 'Exceptional Homes',
    address: 'Curated for you',
    city: '',
    postcode: '',
    department: 'sales' as const,
    price: null,
    bedrooms: null,
    bathrooms: null,
    reception_rooms: null,
    href: '/buy',
  },
];

type Slide = {
  id: string;
  image: string;
  title: string;
  address: string;
  city: string;
  postcode: string;
  department: 'sales' | 'lettings';
  price: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  reception_rooms: number | null;
  href: string;
};

function SplitText({ text, delay = 0 }: { text: string; delay?: number }) {
  return (
    <span className="inline-block">
      {text.split('').map((char, i) => (
        <motion.span
          key={i}
          initial={{ y: 80, opacity: 0, rotateX: 40 }}
          animate={{ y: 0, opacity: 1, rotateX: 0 }}
          transition={{ duration: 0.8, delay: delay + i * 0.03, ease: [0.22, 1, 0.36, 1] }}
          className="inline-block"
          style={{ transformOrigin: 'bottom' }}
        >
          {char === ' ' ? '\u00A0' : char}
        </motion.span>
      ))}
    </span>
  );
}

export default function Hero() {
  const [slides, setSlides] = useState<Slide[]>(FALLBACK_SLIDES);
  const [current, setCurrent] = useState(0);
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    // Try to load real featured properties
    fetch('/api/properties?limit=6')
      .then((r) => r.json())
      .then((data) => {
        const props: Property[] = (data.properties || []).filter(
          (p: Property) => p.status === 'available' && p.main_image
        );
        if (props.length >= 2) {
          setSlides(
            props.slice(0, 4).map((p) => ({
              id: p.id,
              image: p.main_image,
              title: p.address_line_1,
              address: p.address_line_1,
              city: p.city,
              postcode: p.postcode,
              department: p.department,
              price: p.price,
              bedrooms: p.bedrooms,
              bathrooms: p.bathrooms,
              reception_rooms: p.reception_rooms ?? null,
              href: `/properties/${p.id}`,
            }))
          );
        }
      })
      .catch(() => {/* keep fallback */});
  }, []);

  const next = useCallback(() => setCurrent((prev) => (prev + 1) % slides.length), [slides.length]);
  const prev = useCallback(() => setCurrent((prev) => (prev - 1 + slides.length) % slides.length), [slides.length]);

  useEffect(() => {
    const timer = setInterval(next, 7000);
    return () => clearInterval(timer);
  }, [next]);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const slide = slides[current];
  if (!slide) return null;

  return (
    <section className="relative h-screen min-h-[700px] flex items-end overflow-hidden">
      {slides.map((s, i) => (
        <div
          key={s.id}
          className="absolute inset-0 transition-opacity duration-[2000ms] ease-in-out"
          style={{
            opacity: current === i ? 1 : 0,
            transform: `translateY(${scrollY * 0.15}px) scale(${1 + scrollY * 0.0002})`,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={s.image}
            alt={s.title}
            className="absolute inset-0 w-full h-full object-cover animate-ken-burns"
          />
        </div>
      ))}

      <div className="absolute inset-0 bg-gradient-to-t from-charcoal/80 via-charcoal/20 to-charcoal/40" />
      <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.3) 100%)' }} />

      {/* Slide counter */}
      <div className="absolute top-1/2 -translate-y-1/2 right-6 md:right-12 z-10 hidden md:flex flex-col items-center gap-4">
        <span className="text-[11px] font-inter font-medium text-white/50 tracking-wider">
          {String(current + 1).padStart(2, '0')}
        </span>
        <div className="w-px h-16 bg-white/20 relative overflow-hidden">
          <motion.div
            key={current}
            initial={{ height: 0 }}
            animate={{ height: '100%' }}
            transition={{ duration: 7, ease: 'linear' }}
            className="absolute top-0 left-0 w-full bg-white/60"
          />
        </div>
        <span className="text-[11px] font-inter font-medium text-white/30 tracking-wider">
          {String(slides.length).padStart(2, '0')}
        </span>
      </div>

      <div className="relative z-10 w-full pb-24 md:pb-32">
        <div className="container-wide">
          <AnimatePresence mode="wait">
            <motion.div
              key={current}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
            >
              <motion.span
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="inline-block bg-brand text-white px-5 py-2 text-[10px] font-inter font-medium uppercase tracking-[0.25em] mb-6"
              >
                {slide.department === 'sales' ? 'For Sale' : 'To Let'}
              </motion.span>

              <div className="overflow-hidden">
                <h1 className="font-cormorant text-[3rem] sm:text-[4rem] md:text-[5rem] lg:text-[6.5rem] font-light text-white leading-[0.9] tracking-tight">
                  <SplitText text={slide.title} delay={0.3} />
                </h1>
              </div>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.8 }}
                className="mt-4 text-[15px] md:text-lg font-inter font-light text-white/50 tracking-wide"
              >
                {slide.address}{slide.city ? `, ${slide.city}` : ''} {slide.postcode}
              </motion.p>

              <motion.div
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 0.8, delay: 1, ease: [0.22, 1, 0.36, 1] }}
                className="w-20 h-px bg-white/30 mt-6 mb-6 origin-left"
              />

              {slide.price && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 1.1 }}
                  className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-8"
                >
                  <span className="font-cormorant text-[2rem] md:text-[2.5rem] text-white font-light">
                    {formatPrice(slide.price, slide.department)}
                  </span>
                  {slide.bedrooms && (
                    <div className="flex items-center gap-5 text-[13px] text-white/40 font-inter">
                      <span>{slide.bedrooms} Beds</span>
                      <span className="w-1 h-1 bg-white/20 rounded-full" />
                      <span>{slide.bathrooms} Baths</span>
                      {(slide.reception_rooms ?? 0) > 0 && (
                        <>
                          <span className="w-1 h-1 bg-white/20 rounded-full" />
                          <span>{slide.reception_rooms} Reception</span>
                        </>
                      )}
                    </div>
                  )}
                </motion.div>
              )}

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 1.3 }}
                className="mt-8"
              >
                <MagneticButton>
                  <Link
                    href={slide.href}
                    className="group inline-flex items-center gap-4 text-[11px] font-inter font-medium uppercase tracking-[0.25em] text-white/80 hover:text-white transition-colors duration-500"
                  >
                    <span className="relative">
                      {slide.price ? 'View Property' : 'Browse Properties'}
                      <span className="absolute -bottom-1 left-0 w-0 group-hover:w-full h-px bg-white transition-all duration-500" />
                    </span>
                    <svg className="w-4 h-4 transition-transform duration-500 group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 8.25L21 12m0 0l-3.75 3.75M21 12H3" />
                    </svg>
                  </Link>
                </MagneticButton>
              </motion.div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <div className="absolute left-6 md:left-12 bottom-24 md:bottom-32 z-10 flex items-center gap-2">
        <MagneticButton>
          <button onClick={prev} className="w-12 h-12 flex items-center justify-center border border-white/20 text-white/60 hover:bg-white/10 hover:text-white hover:border-white/40 transition-all duration-500 backdrop-blur-sm" aria-label="Previous">
            <ChevronLeftIcon className="w-5 h-5" />
          </button>
        </MagneticButton>
        <MagneticButton>
          <button onClick={next} className="w-12 h-12 flex items-center justify-center border border-white/20 text-white/60 hover:bg-white/10 hover:text-white hover:border-white/40 transition-all duration-500 backdrop-blur-sm" aria-label="Next">
            <ChevronRightIcon className="w-5 h-5" />
          </button>
        </MagneticButton>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2, duration: 0.8 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2"
      >
        <span className="text-[9px] font-inter uppercase tracking-[0.3em] text-white/30">Scroll</span>
        <motion.div
          animate={{ y: [0, 6, 0] }}
          transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
          className="w-px h-6 bg-white/20"
        />
      </motion.div>
    </section>
  );
}
