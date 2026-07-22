import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/auth/adminAuth';
import prisma from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = getAdminSession(req);
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const rawSettings = await prisma.setting.findMany();
    
    // Convert array to simple key-value object
    const settings: Record<string, string> = {};
    rawSettings.forEach((s: any) => {
      settings[s.key] = s.value;
    });

    // Seed defaults if empty
    if (!settings['BUY_RATE']) {
      await prisma.setting.createMany({
        data: [
          { key: 'BUY_RATE', value: '90' },
          { key: 'SELL_RATE', value: '88' },
          { key: 'PLATFORM_UPI_ID', value: 'p2pexchange@upi' },
          { key: 'PLATFORM_HOT_WALLET', value: '0x57db74fec2dfc517315ea6034aa746511dd80d4b' },
        ],
        skipDuplicates: true,
      });
      settings['BUY_RATE'] = '90';
      settings['SELL_RATE'] = '88';
      settings['PLATFORM_UPI_ID'] = 'p2pexchange@upi';
      settings['PLATFORM_HOT_WALLET'] = '0x57db74fec2dfc517315ea6034aa746511dd80d4b';
    }

    return NextResponse.json({ success: true, settings });
  } catch (error) {
    console.error('[Admin Get Settings Error]', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = getAdminSession(req);
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { settings } = await req.json();

    if (!settings || typeof settings !== 'object') {
      return NextResponse.json({ success: false, error: 'Invalid payload' }, { status: 400 });
    }

    // Upsert each setting key-value pair
    for (const [key, value] of Object.entries(settings)) {
      if (typeof value === 'string' || typeof value === 'number') {
        await prisma.setting.upsert({
          where: { key },
          update: { value: String(value) },
          create: { key, value: String(value) },
        });
      }
    }

    return NextResponse.json({ success: true, message: 'Platform settings updated successfully' });
  } catch (error) {
    console.error('[Admin Save Settings Error]', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
