import { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.ADMIN_JWT_SECRET || 'super-secret-admin-token-key-999';

export interface AdminSession {
  username: string;
  role: string;
}

export function signToken(username: string): string {
  return jwt.sign({ username, role: 'admin' }, JWT_SECRET, { expiresIn: '1d' });
}

export function verifyToken(token: string): AdminSession | null {
  try {
    return jwt.verify(token, JWT_SECRET) as AdminSession;
  } catch {
    return null;
  }
}

export function getAdminSession(req: NextRequest): AdminSession | null {
  const token = req.cookies.get('admin-token')?.value;
  if (!token) return null;
  return verifyToken(token);
}
