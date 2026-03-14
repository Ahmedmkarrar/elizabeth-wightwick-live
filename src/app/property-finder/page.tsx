'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, useInView, useScroll, useTransform, AnimatePresence } from 'framer-motion';

// ─── Split Text ───────────────────────────────────────────────────────────────
function SplitText({ text, delay = 0, className = '' }: { text: string; delay?: number; className?: string }) {
  return (
    <span className={`inline-block ${className}`}>
      {text.split('').map((char, i) => (
        <motion.span
          key={i}
          initial={{ y: 100, opacity: 0, rotateX: 40 }}
          animate={{ y: 0, opacity: 1, rotateX: 0 }}
          transition={{ duration: 0.9, delay: delay + i * 0.025, ease: [0.22, 1, 0.36, 1] }}
          className="inline-block"
          style={{ transformOrigin: 'bottom' }}
        >
          {char === ' ' ? '\u00A0' : char}
        </motion.span>
      ))}
    </span>
  );
}

// ─── Animated Counter ─────────────────────────────────────────────────────────
function AnimatedCounter({ value, suffix = '', prefix = '', inView }: { value: number; suffix?: string; prefix?: string; inView: boolean }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const step = 2000 / value;
    const timer = setInterval(() => { start += 1; setCount(start); if (start >= value) clearInterval(timer); }, step);
    return () => clearInterval(timer);
  }, [inView, value]);
  return <span>{prefix}{count}{suffix}</span>;
}

// ─── Marquee ──────────────────────────────────────────────────────────────────
const marqueeItems = ['Off-Market Access', 'Bespoke Search', 'Discreet Service', 'Expert Negotiation', 'Wimbledon & SW London', 'Buyer\'s Agent'];
function Marquee() {
  return (
    <div className="overflow-hidden py-5 bg-brand border-y border-brand-dark">
      <motion.div
        animate={{ x: ['0%', '-50%'] }}
        transition={{ duration: 22, repeat: Infinity, ease: 'linear' }}
        className="flex gap-0 whitespace-nowrap"
      >
        {[...marqueeItems, ...marqueeItems].map((item, i) => (
          <span key={i} className="text-[11px] font-inter font-medium uppercase tracking-[0.3em] text-white/90 flex items-center">
            {item}
            <span className="mx-8 text-white/30">·</span>
          </span>
        ))}
      </motion.div>
    </div>
  );
}

// ─── Process Step ─────────────────────────────────────────────────────────────
const steps = [
  {
    number: '01',
    title: 'The Brief',
    subtitle: 'We listen first.',
    description: 'Every successful search begins with understanding you. We sit down — in person or virtually — to learn everything: your lifestyle, non-negotiables, preferred streets, budget, and timeline. The more we know, the more precisely we can search.',
    image: 'https://images.unsplash.com/photo-1600880292089-90a7e086ee0c?w=1200&q=85',
    label: 'Initial Consultation',
  },
  {
    number: '02',
    title: 'The Search',
    subtitle: 'On and off the market.',
    description: 'Using our professional network built over decades in Wimbledon and South West London, we access properties before they reach Rightmove or Zoopla. We speak to local agents, solicitors, and homeowners to uncover opportunities invisible to the public.',
    image: 'https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?w=1200&q=85',
    label: 'Active Search',
  },
  {
    number: '03',
    title: 'The Shortlist',
    subtitle: 'Only what matters.',
    description: 'We attend every viewing on your behalf first, so you only see properties that genuinely deserve your time. Each shortlisted home comes with our candid assessment — the opportunity, the risks, and our honest recommendation.',
    image: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=1200&q=85',
    label: 'Curated Selection',
  },
  {
    number: '04',
    title: 'The Negotiation',
    subtitle: 'Fighting in your corner.',
    description: 'We negotiate the price and terms entirely on your behalf, armed with comparable market data and years of deal-making experience. Our goal is simple: secure your chosen property at the best possible price, with the strongest possible conditions.',
    image: 'https://images.unsplash.com/photo-1567767292278-a4f21aa2d36e?w=1200&q=85',
    label: 'Acquisition',
  },
];

// ─── Client Types ─────────────────────────────────────────────────────────────
const clientTypes = [
  { title: 'Relocating Buyers', body: 'Moving to SW London from elsewhere or abroad? We do the groundwork so you only cross the threshold when a property truly merits it.' },
  { title: 'Upsizing Families', body: 'Space, schools, gardens. We know which streets, which developers, and which agents to call first when the right family home becomes available.' },
  { title: 'Downsizers', body: 'The perfect smaller home is rarely found by chance. We listen carefully and search until we find a property that fits your next chapter precisely.' },
  { title: 'Time-Poor Professionals', body: 'You have the means but not the hours. We search, vet, and filter every property — so your time is only ever spent on the right ones.' },
  { title: 'Investment Buyers', body: 'We identify properties with strong rental yield and capital growth potential, backed by granular knowledge of the SW19 and KT3 markets.' },
  { title: 'Discreet Purchasers', body: 'For those who prefer their search to remain private, we operate entirely behind the scenes. Your requirements never enter the public domain.' },
];

const statsData = [
  { value: 30, suffix: '+', label: 'Years of Local Expertise' },
  { value: 500, suffix: 'm+', prefix: '£', label: 'Worth of Property Transacted' },
  { value: 98, suffix: '%', label: 'Client Satisfaction Rate' },
  { value: 40, suffix: '%', label: 'Sales Agreed Off-Market' },
];

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function PropertyFinderPage() {
  const heroRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const heroY = useTransform(scrollYProgress, [0, 1], ['0%', '30%']);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);

  const statsRef = useRef(null);
  const statsInView = useInView(statsRef, { once: true, margin: '-100px' });

  const [activeClient, setActiveClient] = useState<number | null>(null);

  return (
    <>
      {/* ─── HERO ─────────────────────────────────────────────────────────── */}
      <section ref={heroRef} className="relative h-screen min-h-[700px] overflow-hidden flex items-center">
        {/* Background */}
        <motion.div style={{ y: heroY }} className="absolute inset-0 scale-110">
          <Image
            src="https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=2400&q=90"
            alt="Luxury property"
            fill
            priority
            className="object-cover"
            sizes="100vw"
          />
        </motion.div>

        {/* Overlays */}
        <div className="absolute inset-0 bg-gradient-to-r from-charcoal/90 via-charcoal/60 to-charcoal/20" />
        <div className="absolute inset-0 bg-gradient-to-t from-charcoal/50 via-transparent to-transparent" />

        {/* Content */}
        <motion.div style={{ opacity: heroOpacity }} className="relative z-10 w-full">
          <div className="container-wide">
            <div className="max-w-3xl">
              {/* Label */}
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
                className="flex items-center gap-4 mb-8"
              >
                <div className="w-8 h-px bg-brand" />
                <span className="text-[11px] font-inter font-medium uppercase tracking-[0.35em] text-white/70">
                  Bespoke Buyer&apos;s Service
                </span>
              </motion.div>

              {/* Headline */}
              <div className="overflow-hidden mb-3">
                <h1 className="font-cormorant text-[3.5rem] sm:text-[5rem] md:text-[6rem] lg:text-[7rem] font-light text-white leading-[0.92] tracking-tight">
                  <SplitText text="Your Personal" delay={0.3} />
                </h1>
              </div>
              <div className="overflow-hidden mb-8">
                <h1 className="font-cormorant text-[3.5rem] sm:text-[5rem] md:text-[6rem] lg:text-[7rem] font-light leading-[0.92] tracking-tight">
                  <SplitText text="Property Finder" delay={0.5} className="text-brand-light" />
                </h1>
              </div>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 1.2, ease: [0.22, 1, 0.36, 1] }}
                className="text-[16px] md:text-[18px] font-inter font-light text-white/60 max-w-lg leading-[1.8]"
              >
                Working exclusively for buyers in Wimbledon and South West London — on and off the market.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 1.5, ease: [0.22, 1, 0.36, 1] }}
                className="mt-10 flex flex-col sm:flex-row gap-4"
              >
                <Link
                  href="/contact"
                  className="group inline-flex items-center gap-4 bg-brand text-white px-8 py-4 text-[12px] font-inter font-medium uppercase tracking-[0.2em] hover:bg-brand-dark transition-all duration-500"
                >
                  Register Your Requirements
                  <svg className="w-4 h-4 transition-transform duration-500 group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 8.25L21 12m0 0l-3.75 3.75M21 12H3" />
                  </svg>
                </Link>
                <a
                  href="tel:02035973484"
                  className="group inline-flex items-center gap-4 border border-white/25 text-white px-8 py-4 text-[12px] font-inter font-medium uppercase tracking-[0.2em] hover:bg-white/10 transition-all duration-500"
                >
                  0203 597 3484
                </a>
              </motion.div>
            </div>
          </div>
        </motion.div>

        {/* Scroll Indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2.2, duration: 1 }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-3"
        >
          <span className="text-[9px] font-inter uppercase tracking-[0.4em] text-white/30">Discover</span>
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
            className="w-px h-8 bg-gradient-to-b from-white/40 to-transparent"
          />
        </motion.div>
      </section>

      {/* ─── MARQUEE ──────────────────────────────────────────────────────── */}
      <Marquee />

      {/* ─── INTRO ────────────────────────────────────────────────────────── */}
      <section className="grid grid-cols-1 lg:grid-cols-2 min-h-[680px] bg-white">
        {/* Image with clip-path reveal */}
        <div className="relative h-[500px] lg:h-auto overflow-hidden order-2 lg:order-1">
          <motion.div
            initial={{ clipPath: 'inset(0 100% 0 0)' }}
            whileInView={{ clipPath: 'inset(0 0% 0 0)' }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-0"
          >
            <Image
              src="https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1200&q=85"
              alt="Wimbledon street"
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 50vw"
            />
            <div className="absolute inset-0 bg-charcoal/10" />
          </motion.div>
          {/* Floating label */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="absolute bottom-8 left-8 bg-white/95 backdrop-blur-sm px-6 py-4"
          >
            <p className="text-[10px] font-inter uppercase tracking-[0.25em] text-brand mb-1">Coverage Area</p>
            <p className="font-cormorant text-[1.25rem] text-charcoal font-light">Wimbledon · SW London · Surrey</p>
          </motion.div>
        </div>

        {/* Content */}
        <div className="flex items-center order-1 lg:order-2">
          <div className="px-8 py-20 lg:px-16 xl:px-20 lg:py-24">
            <motion.span
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              className="text-[11px] font-inter font-medium uppercase tracking-[0.3em] text-brand"
            >
              Why a Property Finder?
            </motion.span>

            <motion.h2
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.9, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
              className="font-cormorant text-[2.5rem] md:text-[3.25rem] font-light text-charcoal mt-5 leading-[1.1]"
            >
              The best homes rarely<br />reach the open market
            </motion.h2>

            <motion.div
              initial={{ scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="w-14 h-px bg-brand mt-8 mb-8 origin-left"
            />

            {[
              'In Wimbledon and South West London, the finest properties are frequently sold through professional networks and word of mouth — before a photograph has been taken.',
              'As your dedicated buyer\'s agent, we give you an inside track that no portal can provide. We work entirely for you, with one goal: finding the home that is right for you.',
            ].map((para, i) => (
              <motion.p
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: 0.3 + i * 0.15, ease: [0.22, 1, 0.36, 1] }}
                className="text-[15px] md:text-[16px] text-slate font-inter font-light leading-[1.9] mb-5 last:mb-0"
              >
                {para}
              </motion.p>
            ))}

            <motion.blockquote
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="mt-10 pl-6 border-l-2 border-brand/30"
            >
              <p className="font-cormorant text-[1.3rem] font-light text-charcoal italic leading-[1.6]">
                &ldquo;We only present properties that genuinely match your brief. No wasted viewings. No pressure. Just the right home.&rdquo;
              </p>
              <p className="mt-3 text-[12px] font-inter text-slate/60">Elizabeth Wightwick, Principal</p>
            </motion.blockquote>
          </div>
        </div>
      </section>

      {/* ─── PROCESS ──────────────────────────────────────────────────────── */}
      <section className="bg-cream overflow-hidden">
        <div className="container-wide py-24 lg:py-32">
          {/* Heading */}
          <div className="flex items-end justify-between mb-20">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            >
              <p className="text-[11px] font-inter font-medium uppercase tracking-[0.3em] text-brand mb-3">How It Works</p>
              <h2 className="font-cormorant text-[2.75rem] md:text-[4rem] font-light text-charcoal leading-[1.05]">
                A four-step process
              </h2>
            </motion.div>
            <motion.div
              initial={{ scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
              className="hidden lg:block flex-1 h-px bg-taupe/30 mx-12 origin-left"
            />
          </div>

          {/* Steps */}
          <div className="space-y-0">
            {steps.map((step, i) => {
              const isEven = i % 2 === 0;
              return (
                <motion.div
                  key={step.number}
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true, margin: '-80px' }}
                  transition={{ duration: 0.6 }}
                  className={`grid grid-cols-1 lg:grid-cols-2 border-t border-taupe/20 ${i === steps.length - 1 ? 'border-b' : ''}`}
                >
                  {/* Image */}
                  <div className={`relative h-[360px] lg:h-[500px] overflow-hidden ${isEven ? 'lg:order-1' : 'lg:order-2'}`}>
                    <motion.div
                      initial={{ scale: 1.1 }}
                      whileInView={{ scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
                      className="absolute inset-0"
                    >
                      <Image
                        src={step.image}
                        alt={step.title}
                        fill
                        className="object-cover"
                        sizes="(max-width: 1024px) 100vw, 50vw"
                      />
                      <div className="absolute inset-0 bg-charcoal/15" />
                    </motion.div>
                    {/* Step number overlay */}
                    <div className="absolute top-6 right-6 lg:top-8 lg:right-8">
                      <span className="font-cormorant text-[5rem] font-light text-white/20 leading-none">{step.number}</span>
                    </div>
                    {/* Label chip */}
                    <div className="absolute bottom-6 left-6">
                      <span className="bg-white/90 backdrop-blur-sm text-[10px] font-inter font-medium uppercase tracking-[0.25em] text-brand px-4 py-2">
                        {step.label}
                      </span>
                    </div>
                  </div>

                  {/* Content */}
                  <div className={`flex items-center ${isEven ? 'lg:order-2' : 'lg:order-1'}`}>
                    <div className="px-8 py-16 lg:px-16 xl:px-20 max-w-xl">
                      <motion.span
                        initial={{ opacity: 0, x: isEven ? 20 : -20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
                        className="font-cormorant text-[5rem] font-light text-brand/15 leading-none block mb-2"
                      >
                        {step.number}
                      </motion.span>
                      <motion.h3
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
                        className="font-cormorant text-[2.25rem] md:text-[2.75rem] font-light text-charcoal leading-[1.1] mb-2"
                      >
                        {step.title}
                      </motion.h3>
                      <motion.p
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6, delay: 0.4 }}
                        className="text-[13px] font-inter font-medium uppercase tracking-[0.2em] text-brand mb-6"
                      >
                        {step.subtitle}
                      </motion.p>
                      <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
                        className="text-[15px] md:text-[16px] text-slate font-inter font-light leading-[1.9]"
                      >
                        {step.description}
                      </motion.p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── STATS ────────────────────────────────────────────────────────── */}
      <section ref={statsRef} className="py-24 lg:py-32 bg-charcoal relative overflow-hidden">
        {/* Glow */}
        <div className="absolute inset-0 opacity-[0.08]">
          <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-brand rounded-full blur-[180px]" />
          <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-brand-light rounded-full blur-[180px]" />
        </div>
        <div className="container-wide relative z-10">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-6">
            {statsData.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: i * 0.12, ease: [0.22, 1, 0.36, 1] }}
                className="text-center"
              >
                <div className="font-cormorant text-[3.5rem] md:text-[4.5rem] font-light text-white leading-none">
                  <AnimatedCounter value={stat.value} suffix={stat.suffix} prefix={stat.prefix} inView={statsInView} />
                </div>
                <motion.div
                  initial={{ scaleX: 0 }}
                  whileInView={{ scaleX: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.8, delay: 0.3 + i * 0.12 }}
                  className="w-8 h-px bg-brand/60 mx-auto mt-4 mb-4 origin-left"
                />
                <p className="text-[11px] font-inter font-medium uppercase tracking-[0.22em] text-white/35">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── WHO WE HELP ──────────────────────────────────────────────────── */}
      <section className="bg-white section-padding">
        <div className="container-wide">
          <div className="mb-16">
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7 }}
              className="text-[11px] font-inter font-medium uppercase tracking-[0.3em] text-brand mb-3"
            >
              Who We Help
            </motion.p>
            <motion.h2
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.9, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
              className="font-cormorant text-[2.75rem] md:text-[4rem] font-light text-charcoal leading-[1.05] max-w-2xl"
            >
              Built for every kind of buyer
            </motion.h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-beige border border-beige">
            {clientTypes.map((client, i) => (
              <motion.div
                key={client.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.7, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
                onHoverStart={() => setActiveClient(i)}
                onHoverEnd={() => setActiveClient(null)}
                className="relative bg-white p-10 group cursor-default overflow-hidden"
              >
                {/* Hover fill */}
                <motion.div
                  initial={{ y: '100%' }}
                  animate={{ y: activeClient === i ? '0%' : '100%' }}
                  transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  className="absolute inset-0 bg-brand pointer-events-none"
                />
                <div className="relative z-10">
                  <div className="flex items-start justify-between mb-6">
                    <span className={`font-cormorant text-[3rem] font-light leading-none transition-colors duration-500 ${activeClient === i ? 'text-white/20' : 'text-brand/20'}`}>
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <motion.div
                      animate={{ x: activeClient === i ? 0 : -6, opacity: activeClient === i ? 1 : 0 }}
                      transition={{ duration: 0.4 }}
                      className="mt-2"
                    >
                      <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 8.25L21 12m0 0l-3.75 3.75M21 12H3" />
                      </svg>
                    </motion.div>
                  </div>
                  <h3 className={`font-cormorant text-[1.5rem] font-normal mb-4 transition-colors duration-500 ${activeClient === i ? 'text-white' : 'text-charcoal'}`}>
                    {client.title}
                  </h3>
                  <p className={`text-[14px] font-inter font-light leading-[1.8] transition-colors duration-500 ${activeClient === i ? 'text-white/80' : 'text-slate'}`}>
                    {client.body}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FULL-BLEED QUOTE ─────────────────────────────────────────────── */}
      <section className="relative py-32 lg:py-48 overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src="https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=2000&q=80"
            alt="Luxury home"
            fill
            className="object-cover"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-charcoal/80" />
        </div>
        <div className="relative z-10 container-narrow text-center">
          <motion.div
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
            className="w-16 h-px bg-brand mx-auto mb-12 origin-left"
          />
          <motion.p
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="font-cormorant text-[1.8rem] sm:text-[2.25rem] md:text-[2.75rem] font-light text-white italic leading-[1.45]"
          >
            &ldquo;We have spent decades building relationships in this market — with agents, developers, solicitors, and homeowners who are not yet selling. That network is your advantage.&rdquo;
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.7 }}
            className="mt-10"
          >
            <p className="font-inter text-[13px] font-medium text-white/50 uppercase tracking-[0.3em]">Elizabeth Wightwick</p>
          </motion.div>
        </div>
      </section>

      {/* ─── BENEFITS LIST ────────────────────────────────────────────────── */}
      <section className="bg-cream section-padding">
        <div className="container-wide">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 lg:gap-32 items-start">
            <div>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.7 }}
                className="text-[11px] font-inter font-medium uppercase tracking-[0.3em] text-brand mb-3"
              >
                Everything Included
              </motion.p>
              <motion.h2
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.9, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
                className="font-cormorant text-[2.75rem] md:text-[3.5rem] font-light text-charcoal leading-[1.1] mb-8"
              >
                A fully bespoke<br />buying service
              </motion.h2>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: 0.25 }}
                className="text-[15px] md:text-[16px] text-slate font-inter font-light leading-[1.9] mb-10"
              >
                We work with a small number of clients at any one time to ensure that every search receives the dedication it deserves. This is not a volume service — it is a personal one.
              </motion.p>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: 0.4 }}
              >
                <Link
                  href="/contact"
                  className="group inline-flex items-center gap-5 text-[12px] font-inter font-medium uppercase tracking-[0.25em] text-charcoal"
                >
                  <span className="relative">
                    Enquire About This Service
                    <span className="absolute -bottom-1 left-0 w-0 group-hover:w-full h-px bg-brand transition-all duration-500" />
                  </span>
                  <span className="w-10 h-px bg-charcoal group-hover:w-16 group-hover:bg-brand transition-all duration-500" />
                </Link>
              </motion.div>
            </div>

            <div>
              {[
                'Access to off-market and pre-market properties',
                'Dedicated search tailored to your exact brief',
                'First-attendance at all viewings on your behalf',
                'Candid, independent assessment of every property',
                'Professional negotiation to achieve the best price',
                'Trusted network: solicitors, surveyors, mortgage advisors',
                'Full discretion — your requirements are never made public',
                'Continued support through exchange and completion',
              ].map((benefit, i) => (
                <motion.div
                  key={benefit}
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: i * 0.07, ease: [0.22, 1, 0.36, 1] }}
                  className="flex items-center gap-5 py-5 border-b border-taupe/20 group"
                >
                  <div className="w-1.5 h-1.5 bg-brand rounded-full flex-shrink-0 group-hover:scale-150 transition-transform duration-300" />
                  <span className="text-[15px] font-inter text-charcoal group-hover:text-brand transition-colors duration-300">{benefit}</span>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── CTA ──────────────────────────────────────────────────────────── */}
      <section className="bg-charcoal py-28 lg:py-40 relative overflow-hidden">
        {/* Decorative line */}
        <motion.div
          initial={{ scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1] }}
          className="absolute top-0 left-0 right-0 h-px bg-brand/20 origin-left"
        />
        <div className="container-narrow text-center relative z-10">
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="text-[11px] font-inter font-medium uppercase tracking-[0.35em] text-brand mb-6"
          >
            Begin Your Search
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="font-cormorant text-[3rem] sm:text-[4rem] md:text-[5rem] font-light text-white leading-[1.05] mb-6"
          >
            Tell us what you are<br />looking for
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="text-[16px] font-inter font-light text-white/50 max-w-lg mx-auto leading-[1.85] mb-12"
          >
            Initial conversations are always confidential and without obligation. We would love to hear what you are looking for.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link
              href="/contact"
              className="group inline-flex items-center gap-4 bg-brand text-white px-10 py-4 text-[12px] font-inter font-medium uppercase tracking-[0.2em] hover:bg-brand-dark transition-all duration-500"
            >
              Register Your Requirements
              <svg className="w-4 h-4 transition-transform duration-500 group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 8.25L21 12m0 0l-3.75 3.75M21 12H3" />
              </svg>
            </Link>
            <a
              href="tel:02035973484"
              className="group inline-flex items-center gap-4 border border-white/20 text-white/70 px-10 py-4 text-[12px] font-inter font-medium uppercase tracking-[0.2em] hover:border-white/40 hover:text-white transition-all duration-500"
            >
              Call 0203 597 3484
            </a>
          </motion.div>
        </div>
      </section>
    </>
  );
}
