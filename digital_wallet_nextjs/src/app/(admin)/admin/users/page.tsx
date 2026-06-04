import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifyToken } from '@/lib/auth';
import { prisma } from '@/lib/db';
import UserTable from './UserTable';

interface SearchParams {
  search?: string;
  page?: string;
}

export default async function AdminUsersPage({
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
  const search = params.search || '';
  const page = Math.max(1, parseInt(params.page || '1'));
  const size = 20;
  const skip = (page - 1) * size;

  const where = search
    ? { username: { contains: search } }
    : {};

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        username: true,
        role: true,
        createdAt: true,
      },
      skip,
      take: size,
      orderBy: { id: 'asc' },
    }),
    prisma.user.count({ where }),
  ]);

  const userData = users.map((user) => ({
    id: Number(user.id),
    username: user.username,
    role: user.role,
    createdAt: user.createdAt,
  }));

  const totalPages = Math.ceil(total / size);

  return (
    <div className="px-6 py-8 max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">User Management</h1>
        <p className="mt-1 text-sm text-navy-400">
          Manage user accounts, view details, and control access
        </p>
      </div>

      {/* Stats */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-navy-600 bg-navy-750 px-5 py-4">
          <p className="text-xs font-medium text-navy-400 uppercase tracking-wide">
            Total Users
          </p>
          <p className="mt-2 text-2xl font-bold text-white">{total}</p>
        </div>
        <div className="rounded-2xl border border-navy-600 bg-navy-750 px-5 py-4">
          <p className="text-xs font-medium text-navy-400 uppercase tracking-wide">
            Active Users
          </p>
          <p className="mt-2 text-2xl font-bold text-emerald-400">
            {userData.filter((u) => u.role === 'ROLE_USER' || u.role === 'ROLE_ADMIN').length}
          </p>
        </div>
        <div className="rounded-2xl border border-navy-600 bg-navy-750 px-5 py-4">
          <p className="text-xs font-medium text-navy-400 uppercase tracking-wide">
            Disabled
          </p>
          <p className="mt-2 text-2xl font-bold text-red-400">
            {userData.filter((u) => u.role === 'ROLE_DISABLED').length}
          </p>
        </div>
      </div>

      {/* User Table */}
      <UserTable
        users={userData}
        search={search}
        page={page}
        totalPages={totalPages}
        total={total}
      />
    </div>
  );
}
