import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { sendInquiryNotification } from '@/lib/email';

export async function GET() {
  const { data, error } = await supabase
    .from('inquiries')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  const { name, email, phone, message, type, property_id, property_address, preferred_time } = body;

  if (!name || !email || !type) {
    return NextResponse.json(
      { error: 'Name, email, and type are required' },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from('inquiries')
    .insert({
      name,
      email,
      phone,
      message,
      type,
      property_id: property_id || null,
      preferred_time,
      status: 'new',
    })
    .select()
    .single();

  if (error) {
    // Still send email even if DB write fails (e.g. table not yet created)
    await sendInquiryNotification({ name, email, phone, message, type, property_id, property_address, preferred_time }).catch(() => {});
    return NextResponse.json({ success: true, warning: error.message }, { status: 201 });
  }

  // Send email notification (non-blocking)
  sendInquiryNotification({ name, email, phone, message, type, property_id, property_address, preferred_time }).catch(() => {});

  return NextResponse.json(data, { status: 201 });
}
