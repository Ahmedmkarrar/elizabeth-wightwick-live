import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { sendRegistrationNotification } from '@/lib/email';

export async function POST(request: NextRequest) {
  const body = await request.json();

  const { department, property_type, min_bedrooms, max_bedrooms, min_price, max_price, locations, features, name, email, phone } = body;

  if (!name || !email) {
    return NextResponse.json(
      { error: 'Name and email are required' },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from('registrations')
    .insert({
      department,
      property_type,
      min_bedrooms,
      max_bedrooms,
      min_price,
      max_price,
      locations,
      features,
      name,
      email,
      phone,
      active: true,
    })
    .select()
    .single();

  if (error) {
    await sendRegistrationNotification({ department, property_type, min_bedrooms, min_price, max_price, locations, name, email, phone }).catch(() => {});
    return NextResponse.json({ success: true, warning: error.message }, { status: 201 });
  }

  // Send email notification (non-blocking)
  sendRegistrationNotification({ department, property_type, min_bedrooms, min_price, max_price, locations, name, email, phone }).catch(() => {});

  return NextResponse.json(data, { status: 201 });
}
