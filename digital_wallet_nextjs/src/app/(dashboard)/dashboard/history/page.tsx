import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifyToken } from '@/lib/auth';
import { prisma } from '@/lib/db';
import TransactionList from './TransactionList';

export default async function HistoryPage() {
  const cookieStore = await cookies();
  const tokenCookie = cookieStore.get('token');

  if (!tokenCookie?.value) {
    redirect('/login');
  }

  const payload = await verifyToken(tokenCookie.value);

  // Fetch wallet
  const wallet = await prisma.wallet.findUnique({
    where: { userId: BigInt(payload.sub) },
  });

  if (!wallet) {
    redirect('/login');
  }

  const walletId = wallet.id;
  const currency = wallet.currency;

  // Fetch all user's transactions
  const transactions = await prisma.transaction.findMany({
    where: {
      OR: [
        { fromWalletId: walletId },
        { toWalletId: walletId },
      ],
    },
    orderBy: { createdAt: 'desc' },
    include: {
      fromWallet: { include: { user: true } },
      toWallet: { include: { user: true } },
    },
  });

  const txData = transactions.map((tx) => ({
    id: Number(tx.id),
    fromWalletId: tx.fromWalletId ? Number(tx.fromWalletId) : null,
    toWalletId: tx.toWalletId ? Number(tx.toWalletId) : null,
    amount: Number(tx.amount),
    txType: tx.txType,
    status: tx.status,
    createdAt: tx.createdAt.toISOString(),
    fromUsername: tx.fromWallet?.user?.username || null,
    toUsername: tx.toWallet?.user?.username || null,
  }));

  return (
    <div className="px-6 py-8 max-w-5xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Transaction History</h1>
        <p className="mt-1 text-sm text-navy-400">
          View all your past transfers
        </p>
      </div>

      <TransactionList
        transactions={txData}
        walletId={Number(walletId)}
        currency={currency}
      />
    </div>
  );
}
