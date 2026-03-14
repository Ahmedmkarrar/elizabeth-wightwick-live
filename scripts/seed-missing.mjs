import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const env = {}
try {
  readFileSync(join(__dirname, '..', '.env.local'), 'utf8')
    .split('\n').forEach(line => {
      const idx = line.indexOf('=')
      if (idx > 0) env[line.slice(0, idx).trim()] = line.slice(idx + 1).trim()
    })
} catch {}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE_KEY
)

const now = new Date().toISOString()

const missing = [
  {
    title: '4 Bedroom House — Sandringham Avenue',
    address_line_1: '6 Sandringham Avenue',
    city: 'London',
    postcode: 'SW20 8JY',
    description: 'A spacious four bedroom family home on Sandringham Avenue in South Wimbledon. Well presented throughout with generous living accommodation, garden, and excellent transport links. Close to outstanding local schools and Wimbledon town centre.',
    department: 'lettings',
    property_type: 'house',
    price: 3500,
    rent_period: 'pcm',
    status: 'let_agreed',
    bedrooms: 4,
    bathrooms: 2,
    reception_rooms: 2,
    features: ['Garden', 'Near Wimbledon Town Centre', 'Excellent Schools', 'Good Transport Links'],
    images: [],
    main_image: '',
    featured: false,
    created_at: now,
    updated_at: now,
  },
  {
    title: '4 Bedroom House — Woodlands Avenue',
    address_line_1: '37 Woodlands Avenue',
    city: 'New Malden',
    postcode: 'KT3 3UL',
    description: 'A well presented four bedroom family home on Woodlands Avenue in New Malden. Offering generous living space across two floors with a lovely garden and off-street parking. Close to New Malden high street, mainline station, and quality local schools.',
    department: 'lettings',
    property_type: 'house',
    price: 3950,
    rent_period: 'pcm',
    status: 'let_agreed',
    bedrooms: 4,
    bathrooms: 2,
    reception_rooms: 2,
    features: ['Garden', 'Off-Street Parking', 'Near New Malden Station', 'Quality Schools Nearby'],
    images: [],
    main_image: '',
    featured: false,
    created_at: now,
    updated_at: now,
  },
  {
    title: '2 Bedroom Apartment — Hereford House, Wimbledon Park Road',
    address_line_1: 'Flat 9, 74 Hereford House',
    address_line_2: 'Wimbledon Park Road',
    city: 'London',
    postcode: 'SW18 5SH',
    description: 'A well appointed two bedroom apartment in Hereford House on Wimbledon Park Road. The property offers bright and spacious accommodation with a modern kitchen, bathroom, and excellent storage. Located moments from Wimbledon Park tube station (District line) with easy access to Wimbledon Village and town centre.',
    department: 'lettings',
    property_type: 'flat',
    price: 2500,
    rent_period: 'pcm',
    status: 'available',
    bedrooms: 2,
    bathrooms: 1,
    reception_rooms: 1,
    features: ['Near Wimbledon Park Tube', 'Modern Kitchen', 'Good Storage', 'Near Wimbledon Village'],
    images: [],
    main_image: '',
    featured: true,
    created_at: now,
    updated_at: now,
  },
  {
    title: 'Studio — Malden Hill',
    address_line_1: '14 Malden Hill',
    city: 'New Malden',
    postcode: 'KT3 4DR',
    description: 'A well presented studio apartment on Malden Hill in New Malden. Offering compact and efficient living accommodation in a convenient location close to New Malden high street, local amenities, and transport links to central London.',
    department: 'lettings',
    property_type: 'studio',
    price: 2550,
    rent_period: 'pcm',
    status: 'let_agreed',
    bedrooms: 0,
    bathrooms: 1,
    reception_rooms: 1,
    features: ['Near New Malden High Street', 'Good Transport Links', 'Local Amenities'],
    images: [],
    main_image: '',
    featured: false,
    created_at: now,
    updated_at: now,
  },
  {
    title: '1 Bedroom Flat — Hartfield Road',
    address_line_1: 'Flat E, 98 Hartfield Road',
    city: 'London',
    postcode: 'SW19 3TF',
    description: 'A bright and well presented one bedroom flat on Hartfield Road in Wimbledon. The property benefits from modern fittings throughout with a well appointed kitchen and bathroom. Excellent location close to Wimbledon town centre, mainline and tube station, and a wide range of shops, restaurants, and amenities.',
    department: 'lettings',
    property_type: 'flat',
    price: 1195,
    rent_period: 'pcm',
    status: 'let_agreed',
    bedrooms: 1,
    bathrooms: 1,
    reception_rooms: 1,
    features: ['Near Wimbledon Station', 'Modern Fittings', 'Close to Town Centre', 'Good Transport Links'],
    images: [],
    main_image: '',
    featured: false,
    created_at: now,
    updated_at: now,
  },
]

async function seed() {
  console.log(`\nAdding ${missing.length} missing properties...\n`)
  const { data, error } = await supabase.from('properties').insert(missing).select('id, title')
  if (error) { console.error('❌', error.message); process.exit(1) }
  data.forEach(p => console.log(`  ✓ ${p.title}`))
  console.log(`\n✅ Done — ${data.length} properties added.\n`)
}

seed()
