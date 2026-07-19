import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/auth/adminAuth';
import prisma from '@/lib/db/prisma';

export async function GET(req: NextRequest) {
  try {
    const session = getAdminSession(req);
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    // Fetch users along with their wallet and transaction summaries
    const users = await prisma.user.findMany({
      include: {
        wallet: true,
        _count: {
          select: {
            transactions: true,
            referrals: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Calculate Admin metrics
    const transactions = await prisma.transaction.findMany({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 Hours
        },
        status: 'COMPLETED',
      },
    });

    const totalDailyVolume = transactions.reduce((sum: number, tx: any) => sum + tx.amount, 0);

    const pendingDeposits = await prisma.transaction.count({
      where: {
        status: 'PENDING',
        OR: [{ type: 'DEPOSIT' }, { type: 'BUY' }],
      },
    });

    const pendingWithdrawals = await prisma.transaction.count({
      where: {
        status: 'PENDING',
        OR: [{ type: 'WITHDRAW' }, { type: 'SELL' }],
      },
    });

    return NextResponse.json({
      success: true,
      users,
      stats: {
        totalDailyVolume,
        pendingDeposits,
        pendingWithdrawals,
      },
    });
  } catch (error) {
    console.error('[Admin Get Users Error]', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = getAdminSession(req);
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { userId, role } = await req.json();

    if (!userId || !role || !['admin', 'user'].includes(role)) {
      return NextResponse.json({ success: false, error: 'Invalid parameters' }, { status: 400 });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { role },
      select: { id: true, name: true, role: true },
    });

    return NextResponse.json({
      success: true,
      message: `User ${updatedUser.name || updatedUser.id} role updated to ${updatedUser.role}`,
    });
  } catch (error) {
    console.error('[Admin Update User Role Error]', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
