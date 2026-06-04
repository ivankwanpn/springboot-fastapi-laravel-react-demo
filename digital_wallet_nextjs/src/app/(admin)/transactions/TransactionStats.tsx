'use client';

import Card from '@/components/ui/Card';

interface DailyVolume {
  date: string;
  count: number;
  amount: number;
}

interface TransactionStatsProps {
  totalTransactions: number;
  totalAmount: number;
  averageAmount: number;
  dailyVolume: DailyVolume[];
}

export default function TransactionStats({
  totalTransactions,
  totalAmount,
  averageAmount,
  dailyVolume,
}: TransactionStatsProps) {
  // Bar chart: last 14 days
  const chartData = dailyVolume.slice(-14);
  const maxCount = Math.max(...chartData.map((d) => d.count), 1);
  const maxAmount = Math.max(...chartData.map((d) => d.amount), 1);

  return (
    <>
      {/* Stats Cards */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-xs font-medium text-navy-400 uppercase tracking-wide">
            Total Transactions
          </p>
          <p className="mt-2 text-2xl font-bold text-white">
            {totalTransactions.toLocaleString()}
          </p>
        </Card>
        <Card>
          <p className="text-xs font-medium text-navy-400 uppercase tracking-wide">
            Total Volume
          </p>
          <p className="mt-2 text-2xl font-bold text-emerald-400">
            {totalAmount.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}{' '}
            <span className="text-sm font-medium">USDT</span>
          </p>
        </Card>
        <Card>
          <p className="text-xs font-medium text-navy-400 uppercase tracking-wide">
            Average Transaction
          </p>
          <p className="mt-2 text-2xl font-bold text-white">
            {averageAmount.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}{' '}
            <span className="text-sm font-medium text-navy-400">USDT</span>
          </p>
        </Card>
      </div>

      {/* Bar Chart */}
      {dailyVolume.length > 0 && (
        <Card className="mb-8">
          <h3 className="mb-4 text-sm font-semibold text-white">
            Daily Transaction Volume
          </h3>

          {/* Count bars */}
          <div className="mb-6">
            <p className="mb-2 text-xs font-medium text-navy-400">
              Transaction Count (last {Math.min(dailyVolume.length, 14)} days)
            </p>
            <div className="flex items-end gap-1" style={{ height: '120px' }}>
              {chartData.map((d) => {
                const height = (d.count / maxCount) * 100;
                return (
                  <div
                    key={d.date}
                    className="flex-1 flex flex-col items-center justify-end"
                    title={`${d.date}: ${d.count} transactions`}
                  >
                    <div
                      className="w-full rounded-t bg-emerald-500/60 hover:bg-emerald-400/60 transition-colors"
                      style={{ height: `${Math.max(height, 2)}%` }}
                    />
                    <span className="mt-1 text-[10px] text-navy-400 truncate w-full text-center">
                      {d.date.slice(5)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Amount bars */}
          <div>
            <p className="mb-2 text-xs font-medium text-navy-400">
              Volume in USDT (last {Math.min(dailyVolume.length, 14)} days)
            </p>
            <div className="flex items-end gap-1" style={{ height: '120px' }}>
              {chartData.map((d) => {
                const height = (d.amount / maxAmount) * 100;
                return (
                  <div
                    key={d.date}
                    className="flex-1 flex flex-col items-center justify-end"
                    title={`${d.date}: ${d.amount.toFixed(2)} USDT`}
                  >
                    <div
                      className="w-full rounded-t bg-blue-500/60 hover:bg-blue-400/60 transition-colors"
                      style={{ height: `${Math.max(height, 2)}%` }}
                    />
                    <span className="mt-1 text-[10px] text-navy-400 truncate w-full text-center">
                      {d.date.slice(5)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>
      )}
    </>
  );
}
