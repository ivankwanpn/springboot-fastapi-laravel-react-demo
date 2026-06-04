import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { status: 'ERROR', message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.slice(7);
    const { role } = await verifyToken(token);

    if (role !== 'ROLE_ADMIN') {
      return NextResponse.json(
        { status: 'ERROR', message: 'Forbidden' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const fromDate = searchParams.get('from') || '';
    const toDate = searchParams.get('to') || '';

    const where: any = {};
    if (fromDate || toDate) {
      where.createdAt = {};
      if (fromDate) where.createdAt.gte = new Date(fromDate);
      if (toDate) where.createdAt.lte = new Date(toDate);
    }

    const [totalTransactions, amountResult] = await Promise.all([
      prisma.transaction.count({ where }),
      prisma.transaction.aggregate({
        where,
        _sum: { amount: true },
      }),
    ]);

    const totalAmount = amountResult._sum.amount ? Number(amountResult._sum.amount) : 0;

    // Get daily volume using groupBy
    const dailyVolumeRaw = await prisma.transaction.groupBy({
      by: ['createdAt'],
      where,
      _count: { id: true },
      _sum: { amount: true },
      orderBy: { createdAt: 'asc' },
    });

    // Group by date (YYYY-MM-DD) since createdAt has time component
    const dailyMap = new Map<string, { count: number; amount: number }>();
    for (const row of dailyVolumeRaw as any[]) {
      const dateStr = new Date(row.createdAt).toISOString().slice(0, 10);
      const existing = dailyMap.get(dateStr);
      if (existing) {
        existing.count += row._count.id;
        existing.amount += Number(row._sum.amount || 0);
      } else {
        dailyMap.set(dateStr, {
          count: row._count.id,
          amount: Number(row._sum.amount || 0),
        });
      }
    }

    const dailyVolume = Array.from(dailyMap.entries())
      .map(([date, data]) => ({
        date,
        count: data.count,
        amount: data.amount,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return NextResponse.json(
      { totalTransactions, totalAmount, dailyVolume },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof Error && error.name === 'JWSSignatureVerificationFailed') {
      return NextResponse.json(
        { status: 'ERROR', message: 'Unauthorized' },
        { status: 401 }
      );
    }
    return NextResponse.json(
      { status: 'ERROR', message: 'Internal server error' },
      { status: 500 }
    );
  }
}
