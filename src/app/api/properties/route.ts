import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { createProperty } from '@/lib/data';
import type { Property } from '@/types';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const department = searchParams.get('department');
  const status = searchParams.get('status');
  const minBedrooms = searchParams.get('min_bedrooms');
  const minPrice = searchParams.get('min_price');
  const maxPrice = searchParams.get('max_price');
  const sort = searchParams.get('sort') || 'newest';
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '12');

  let query = supabase.from('properties').select('*', { count: 'exact' });

  if (department) query = query.eq('department', department);
  if (status) query = query.eq('status', status);
  if (minBedrooms) query = query.gte('bedrooms', parseInt(minBedrooms));
  if (minPrice) query = query.gte('price', parseFloat(minPrice));
  if (maxPrice) query = query.lte('price', parseFloat(maxPrice));

  if (sort === 'price_asc') {
    query = query.order('price', { ascending: true });
  } else if (sort === 'price_desc') {
    query = query.order('price', { ascending: false });
  } else {
    query = query.order('created_at', { ascending: false });
  }

  const offset = (page - 1) * limit;
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    properties: data,
    total: count,
    page,
    totalPages: Math.ceil((count || 0) / limit),
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const property = await createProperty(body as Omit<Property, 'id' | 'created_at' | 'updated_at'>);
    return NextResponse.json(property, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
