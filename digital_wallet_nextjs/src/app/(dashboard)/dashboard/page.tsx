import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifyToken } from '@/lib/auth';
import { prisma } from '@/lib/db';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import EmptyState from '@/components/ui/EmptyState';
import Link from 'next/link';

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const tokenCookie = cookieStore.get('token');

  if (!tokenCookie?.value) {
    redirect('/login');
  }

  const payload = await verifyToken(tokenCookie.value);

  // Fetch wallet and recent transactions directly via Prisma (server-side)
  const wallet = await prisma.wallet.findUnique({
    where: { userId: BigInt(payload.sub) },
    include: {
      user: true,
    },
  });

  if (!wallet) {
    redirect('/login');
  }

  const balance = Number(wallet.balance);
  const currency = wallet.currency;

  // Fetch recent transactions (last 5)
  const recentTransactions = await prisma.transaction.findMany({
    where: {
      OR: [
        { fromWalletId: wallet.id },
        { toWalletId: wallet.id },
      ],
    },
    orderBy: { createdAt: 'desc' },
    take: 5,
    include: {
      fromWallet: { include: { user: true } },
      toWallet: { include: { user: true } },
    },
  });

  return (
    <div className="px-6 py-8 max-w-5xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="mt-1 text-sm text-navy-400">
          Welcome back, {payload.username}
        </p>
      </div>

      {/* Balance Card */}
      <Card padding="lg" className="mb-8 bg-gradient-to-br from-navy-750 to-navy-700 border-navy-500">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-navy-400">Total Balance</p>
            <p className="mt-2 text-4xl font-bold text-white tracking-tight">
              {balance.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 4,
              })}{' '}
              <span className="text-lg font-medium text-navy-400">{currency}</span>
            </p>
            <p className="mt-1 text-xs text-navy-400">
              Wallet ID: {Number(wallet.id)}
            </p>
          </div>
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/15">
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-emerald-400"
            >
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <path d="M12 9v6M9 12h6" />
            </svg>
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <Link
            href="/dashboard/transfer"
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-emerald-500/20 transition-all hover:bg-emerald-400"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M17 1l4 4-4 4" />
              <path d="M3 11V9a4 4 0 014-4h14" />
            </svg>
            Send Transfer
          </Link>
          <Link
            href="/dashboard/history"
            className="inline-flex items-center gap-2 rounded-xl bg-navy-600 px-5 py-2.5 text-sm font-medium text-white border border-navy-400 transition-all hover:bg-navy-500"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 20a8 8 0 100-16 8 8 0 000 16z" />
              <path d="M12 6v6l4 2" />
            </svg>
            View History
          </Link>
        </div>
      </Card>

      {/* Recent Transactions */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-white">Recent Transactions</h2>
        <Link
          href="/dashboard/history"
          className="text-sm font-medium text-emerald-400 hover:text-emerald-300 transition-colors"
        >
          View All
        </Link>
      </div>

      <Card padding="none">
        {recentTransactions.length === 0 ? (
          <EmptyState
            title="No transactions yet"
            description="Your transaction history will appear here once you make your first transfer."
          />
        ) : (
          <div className="divide-y divide-navy-600">
            {recentTransactions.map((tx) => {
              const isOutgoing = tx.fromWalletId === wallet.id;
              const counterparty = isOutgoing
                ? tx.toWallet?.user?.username || 'Unknown'
                : tx.fromWallet?.user?.username || 'Unknown';

              return (
                <div
                  key={Number(tx.id)}
                  className="flex items-center justify-between px-5 py-4"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                        isOutgoing
                          ? 'bg-red-500/10 text-red-400'
                          : 'bg-emerald-500/10 text-emerald-400'
                      }`}
                    >
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        {isOutgoing ? (
                          <path d="M17 1l4 4-4 4" />
                        ) : (
                          <path d="M7 23l-4-4 4-4" />
                        )}
                        <path d={isOutgoing ? "M3 11V9a4 4 0 014-4h14" : "M21 13v2a4 4 0 01-4 4H3"} />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">
                        {isOutgoing ? 'Sent to' : 'Received from'}{' '}
                        {counterparty}
                      </p>
                      <p className="text-xs text-navy-400">
                        {new Date(tx.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}{' '}
                        at{' '}
                        {new Date(tx.createdAt).toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p
                      className={`text-sm font-semibold ${
                        isOutgoing ? 'text-red-400' : 'text-emerald-400'
                      }`}
                    >
                      {isOutgoing ? '-' : '+'}
                      {Number(tx.amount).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 4,
                      })}{' '}
                      {currency}
                    </p>
                    <Badge variant={tx.status === 'SUCCESS' ? 'success' : 'danger'}>
                      {tx.status}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
