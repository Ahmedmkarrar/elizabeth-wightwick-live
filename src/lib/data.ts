import { supabase, supabaseAdmin } from './supabase';
import type { Property, PropertyStatus } from '@/types';

// ─── Row mapper ────────────────────────────────────────────────────────────────
function rowToProperty(row: Record<string, unknown>): Property {
  return {
    id: row.id as string,
    title: row.title as string,
    address_line_1: row.address_line_1 as string,
    address_line_2: (row.address_line_2 as string) || undefined,
    city: row.city as string,
    postcode: row.postcode as string,
    description: row.description as string,
    department: row.department as 'sales' | 'lettings',
    property_type: row.property_type as Property['property_type'],
    price: row.price as number,
    price_qualifier: (row.price_qualifier as Property['price_qualifier']) || undefined,
    rent_period: (row.rent_period as string) || undefined,
    status: row.status as PropertyStatus,
    bedrooms: row.bedrooms as number,
    bathrooms: row.bathrooms as number,
    reception_rooms: (row.reception_rooms as number) || undefined,
    features: (row.features as string[]) || [],
    images: (row.images as string[]) || [],
    main_image: (row.main_image as string) || '',
    floor_plan_url: (row.floor_plan_url as string) || undefined,
    brochure_url: (row.brochure_url as string) || undefined,
    epc_rating: (row.epc_rating as string) || undefined,
    council_tax_band: (row.council_tax_band as string) || undefined,
    tenure: (row.tenure as string) || undefined,
    lease_length: (row.lease_length as number) || undefined,
    service_charge: (row.service_charge as number) || undefined,
    ground_rent: (row.ground_rent as number) || undefined,
    latitude: (row.latitude as number) || undefined,
    longitude: (row.longitude as number) || undefined,
    featured: row.featured as boolean,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
    sold_let_date: (row.sold_let_date as string) || undefined,
  };
}

// ─── READ ──────────────────────────────────────────────────────────────────────
export async function getAllProperties(): Promise<Property[]> {
  const { data, error } = await supabaseAdmin
    .from('properties')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data || []).map(rowToProperty);
}

export async function getPublicProperties(department?: string): Promise<Property[]> {
  let q = supabase.from('properties').select('*').order('created_at', { ascending: false });
  if (department) q = q.eq('department', department);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data || []).map(rowToProperty);
}

export async function getPropertyById(id: string): Promise<Property | null> {
  const { data, error } = await supabaseAdmin
    .from('properties')
    .select('*')
    .eq('id', id)
    .single();
  if (error) return null;
  return rowToProperty(data);
}

export async function getFeaturedProperties(): Promise<Property[]> {
  const { data, error } = await supabase
    .from('properties')
    .select('*')
    .eq('featured', true)
    .order('created_at', { ascending: false });
  if (error) return [];
  return (data || []).map(rowToProperty);
}

// ─── DASHBOARD STATS ───────────────────────────────────────────────────────────
export async function getDashboardStats() {
  const [propertiesRes, inquiriesRes, valuationsRes] = await Promise.all([
    supabaseAdmin.from('properties').select('id, department, status'),
    supabaseAdmin.from('inquiries').select('id, status'),
    supabaseAdmin.from('valuations').select('id, status'),
  ]);

  const props = propertiesRes.data || [];
  const inquiries = inquiriesRes.data || [];
  const valuations = valuationsRes.data || [];

  return {
    total: props.length,
    forSale: props.filter((p) => p.department === 'sales').length,
    toLet: props.filter((p) => p.department === 'lettings').length,
    available: props.filter((p) => p.status === 'available').length,
    newInquiries: inquiries.filter((i) => i.status === 'new').length,
    totalInquiries: inquiries.length,
    newValuations: valuations.filter((v) => v.status === 'new').length,
    totalValuations: valuations.length,
  };
}

// ─── CREATE ────────────────────────────────────────────────────────────────────
export async function createProperty(data: Omit<Property, 'id' | 'created_at' | 'updated_at'>): Promise<Property> {
  const { data: row, error } = await supabaseAdmin
    .from('properties')
    .insert({
      title: data.address_line_1,
      address_line_1: data.address_line_1,
      address_line_2: data.address_line_2 || null,
      city: data.city,
      postcode: data.postcode,
      description: data.description,
      department: data.department,
      property_type: data.property_type,
      price: data.price,
      price_qualifier: data.price_qualifier || null,
      rent_period: data.rent_period || null,
      status: data.status,
      bedrooms: data.bedrooms,
      bathrooms: data.bathrooms,
      reception_rooms: data.reception_rooms || null,
      features: data.features,
      images: data.images,
      main_image: data.main_image,
      floor_plan_url: data.floor_plan_url || null,
      epc_rating: data.epc_rating || null,
      council_tax_band: data.council_tax_band || null,
      tenure: data.tenure || null,
      lease_length: data.lease_length || null,
      service_charge: data.service_charge || null,
      ground_rent: data.ground_rent || null,
      featured: data.featured,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return rowToProperty(row);
}

// ─── UPDATE ────────────────────────────────────────────────────────────────────
export async function updateProperty(id: string, data: Partial<Property>): Promise<void> {
  const update: Record<string, unknown> = {};
  if (data.address_line_1 !== undefined) { update.address_line_1 = data.address_line_1; update.title = data.address_line_1; }
  if (data.address_line_2 !== undefined) update.address_line_2 = data.address_line_2 || null;
  if (data.city !== undefined) update.city = data.city;
  if (data.postcode !== undefined) update.postcode = data.postcode;
  if (data.description !== undefined) update.description = data.description;
  if (data.department !== undefined) update.department = data.department;
  if (data.property_type !== undefined) update.property_type = data.property_type;
  if (data.price !== undefined) update.price = data.price;
  if (data.price_qualifier !== undefined) update.price_qualifier = data.price_qualifier || null;
  if (data.rent_period !== undefined) update.rent_period = data.rent_period || null;
  if (data.status !== undefined) update.status = data.status;
  if (data.bedrooms !== undefined) update.bedrooms = data.bedrooms;
  if (data.bathrooms !== undefined) update.bathrooms = data.bathrooms;
  if (data.reception_rooms !== undefined) update.reception_rooms = data.reception_rooms || null;
  if (data.features !== undefined) update.features = data.features;
  if (data.images !== undefined) update.images = data.images;
  if (data.main_image !== undefined) update.main_image = data.main_image;
  if (data.floor_plan_url !== undefined) update.floor_plan_url = data.floor_plan_url || null;
  if (data.epc_rating !== undefined) update.epc_rating = data.epc_rating || null;
  if (data.council_tax_band !== undefined) update.council_tax_band = data.council_tax_band || null;
  if (data.tenure !== undefined) update.tenure = data.tenure || null;
  if (data.lease_length !== undefined) update.lease_length = data.lease_length || null;
  if (data.service_charge !== undefined) update.service_charge = data.service_charge || null;
  if (data.ground_rent !== undefined) update.ground_rent = data.ground_rent || null;
  if (data.featured !== undefined) update.featured = data.featured;
  update.updated_at = new Date().toISOString();

  const { error } = await supabaseAdmin
    .from('properties')
    .update(update)
    .eq('id', id);
  if (error) throw new Error(error.message);
}

export async function updatePropertyStatus(id: string, status: PropertyStatus): Promise<void> {
  const { error } = await supabaseAdmin
    .from('properties')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw new Error(error.message);
}

export async function updatePropertyFeatured(id: string, featured: boolean): Promise<void> {
  const { error } = await supabaseAdmin
    .from('properties')
    .update({ featured, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw new Error(error.message);
}

// ─── DELETE ────────────────────────────────────────────────────────────────────
export async function deleteProperty(id: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from('properties')
    .delete()
    .eq('id', id);
  if (error) throw new Error(error.message);
}

// ─── IMAGE UPLOAD ──────────────────────────────────────────────────────────────
export async function uploadPropertyImage(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch('/api/admin/upload', { method: 'POST', body: formData });
  if (!res.ok) throw new Error('Upload failed');
  const json = await res.json();
  return json.url as string;
}

export async function deletePropertyImage(url: string): Promise<void> {
  // Extract path from public URL and delete from storage
  const match = url.match(/property-images\/(.+)$/);
  if (!match) return;
  await supabaseAdmin.storage.from('property-images').remove([match[1]]);
}
