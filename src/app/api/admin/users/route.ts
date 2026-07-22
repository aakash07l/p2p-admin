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

    const body = await req.json();

    // 1. Balance Adjustment (Credit or Debit)
    if (body.action === 'ADJUST_BALANCE') {
      const { userId, amount, adjustmentType, reason } = body;
      if (!userId || !amount || isNaN(amount) || amount <= 0 || !['CREDIT', 'DEBIT'].includes(adjustmentType)) {
        return NextResponse.json({ success: false, error: 'Invalid parameters for balance adjustment' }, { status: 400 });
      }

      const wallet = await prisma.wallet.findUnique({ where: { userId } });
      if (!wallet) return NextResponse.json({ success: false, error: 'User wallet not found' }, { status: 404 });

      if (adjustmentType === 'DEBIT' && wallet.usdtBalance < amount) {
        return NextResponse.json({ success: false, error: 'Insufficient USDT balance to debit' }, { status: 400 });
      }

      const balanceChange = adjustmentType === 'CREDIT' ? amount : -amount;

      await prisma.$transaction([
        prisma.wallet.update({
          where: { userId },
          data: { usdtBalance: { increment: balanceChange } },
        }),
        prisma.transaction.create({
          data: {
            userId,
            type: adjustmentType === 'CREDIT' ? 'DEPOSIT' : 'WITHDRAW',
            status: 'COMPLETED',
            asset: 'USDT',
            amount,
            notes: `Manual Admin ${adjustmentType} by ${session.username}. Reason: ${reason || 'Admin manual balance adjustment'}`,
          },
        }),
      ]);

      return NextResponse.json({
        success: true,
        message: `Successfully ${adjustmentType === 'CREDIT' ? 'credited' : 'debited'} ${amount} USDT to user wallet.`,
      });
    }

    // 2. Toggle KYC / Verification
    if (body.action === 'TOGGLE_VERIFY') {
      const { userId, isVerified } = body;
      if (!userId || typeof isVerified !== 'boolean') {
        return NextResponse.json({ success: false, error: 'Invalid parameters' }, { status: 400 });
      }

      await prisma.user.update({
        where: { id: userId },
        data: { isVerified },
      });

      return NextResponse.json({
        success: true,
        message: `User verification updated to ${isVerified ? 'VERIFIED' : 'UNVERIFIED'}`,
      });
    }

    // 3. Update User Role (default handler)
    const { userId, role } = body;

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
    console.error('[Admin Update User Error]', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
