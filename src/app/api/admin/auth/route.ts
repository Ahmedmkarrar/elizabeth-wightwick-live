import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const { email, password } = await request.json();

  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) {
    return NextResponse.json({ error: 'Server not configured' }, { status: 500 });
  }

  if (email === adminEmail && password === adminPassword) {
    return NextResponse.json({ success: true });
  }

  // Small delay to slow brute force
  await new Promise((r) => setTimeout(r, 500));
  return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
}
