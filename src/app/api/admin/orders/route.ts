import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/auth/adminAuth';
import prisma from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = getAdminSession(req);
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const transactions = await prisma.transaction.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            upiId: true,
            phone: true,
          },
        },
      },
    });

    return NextResponse.json({ success: true, transactions });
  } catch (error) {
    console.error('[Admin Get Orders Error]', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = getAdminSession(req);
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { transactionId, action, notes } = await req.json();

    if (!transactionId || !action || !['APPROVE', 'REJECT'].includes(action)) {
      return NextResponse.json({ success: false, error: 'Invalid parameters' }, { status: 400 });
    }

    const tx = await prisma.transaction.findUnique({
      where: { id: transactionId },
      include: { user: true },
    });

    if (!tx) {
      return NextResponse.json({ success: false, error: 'Transaction not found' }, { status: 404 });
    }

    if (tx.status !== 'PENDING' && tx.status !== 'PROCESSING') {
      return NextResponse.json({ success: false, error: 'Transaction is already finalized' }, { status: 400 });
    }

    const adminName = session.username;
    const timestamp = new Date().toISOString();
    const actionLog = `${action}D by admin (${adminName}) on ${timestamp}. Note: ${notes || 'No comments'}`;

    if (action === 'APPROVE') {
      // 1. Finalize BUY transaction (Admin credits user wallet with USDT)
      if (tx.type === 'BUY') {
        await prisma.$transaction([
          prisma.transaction.update({
            where: { id: transactionId },
            data: { status: 'COMPLETED', notes: actionLog },
          }),
          prisma.wallet.update({
            where: { userId: tx.userId },
            data: { usdtBalance: { increment: tx.amount } },
          }),
        ]);

        // Process Referral payouts if the user was referred
        if (tx.user.referredBy) {
          const referral = await prisma.referral.findFirst({
            where: { referredId: tx.userId, isPaid: false },
          });
          
          if (referral) {
            // Credit referrer wallet with bonus and mark referral as paid
            await prisma.$transaction([
              prisma.referral.update({
                where: { id: referral.id },
                data: { isPaid: true },
              }),
              prisma.wallet.update({
                where: { userId: referral.referrerId },
                data: { usdtBalance: { increment: referral.reward } },
              }),
              prisma.transaction.create({
                data: {
                  userId: referral.referrerId,
                  type: 'REFERRAL_BONUS',
                  status: 'COMPLETED',
                  asset: 'USDT',
                  amount: referral.reward,
                  notes: `Referral bonus credited for referring user: ${tx.user.name || tx.user.id}`,
                },
              }),
            ]);
          }
        }
      } 
      // 2. Finalize SELL / WITHDRAW transactions (User already transferred tokens)
      else {
        await prisma.transaction.update({
          where: { id: transactionId },
          data: { status: 'COMPLETED', notes: actionLog },
        });
      }
    } else {
      // Rejecting transaction
      if (tx.type === 'WITHDRAW') {
        // Refund deducted balance back to user's wallet
        await prisma.$transaction([
          prisma.transaction.update({
            where: { id: transactionId },
            data: { status: 'FAILED', notes: actionLog },
          }),
          prisma.wallet.update({
            where: { userId: tx.userId },
            data: { usdtBalance: { increment: tx.amount } },
          }),
        ]);
      } else {
        await prisma.transaction.update({
          where: { id: transactionId },
          data: { status: 'FAILED', notes: actionLog },
        });
      }
    }

    return NextResponse.json({ success: true, message: `Transaction has been successfully ${action}D` });
  } catch (error) {
    console.error('[Admin Finalize Order Error]', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
