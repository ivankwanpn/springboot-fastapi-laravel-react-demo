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

    return NextResponse.json(
      {
        id: Number(wallet.id),
        userId: Number(wallet.userId),
        currency: wallet.currency,
        balance: Number(wallet.balance),
        version: wallet.version,
        updatedAt: wallet.updatedAt,
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
