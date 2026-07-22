import { NextRequest, NextResponse } from 'next/server';
import { signToken } from '@/lib/auth/adminAuth';
import prisma from '@/lib/db/prisma';

const MASTER_ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const MASTER_ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'p2pexchangeadmin';

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json({ success: false, error: 'Username and password are required' }, { status: 400 });
    }

    // Check Master Credentials first (Zero-Setup Method)
    if (username === MASTER_ADMIN_USERNAME && password === MASTER_ADMIN_PASSWORD) {
      const response = NextResponse.json({ success: true, message: 'Logged in as master admin' });
      const token = signToken('master_admin');
      
      response.cookies.set('admin-token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: 86400, // 1 day
        sameSite: 'lax',
      });
      
      return response;
    }

    // Check Database User with Admin Role (Database Role Method)
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: username },
          { privyId: username },
          { name: username }
        ],
        role: 'admin'
      }
    });

    // For DB Admins, since password authentication is handled by Privy on the user-facing site,
    // the master password is used as the universal access key for the admin portal.
    if (user && password === MASTER_ADMIN_PASSWORD) {
      const response = NextResponse.json({ success: true, message: `Logged in as admin: ${user.name || user.id}` });
      const token = signToken(user.privyId);
      
      response.cookies.set('admin-token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: 86400,
        sameSite: 'lax',
      });
      
      return response;
    }

    return NextResponse.json({ success: false, error: 'Invalid admin credentials' }, { status: 401 });
  } catch (error) {
    console.error('[Login API Error]', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
