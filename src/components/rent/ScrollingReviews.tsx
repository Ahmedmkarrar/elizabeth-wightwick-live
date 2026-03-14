'use client';

import { useEffect, useRef } from 'react';
import { mockTestimonials } from '@/lib/mock-data';
import { motion } from 'framer-motion';
import ScrollReveal from '@/components/ui/ScrollReveal';

export default function ScrollingReviews() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const testimonials = [...mockTestimonials, ...mockTestimonials];

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    let animationId: number;
    let scrollPos = 0;
    const speed = 0.5;
    let isPaused = false;

    const scroll = () => {
      if (!isPaused) {
        scrollPos += speed;
        if (scrollPos >= container.scrollWidth / 2) {
          scrollPos = 0;
        }
        container.scrollLeft = scrollPos;
      }
      animationId = requestAnimationFrame(scroll);
    };

    const handleMouseEnter = () => { isPaused = true; };
    const handleMouseLeave = () => { isPaused = false; };

    container.addEventListener('mouseenter', handleMouseEnter);
    container.addEventListener('mouseleave', handleMouseLeave);

    animationId = requestAnimationFrame(scroll);

    return () => {
      cancelAnimationFrame(animationId);
      container.removeEventListener('mouseenter', handleMouseEnter);
      container.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  return (
    <section className="py-20 md:py-28 bg-warm-white overflow-hidden">
      <div className="container-wide mb-12">
        <ScrollReveal>
          <span className="text-[11px] font-inter font-medium uppercase tracking-[0.3em] text-brand">
            Tenant Reviews
          </span>
        </ScrollReveal>
        <ScrollReveal>
          <h2 className="font-cormorant text-[2rem] md:text-[2.5rem] font-light text-charcoal mt-3 leading-tight">
            What Our Tenants Say
          </h2>
        </ScrollReveal>
      </div>

      {/* Scrolling cards */}
      <div
        ref={scrollRef}
        className="flex gap-6 overflow-x-hidden px-6 md:px-12"
        style={{ scrollBehavior: 'auto' }}
      >
        {testimonials.map((testimonial, index) => (
          <motion.div
            key={`${testimonial.id}-${index}`}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
            className="flex-shrink-0 w-[340px] md:w-[400px] bg-white border border-taupe/15 p-8 md:p-10"
          >
            {/* Stars */}
            <div className="flex items-center gap-1 mb-6">
              {[...Array(5)].map((_, i) => (
                <svg key={i} className="w-4 h-4 text-brand" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
            </div>

            {/* Quote */}
            <blockquote className="font-cormorant text-[1.25rem] md:text-[1.4rem] font-light text-charcoal leading-[1.4] italic mb-8">
              &ldquo;{testimonial.quote}&rdquo;
            </blockquote>

            {/* Divider */}
            <div className="w-8 h-px bg-brand/30 mb-5" />

            {/* Attribution */}
            <p className="font-inter text-[13px] font-semibold text-charcoal tracking-wide">
              {testimonial.name}
            </p>
            <p className="font-inter text-[12px] text-slate/60 mt-1 tracking-wide">
              {testimonial.role}
            </p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
