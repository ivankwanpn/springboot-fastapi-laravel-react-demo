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
    const username = searchParams.get('username') || '';
    const fromDate = searchParams.get('from') || '';
    const toDate = searchParams.get('to') || '';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const size = Math.min(100, Math.max(1, parseInt(searchParams.get('size') || '20')));
    const skip = (page - 1) * size;

    const where: any = {};

    if (username) {
      where.OR = [
        { fromWallet: { user: { username: { contains: username } } } },
        { toWallet: { user: { username: { contains: username } } } },
      ];
    }

    if (fromDate || toDate) {
      where.createdAt = {};
      if (fromDate) where.createdAt.gte = new Date(fromDate);
      if (toDate) where.createdAt.lte = new Date(toDate);
    }

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        include: {
          fromWallet: { include: { user: true } },
          toWallet: { include: { user: true } },
        },
        skip,
        take: size,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.transaction.count({ where }),
    ]);

    const data = transactions.map((tx) => ({
      id: Number(tx.id),
      fromWalletId: tx.fromWalletId ? Number(tx.fromWalletId) : null,
      toWalletId: tx.toWalletId ? Number(tx.toWalletId) : null,
      amount: Number(tx.amount),
      txType: tx.txType,
      status: tx.status,
      createdAt: tx.createdAt,
      fromUsername: tx.fromWallet?.user?.username || null,
      toUsername: tx.toWallet?.user?.username || null,
    }));

    return NextResponse.json(
      { data, page, size, total },
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
