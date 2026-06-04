import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    const userId = BigInt(id);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { wallet: true },
    });

    if (!user) {
      return NextResponse.json(
        { status: 'ERROR', message: 'User not found' },
        { status: 404 }
      );
    }

    let recentTransactions: any[] = [];
    if (user.wallet) {
      recentTransactions = await prisma.transaction.findMany({
        where: {
          OR: [
            { fromWalletId: user.wallet.id },
            { toWalletId: user.wallet.id },
          ],
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          fromWallet: { include: { user: true } },
          toWallet: { include: { user: true } },
        },
      });
    }

    const walletData = user.wallet
      ? {
          id: Number(user.wallet.id),
          userId: Number(user.wallet.userId),
          currency: user.wallet.currency,
          balance: Number(user.wallet.balance),
          version: user.wallet.version,
          updatedAt: user.wallet.updatedAt,
        }
      : null;

    const recentTxData = recentTransactions.map((tx) => ({
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
      {
        id: Number(user.id),
        username: user.username,
        role: user.role,
        createdAt: user.createdAt,
        wallet: walletData,
        recentTransactions: recentTxData,
      },
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
