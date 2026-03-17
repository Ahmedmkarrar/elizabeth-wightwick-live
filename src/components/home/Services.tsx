'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import ScrollReveal from '@/components/ui/ScrollReveal';

const sections = [
  {
    title: 'Best of 2025',
    subtitle: 'Curated Collection',
    description: 'The finest properties we have had the privilege of marketing this year. Each one hand-selected to showcase the very best of what South West London has to offer.',
    href: '/best-of-2025',
    label: 'View Collection',
    image: 'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=1200&q=80',
    reverse: false,
  },
  {
    title: 'For Homeowners',
    subtitle: 'Our Services',
    description: 'A bespoke service built on trust, expertise, and genuine care for your home. Whether selling, letting, or managing your property, we bring a personal approach that larger agencies simply cannot match.',
    href: '/homeowners',
    label: 'Explore Services',
    image: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1200&q=80',
    reverse: true,
  },
];

export default function Services() {
  return (
    <section className="section-padding">
      <div className="container-wide space-y-24 lg:space-y-32">
        {sections.map((section) => (
          <div
            key={section.title}
            className={`grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-20 items-center ${
              section.reverse ? 'lg:[direction:rtl]' : ''
            }`}
          >
            {/* Image with reveal mask */}
            <ScrollReveal direction={section.reverse ? 'right' : 'left'}>
              <div className={section.reverse ? 'lg:[direction:ltr]' : ''}>
                <div className="relative overflow-hidden group">
                  <motion.div
                    initial={{ clipPath: 'inset(0 100% 0 0)' }}
                    whileInView={{ clipPath: 'inset(0 0% 0 0)' }}
                    viewport={{ once: true, margin: '-100px' }}
                    transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <div className="relative aspect-[4/5] overflow-hidden bg-beige">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={section.image}
                        alt={section.title}
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-[1500ms] ease-out group-hover:scale-105"
                      />
                    </div>
                  </motion.div>
                </div>
              </div>
            </ScrollReveal>

            {/* Text Content */}
            <div className={section.reverse ? 'lg:[direction:ltr]' : ''}>
              <ScrollReveal delay={0.3} direction={section.reverse ? 'left' : 'right'}>
                <span className="text-[11px] font-inter font-medium uppercase tracking-[0.3em] text-brand">
                  {section.subtitle}
                </span>
              </ScrollReveal>
              <ScrollReveal delay={0.4} direction={section.reverse ? 'left' : 'right'}>
                <h3 className="font-cormorant text-[2.25rem] sm:text-[2.75rem] font-light text-charcoal mt-4 leading-tight">
                  {section.title}
                </h3>
              </ScrollReveal>
              <ScrollReveal delay={0.5} direction="none">
                <motion.div
                  initial={{ scaleX: 0 }}
                  whileInView={{ scaleX: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.8, delay: 0.6, ease: [0.22, 1, 0.36, 1] }}
                  className="w-12 h-px bg-brand/40 mt-6 mb-6 origin-left"
                />
              </ScrollReveal>
              <ScrollReveal delay={0.6} direction={section.reverse ? 'left' : 'right'}>
                <p className="text-[15px] text-slate font-inter font-light leading-[1.85] max-w-md">
                  {section.description}
                </p>
              </ScrollReveal>
              <ScrollReveal delay={0.7} direction={section.reverse ? 'left' : 'right'}>
                <Link
                  href={section.href}
                  className="group inline-flex items-center gap-4 mt-10 text-[11px] font-inter font-medium uppercase tracking-[0.2em] text-charcoal hover:text-brand transition-colors duration-500"
                >
                  <span className="relative">
                    {section.label}
                    <span className="absolute -bottom-1 left-0 w-0 group-hover:w-full h-px bg-brand transition-all duration-500" />
                  </span>
                  <svg className="w-4 h-4 transition-transform duration-500 group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 8.25L21 12m0 0l-3.75 3.75M21 12H3" />
                  </svg>
                </Link>
              </ScrollReveal>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
