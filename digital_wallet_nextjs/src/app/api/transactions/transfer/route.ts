import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
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

    const { toUsername, amount } = await request.json();

    if (!amount || Number(amount) <= 0) {
      return NextResponse.json(
        { status: 'ERROR', message: 'Amount must be greater than 0' },
        { status: 400 }
      );
    }

    const transferAmount = Number(amount);

    try {
      const result = await prisma.$transaction(async (tx) => {
        const fromWallet = await tx.wallet.findUnique({
          where: { userId: BigInt(userId) },
        });

        if (!fromWallet) {
          throw { status: 404, message: 'Wallet not found' };
        }

        const recipientUser = await tx.user.findUnique({
          where: { username: toUsername },
          include: { wallet: true },
        });

        if (!recipientUser) {
          throw { status: 400, message: 'Recipient not found' };
        }

        if (Number(fromWallet.userId) === Number(recipientUser.id)) {
          throw { status: 400, message: 'Cannot transfer to yourself' };
        }

        if (Number(fromWallet.balance) < transferAmount) {
          throw { status: 400, message: 'Insufficient balance' };
        }

        // Optimistic lock: decrement sender balance
        const updateResult = await tx.wallet.updateMany({
          where: {
            userId: fromWallet.userId,
            version: fromWallet.version,
          },
          data: {
            balance: { decrement: transferAmount },
            version: { increment: 1 },
          },
        });

        if (updateResult.count === 0) {
          throw { status: 409, message: 'Concurrent modification detected. Please try again.' };
        }

        // Credit recipient
        await tx.wallet.update({
          where: { userId: recipientUser.id },
          data: {
            balance: { increment: transferAmount },
            version: { increment: 1 },
          },
        });

        // Create transaction record
        const transaction = await tx.transaction.create({
          data: {
            fromWalletId: fromWallet.id,
            toWalletId: recipientUser.wallet!.id,
            amount: transferAmount,
            txType: 'TRANSFER',
            status: 'SUCCESS',
          },
        });

        return transaction;
      });

      return NextResponse.json(
        {
          status: 'SUCCESS',
          message: 'Transfer completed successfully',
          transactionId: Number(result.id),
        },
        { status: 200 }
      );
    } catch (error: any) {
      if (error.status) {
        return NextResponse.json(
          { status: 'ERROR', message: error.message },
          { status: error.status }
        );
      }
      throw error;
    }
  } catch (error: any) {
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
