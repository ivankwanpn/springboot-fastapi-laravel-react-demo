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
    const { sub: userId } = await verifyToken(token);

    const wallet = await prisma.wallet.findUnique({
      where: { userId: BigInt(userId) },
    });

    if (!wallet) {
      return NextResponse.json(
        { status: 'ERROR', message: 'Wallet not found' },
        { status: 404 }
      );
    }

    const transactions = await prisma.transaction.findMany({
      where: {
        OR: [
          { fromWalletId: wallet.id },
          { toWalletId: wallet.id },
        ],
      },
      orderBy: { createdAt: 'desc' },
      include: {
        fromWallet: {
          include: { user: true },
        },
        toWallet: {
          include: { user: true },
        },
      },
    });

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

    return NextResponse.json(data, { status: 200 });
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
