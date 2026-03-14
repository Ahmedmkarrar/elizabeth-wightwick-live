'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Bars3Icon, XMarkIcon, ChevronDownIcon, PhoneIcon, EnvelopeIcon } from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';

const navLinks = [
  { href: '/buy', label: 'Buy' },
  { href: '/rent', label: 'Rent' },
  {
    href: '/homeowners',
    label: 'Homeowners',
    children: [
      { href: '/homeowners/selling-with-us', label: 'Selling With Us' },
      { href: '/homeowners/buying-with-us', label: 'Buying With Us' },
      { href: '/homeowners/property-management', label: 'Property Management' },
      { href: '/homeowners/preparing-to-list', label: 'Preparing to List Your Home' },
      { href: '/property-finder', label: 'Property Finder Service' },
    ],
  },
  { href: '/who-we-are', label: 'Who We Are' },
  { href: '/contact', label: 'Contact' },
];

export default function Navigation() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [mobileExpanded, setMobileExpanded] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  const isHome = pathname === '/';
  const isAdmin = pathname.startsWith('/admin');

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setIsMobileOpen(false);
    setActiveDropdown(null);
    setMobileExpanded(null);
  }, [pathname]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (isAdmin) return null;

  const showUtilityBar = !isHome || isScrolled;

  return (
    <>
      {/* Utility Bar */}
      <div
        className={cn(
          'fixed top-0 left-0 right-0 z-50 transition-all duration-500',
          showUtilityBar
            ? 'opacity-100 translate-y-0'
            : 'opacity-0 -translate-y-full pointer-events-none'
        )}
      >
        <div className="bg-charcoal text-white/70">
          <div className="container-wide flex items-center justify-between h-9">
            <div className="flex items-center gap-6">
              <a href="tel:02035973484" className="flex items-center gap-1.5 text-[11px] font-inter tracking-wide hover:text-white transition-colors">
                <PhoneIcon className="w-3 h-3" />
                0203 597 3484
              </a>
              <a href="mailto:info@elizabeth-wightwick.co.uk" className="hidden sm:flex items-center gap-1.5 text-[11px] font-inter tracking-wide hover:text-white transition-colors">
                <EnvelopeIcon className="w-3 h-3" />
                info@elizabeth-wightwick.co.uk
              </a>
            </div>
            <span className="text-[10px] font-inter tracking-wide hidden md:block">
              60 High Street, Wimbledon Village, SW19 5EE
            </span>
          </div>
        </div>
      </div>

      {/* Main Navigation */}
      <header
        className={cn(
          'fixed left-0 right-0 z-40 transition-all duration-500',
          showUtilityBar ? 'top-9' : 'top-0',
          isScrolled || !isHome
            ? 'bg-white/95 backdrop-blur-sm shadow-sm'
            : 'bg-transparent'
        )}
      >
        <nav className="container-wide flex items-center justify-between h-20 lg:h-[72px]">
          {/* Logo */}
          <Link href="/" className="relative z-50">
            <span
              className={cn(
                'font-cormorant text-xl md:text-2xl font-light tracking-wide transition-colors duration-400',
                isScrolled || !isHome ? 'text-charcoal' : 'text-white'
              )}
            >
              Elizabeth Wightwick
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden lg:flex items-center gap-10" ref={dropdownRef}>
            {navLinks.map((link) => (
              <div key={link.href} className="relative">
                {link.children ? (
                  <>
                    <button
                      onClick={() => setActiveDropdown(activeDropdown === link.href ? null : link.href)}
                      onMouseEnter={() => setActiveDropdown(link.href)}
                      className={cn(
                        'text-small font-inter font-normal tracking-wide transition-colors duration-400 nav-link-underline flex items-center gap-1',
                        isScrolled || !isHome
                          ? 'text-charcoal hover:text-brand'
                          : 'text-white/90 hover:text-white',
                        pathname.startsWith(link.href) && 'active'
                      )}
                    >
                      {link.label}
                      <ChevronDownIcon className={cn(
                        'w-3.5 h-3.5 transition-transform duration-300',
                        activeDropdown === link.href && 'rotate-180'
                      )} />
                    </button>
                    <AnimatePresence>
                      {activeDropdown === link.href && (
                        <motion.div
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 8 }}
                          transition={{ duration: 0.2, ease: 'easeOut' }}
                          onMouseLeave={() => setActiveDropdown(null)}
                          className="absolute top-full left-0 mt-3 bg-white shadow-lg min-w-[260px]"
                        >
                          <div className="py-2">
                            {link.children.map((child) => (
                              <Link
                                key={child.href}
                                href={child.href}
                                className={cn(
                                  'block px-6 py-3 text-small font-inter text-charcoal hover:text-brand transition-colors duration-300 border-l-2 border-transparent hover:border-brand',
                                  pathname === child.href && 'text-brand border-brand bg-beige/30'
                                )}
                              >
                                {child.label}
                              </Link>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </>
                ) : (
                  <Link
                    href={link.href}
                    className={cn(
                      'text-small font-inter font-normal tracking-wide transition-colors duration-400 nav-link-underline',
                      isScrolled || !isHome
                        ? 'text-charcoal hover:text-brand'
                        : 'text-white/90 hover:text-white',
                      pathname === link.href && 'active'
                    )}
                  >
                    {link.label}
                  </Link>
                )}
              </div>
            ))}
            <Link
              href="/valuation"
              className={cn(
                'text-small font-inter font-normal tracking-wide px-6 py-2.5 transition-all duration-400',
                isScrolled || !isHome
                  ? 'bg-brand text-white hover:bg-brand-dark'
                  : 'border border-white/60 text-white hover:bg-white/10'
              )}
            >
              Book Valuation
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileOpen(!isMobileOpen)}
            className={cn(
              'lg:hidden relative z-50 p-2 transition-colors duration-400',
              isMobileOpen
                ? 'text-charcoal'
                : isScrolled || !isHome
                  ? 'text-charcoal'
                  : 'text-white'
            )}
            aria-label="Toggle menu"
          >
            {isMobileOpen ? (
              <XMarkIcon className="w-6 h-6" />
            ) : (
              <Bars3Icon className="w-6 h-6" />
            )}
          </button>
        </nav>
      </header>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="fixed inset-0 z-40 bg-white lg:hidden overflow-y-auto"
          >
            <div className="flex flex-col items-center justify-center min-h-full py-24 gap-6">
              {navLinks.map((link, i) => (
                <motion.div
                  key={link.href}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + i * 0.05, duration: 0.4 }}
                  className="text-center"
                >
                  {link.children ? (
                    <div>
                      <button
                        onClick={() => setMobileExpanded(mobileExpanded === link.href ? null : link.href)}
                        className={cn(
                          'font-cormorant text-title font-light text-charcoal transition-colors hover:text-brand flex items-center gap-2',
                          pathname.startsWith(link.href) && 'text-brand'
                        )}
                      >
                        {link.label}
                        <ChevronDownIcon className={cn(
                          'w-4 h-4 transition-transform duration-300',
                          mobileExpanded === link.href && 'rotate-180'
                        )} />
                      </button>
                      <AnimatePresence>
                        {mobileExpanded === link.href && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3 }}
                            className="overflow-hidden"
                          >
                            <div className="pt-4 space-y-3">
                              {link.children.map((child) => (
                                <Link
                                  key={child.href}
                                  href={child.href}
                                  className={cn(
                                    'block font-inter text-small text-slate hover:text-brand transition-colors',
                                    pathname === child.href && 'text-brand'
                                  )}
                                >
                                  {child.label}
                                </Link>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ) : (
                    <Link
                      href={link.href}
                      className={cn(
                        'font-cormorant text-title font-light text-charcoal transition-colors hover:text-brand',
                        pathname === link.href && 'text-brand'
                      )}
                    >
                      {link.label}
                    </Link>
                  )}
                </motion.div>
              ))}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.4 }}
                className="mt-4"
              >
                <Link
                  href="/valuation"
                  className="bg-brand text-white px-8 py-3 text-small font-inter tracking-wide hover:bg-brand-dark transition-colors"
                >
                  Book Valuation
                </Link>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.4 }}
                className="absolute bottom-12 text-center"
              >
                <p className="text-tiny text-slate font-inter">0203 597 3484</p>
                <p className="text-tiny text-slate font-inter mt-1">info@elizabeth-wightwick.co.uk</p>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
