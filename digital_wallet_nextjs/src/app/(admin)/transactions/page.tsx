import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifyToken } from '@/lib/auth';
import { prisma } from '@/lib/db';
import TransactionStats from './TransactionStats';
import TransactionTable from './TransactionTable';

interface SearchParams {
  username?: string;
  from?: string;
  to?: string;
  page?: string;
}

export default async function AdminTransactionsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const cookieStore = await cookies();
  const tokenCookie = cookieStore.get('token');

  if (!tokenCookie?.value) {
    redirect('/login');
  }

  const payload = await verifyToken(tokenCookie.value);

  if (payload.role !== 'ROLE_ADMIN') {
    redirect('/dashboard');
  }

  const params = await searchParams;
  const username = params.username || '';
  const fromDate = params.from || '';
  const toDate = params.to || '';
  const page = Math.max(1, parseInt(params.page || '1'));
  const size = 20;
  const skip = (page - 1) * size;

  // Build where clause
  const where: Record<string, unknown> = {};

  if (username) {
    where.OR = [
      { fromWallet: { user: { username: { contains: username } } } },
      { toWallet: { user: { username: { contains: username } } } },
    ];
  }

  if (fromDate || toDate) {
    const createdAt: Record<string, Date> = {};
    if (fromDate) createdAt.gte = new Date(fromDate);
    if (toDate) createdAt.lte = new Date(toDate);
    where.createdAt = createdAt;
  }

  // Fetch transactions and count in parallel
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

  // Fetch aggregate stats
  const [totalTransactions, amountResult] = await Promise.all([
    prisma.transaction.count({ where: {} }),
    prisma.transaction.aggregate({
      where: {},
      _sum: { amount: true },
      _count: { id: true },
    }),
  ]);

  const totalAmount = amountResult._sum.amount
    ? Number(amountResult._sum.amount)
    : 0;

  // Fetch daily volume via groupBy
  const dailyVolumeRaw = await prisma.transaction.groupBy({
    by: ['createdAt'],
    where: {},
    _count: { id: true },
    _sum: { amount: true },
    orderBy: { createdAt: 'asc' },
  });

  // Group by date
  const dailyMap = new Map<string, { count: number; amount: number }>();
  for (const row of dailyVolumeRaw as Array<{
    createdAt: Date;
    _count: { id: number };
    _sum: { amount: number | null };
  }>) {
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

  const count = amountResult._count.id;
  const averageAmount = count > 0 ? totalAmount / count : 0;
  const totalPages = Math.ceil(total / size);

  return (
    <div className="px-6 py-8 max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Transaction Monitoring</h1>
        <p className="mt-1 text-sm text-navy-400">
          Monitor all platform transactions and activity
        </p>
      </div>

      {/* Stats */}
      <TransactionStats
        totalTransactions={totalTransactions}
        totalAmount={totalAmount}
        averageAmount={averageAmount}
        dailyVolume={dailyVolume}
      />

      {/* Transaction Table */}
      <TransactionTable
        transactions={txData}
        username={username}
        fromDate={fromDate}
        toDate={toDate}
        page={page}
        totalPages={totalPages}
        total={total}
      />
    </div>
  );
}
