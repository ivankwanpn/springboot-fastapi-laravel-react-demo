'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import Spinner from '@/components/ui/Spinner';

interface UserRecord {
  id: number;
  username: string;
  role: string;
  createdAt: Date;
}

interface UserDetail {
  id: number;
  username: string;
  role: string;
  createdAt: Date;
  wallet: {
    id: number;
    currency: string;
    balance: number;
    version: number;
  } | null;
  recentTransactions: {
    id: number;
    amount: number;
    txType: string;
    status: string;
    createdAt: string;
    fromUsername: string | null;
    toUsername: string | null;
  }[];
}

interface UserTableProps {
  users: UserRecord[];
  search: string;
  page: number;
  totalPages: number;
  total: number;
}

function getCookie(name: string): string | undefined {
  const value = `; ${typeof document !== 'undefined' ? document.cookie : ''}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift();
}

function roleBadge(role: string) {
  switch (role) {
    case 'ROLE_ADMIN':
      return <Badge variant="warning">Admin</Badge>;
    case 'ROLE_USER':
      return <Badge variant="success">User</Badge>;
    case 'ROLE_DISABLED':
      return <Badge variant="danger">Disabled</Badge>;
    default:
      return <Badge variant="info">{role}</Badge>;
  }
}

export default function UserTable({
  users,
  search: initialSearch,
  page,
  totalPages,
  total,
}: UserTableProps) {
  const router = useRouter();
  const [searchInput, setSearchInput] = useState(initialSearch);
  const [loadingId, setLoadingId] = useState<number | null>(null);
  const [userDetail, setUserDetail] = useState<UserDetail | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionError, setActionError] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchInput.trim()) params.set('search', searchInput.trim());
    params.set('page', '1');
    router.push(`/admin/users?${params.toString()}`);
  };

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams();
    if (searchInput.trim()) params.set('search', searchInput.trim());
    params.set('page', String(newPage));
    router.push(`/admin/users?${params.toString()}`);
  };

  const handleToggleStatus = async (user: UserRecord) => {
    setLoadingId(user.id);
    setActionError('');

    const token = getCookie('token');
    const isDisabled = user.role === 'ROLE_DISABLED';
    const endpoint = isDisabled
      ? `/api/admin/users/${user.id}/enable`
      : `/api/admin/users/${user.id}/disable`;

    try {
      const res = await fetch(endpoint, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!res.ok) {
        const data = await res.json();
        setActionError(data.message || 'Action failed');
        return;
      }

      router.refresh();
    } catch {
      setActionError('Network error. Please try again.');
    } finally {
      setLoadingId(null);
    }
  };

  const handleViewDetail = async (userId: number) => {
    setDetailLoading(true);
    setActionError('');

    const token = getCookie('token');

    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!res.ok) {
        setActionError('Failed to load user details');
        return;
      }

      const data = await res.json();
      setUserDetail(data);
      setIsDetailOpen(true);
    } catch {
      setActionError('Network error. Please try again.');
    } finally {
      setDetailLoading(false);
    }
  };

  return (
    <>
      {/* Action error */}
      {actionError && (
        <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {actionError}
        </div>
      )}

      {/* Search */}
      <form onSubmit={handleSearch} className="mb-6 flex gap-3">
        <div className="flex-1">
          <Input
            type="text"
            placeholder="Search by username..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>
        <Button type="submit" variant="secondary">
          Search
        </Button>
        {searchInput && (
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setSearchInput('');
              router.push('/admin/users');
            }}
          >
            Clear
          </Button>
        )}
      </form>

      {/* Table */}
      <Card padding="none">
        <div className="divide-y divide-navy-600">
          {/* Header */}
          <div className="grid grid-cols-12 gap-4 px-5 py-3 text-xs font-medium uppercase tracking-wider text-navy-400">
            <div className="col-span-1">ID</div>
            <div className="col-span-3">Username</div>
            <div className="col-span-2">Role</div>
            <div className="col-span-2">Created</div>
            <div className="col-span-4 text-right">Actions</div>
          </div>

          {users.map((user) => (
            <div
              key={user.id}
              className="grid grid-cols-12 gap-4 px-5 py-4 items-center"
            >
              <div className="col-span-1 text-sm text-navy-300">
                {user.id}
              </div>
              <div className="col-span-3 text-sm font-medium text-white">
                {user.username}
              </div>
              <div className="col-span-2">{roleBadge(user.role)}</div>
              <div className="col-span-2 text-sm text-navy-300">
                {new Date(user.createdAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </div>
              <div className="col-span-4 flex items-center justify-end gap-2">
                <Button
                  variant="ghost"
                  onClick={() => handleViewDetail(user.id)}
                  className="text-xs py-1.5 px-3"
                >
                  Details
                </Button>
                <Button
                  variant={user.role === 'ROLE_DISABLED' ? 'secondary' : 'danger'}
                  onClick={() => handleToggleStatus(user)}
                  isLoading={loadingId === user.id}
                  className="text-xs py-1.5 px-3"
                >
                  {user.role === 'ROLE_DISABLED' ? 'Enable' : 'Disable'}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between">
          <p className="text-sm text-navy-400">
            Showing page {page} of {totalPages} ({total} total users)
          </p>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={() => handlePageChange(page - 1)}
              disabled={page <= 1}
            >
              Previous
            </Button>
            <Button
              variant="secondary"
              onClick={() => handlePageChange(page + 1)}
              disabled={page >= totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* User Detail Modal */}
      <Modal
        isOpen={isDetailOpen}
        onClose={() => {
          setIsDetailOpen(false);
          setUserDetail(null);
        }}
        title={`User: ${userDetail?.username || ''}`}
      >
        {detailLoading ? (
          <Spinner />
        ) : userDetail ? (
          <div className="space-y-4">
            {/* User Info */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-navy-400">ID</p>
                <p className="text-sm font-medium text-white">{userDetail.id}</p>
              </div>
              <div>
                <p className="text-xs text-navy-400">Role</p>
                <div className="mt-0.5">{roleBadge(userDetail.role)}</div>
              </div>
              <div>
                <p className="text-xs text-navy-400">Username</p>
                <p className="text-sm font-medium text-white">
                  {userDetail.username}
                </p>
              </div>
              <div>
                <p className="text-xs text-navy-400">Joined</p>
                <p className="text-sm font-medium text-white">
                  {new Date(userDetail.createdAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </p>
              </div>
            </div>

            {/* Wallet */}
            {userDetail.wallet && (
              <div className="border-t border-navy-600 pt-4">
                <p className="text-xs font-medium text-navy-400 mb-2">
                  Wallet
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-navy-400">Balance</p>
                    <p className="text-sm font-semibold text-white">
                      {userDetail.wallet.balance.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 4,
                      })}{' '}
                      <span className="text-xs font-normal text-navy-400">
                        {userDetail.wallet.currency}
                      </span>
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-navy-400">Version</p>
                    <p className="text-sm font-medium text-white">
                      {userDetail.wallet.version}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Recent Transactions */}
            {userDetail.recentTransactions.length > 0 && (
              <div className="border-t border-navy-600 pt-4">
                <p className="text-xs font-medium text-navy-400 mb-2">
                  Recent Transactions
                </p>
                <div className="space-y-2">
                  {userDetail.recentTransactions.map((tx) => (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between rounded-lg bg-navy-700 px-3 py-2"
                    >
                      <div>
                        <p className="text-xs font-medium text-white">
                          {tx.txType}
                        </p>
                        <p className="text-xs text-navy-400">
                          {tx.fromUsername} → {tx.toUsername}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-semibold text-white">
                          {tx.amount.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 4,
                          })}
                        </p>
                        <Badge
                          variant={
                            tx.status === 'SUCCESS' ? 'success' : 'danger'
                          }
                        >
                          {tx.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : null}
      </Modal>
    </>
  );
}
