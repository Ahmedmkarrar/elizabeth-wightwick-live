import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { sendValuationNotification } from '@/lib/email';

export async function GET() {
  const { data, error } = await supabase
    .from('valuations')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  const { address, property_type, bedrooms, name, email, phone, best_time, additional_info } = body;

  if (!address || !name || !email || !phone) {
    return NextResponse.json(
      { error: 'Address, name, email, and phone are required' },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from('valuations')
    .insert({
      address,
      property_type,
      bedrooms,
      name,
      email,
      phone,
      best_time,
      additional_info,
      status: 'new',
    })
    .select()
    .single();

  if (error) {
    await sendValuationNotification({ address, property_type, bedrooms, name, email, phone, best_time, additional_info }).catch(() => {});
    return NextResponse.json({ success: true, warning: error.message }, { status: 201 });
  }

  // Send email notification (non-blocking)
  sendValuationNotification({ address, property_type, bedrooms, name, email, phone, best_time, additional_info }).catch(() => {});

  return NextResponse.json(data, { status: 201 });
}
