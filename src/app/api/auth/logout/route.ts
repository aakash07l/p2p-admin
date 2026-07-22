import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({ success: true });
}

export async function POST() {
  const response = NextResponse.json({ success: true, message: 'Logged out successfully' });
  
  // Clear the cookie
  response.cookies.set('admin-token', '', {
    httpOnly: true,
    path: '/',
    maxAge: 0,
  });

  return response;
}
