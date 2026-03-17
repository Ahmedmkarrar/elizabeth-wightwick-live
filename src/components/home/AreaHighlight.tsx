'use client';

import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import ScrollReveal from '@/components/ui/ScrollReveal';

export default function AreaHighlight() {
  return (
    <section className="relative overflow-hidden bg-warm-white">
      <div className="grid grid-cols-1 lg:grid-cols-2 min-h-[700px]">
        {/* Image with reveal mask */}
        <div className="relative h-[500px] lg:h-auto overflow-hidden">
          <motion.div
            initial={{ clipPath: 'inset(0 0 100% 0)' }}
            whileInView={{ clipPath: 'inset(0 0 0% 0)' }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-0"
          >
            <Image
              src="https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?auto=format&fit=crop&w=1200&q=80"
              alt="Wimbledon Village"
              fill
              unoptimized
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 50vw"
            />
          </motion.div>
        </div>

        {/* Content */}
        <div className="flex items-center">
          <div className="px-8 py-20 lg:px-20 lg:py-24 max-w-xl">
            <ScrollReveal direction="right">
              <span className="text-[11px] font-inter font-medium uppercase tracking-[0.3em] text-brand">
                Local Expertise
              </span>
            </ScrollReveal>

            <ScrollReveal delay={0.1} direction="right">
              <h2 className="font-cormorant text-[2.5rem] md:text-[3rem] font-light text-charcoal mt-5 leading-tight">
                Wimbledon Village
              </h2>
            </ScrollReveal>

            <ScrollReveal delay={0.2} direction="none">
              <motion.div
                initial={{ scaleX: 0 }}
                whileInView={{ scaleX: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: 0.4 }}
                className="w-12 h-px bg-brand/40 mt-7 mb-8 origin-left"
              />
            </ScrollReveal>

            <ScrollReveal delay={0.3} direction="right">
              <p className="text-[15px] text-slate font-inter font-light leading-[1.9]">
                With over 30 years of combined experience in Wimbledon and South West London,
                we bring unrivalled local knowledge to every property transaction. From the
                tree-lined streets of the Village to the open spaces of the Common, we know
                every corner of this exceptional area.
              </p>
            </ScrollReveal>

            <ScrollReveal delay={0.4} direction="right">
              <p className="text-[15px] text-slate font-inter font-light leading-[1.9] mt-5">
                Our office on the High Street places us at the heart of the community,
                enabling us to offer genuinely local insight and a personal service that
                larger agencies simply cannot match.
              </p>
            </ScrollReveal>

            <ScrollReveal delay={0.5} direction="right">
              <Link
                href="/wimbledon"
                className="group inline-flex items-center gap-4 mt-10 text-[11px] font-inter font-medium uppercase tracking-[0.2em] text-charcoal hover:text-brand transition-colors duration-500"
              >
                <span className="relative">
                  Explore Wimbledon
                  <span className="absolute -bottom-1 left-0 w-0 group-hover:w-full h-px bg-brand transition-all duration-500" />
                </span>
                <svg className="w-4 h-4 transition-transform duration-500 group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 8.25L21 12m0 0l-3.75 3.75M21 12H3" />
                </svg>
              </Link>
            </ScrollReveal>
          </div>
        </div>
      </div>
    </section>
  );
}
