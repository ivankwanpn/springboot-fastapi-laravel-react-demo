import { useState, useEffect, useCallback } from 'react';
import Card from '../../components/ui/Card';
import Spinner from '../../components/ui/Spinner';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import EmptyState from '../../components/ui/EmptyState';
import { listUsers, getUserDetail, disableUser, enableUser } from '../../services/adminService';
import type { User, UserDetail } from '../../types';

const PAGE_SIZE = 20;

function roleBadgeVariant(role: string): 'success' | 'info' | 'danger' | 'warning' {
  switch (role) {
    case 'ROLE_ADMIN': return 'info';
    case 'ROLE_USER': return 'success';
    case 'ROLE_DISABLED': return 'danger';
    default: return 'warning';
  }
}

function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(new Date(dateStr));
}

export default function UserManagementPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserDetail | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchUsers = useCallback(() => {
    setLoading(true);
    setError(null);
    listUsers(search, page, PAGE_SIZE)
      .then((res) => {
        setUsers(res.data);
        setTotal(res.total);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load users'))
      .finally(() => setLoading(false));
  }, [search, page, refreshKey]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleSearch = () => {
    setSearch(searchInput);
    setPage(1);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };

  const handleViewDetail = (userId: number) => {
    setDetailLoading(true);
    setModalOpen(true);
    getUserDetail(userId)
      .then(setSelectedUser)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load user detail'))
      .finally(() => setDetailLoading(false));
  };

  const handleDisable = async (userId: number) => {
    setActionLoading(userId);
    try {
      await disableUser(userId);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to disable user');
    } finally {
      setActionLoading(null);
    }
  };

  const handleEnable = async (userId: number) => {
    setActionLoading(userId);
    try {
      await enableUser(userId);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to enable user');
    } finally {
      setActionLoading(null);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <h1 className="text-2xl font-semibold text-white mb-1">User Management</h1>
      <p className="text-sm text-navy-300 mb-6">Manage user accounts and access</p>

      <div className="flex gap-3 mb-6">
        <div className="flex-1">
          <Input
            placeholder="Search by username..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={handleSearchKeyDown}
          />
        </div>
        <Button variant="secondary" onClick={handleSearch}>Search</Button>
      </div>

      {loading && <Spinner className="h-10 w-10" />}

      {error && (
        <Card>
          <div className="text-center py-12">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        </Card>
      )}

      {!loading && !error && users.length === 0 && (
        <Card>
          <EmptyState icon="empty" title="No users found" description="No users match your search." />
        </Card>
      )}

      {!loading && users.length > 0 && (
        <>
          <Card padding="none">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-navy-600">
                    <th className="px-5 py-3 text-left text-xs font-medium text-navy-300 uppercase tracking-wider">ID</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-navy-300 uppercase tracking-wider">Username</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-navy-300 uppercase tracking-wider">Role</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-navy-300 uppercase tracking-wider">Created</th>
                    <th className="px-5 py-3 text-right text-xs font-medium text-navy-300 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-b border-navy-600 last:border-0 hover:bg-navy-700/50 transition-colors">
                      <td className="px-5 py-4"><span className="text-xs text-navy-400 font-mono">#{u.id}</span></td>
                      <td className="px-5 py-4"><span className="text-sm text-white font-medium">{u.username}</span></td>
                      <td className="px-5 py-4"><Badge variant={roleBadgeVariant(u.role)}>{u.role}</Badge></td>
                      <td className="px-5 py-4"><span className="text-sm text-navy-200">{formatDate(u.createdAt)}</span></td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="ghost" onClick={() => handleViewDetail(u.id)}>View</Button>
                          {u.role === 'ROLE_DISABLED' ? (
                            <Button variant="secondary" isLoading={actionLoading === u.id} onClick={() => handleEnable(u.id)}>Enable</Button>
                          ) : (
                            <Button variant="danger" isLoading={actionLoading === u.id} onClick={() => handleDisable(u.id)}>Disable</Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="border-t border-navy-600 px-5 py-3 flex items-center justify-between">
              <p className="text-xs text-navy-300">Page {page} of {totalPages} ({total} users)</p>
              <div className="flex gap-2">
                <Button variant="ghost" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
                <Button variant="ghost" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
              </div>
            </div>
          </Card>
        </>
      )}

      <Modal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setSelectedUser(null); }}
        title={selectedUser ? `User: ${selectedUser.username}` : 'User Detail'}
        confirmLabel="Close"
      >
        {detailLoading ? (
          <div className="flex justify-center py-8"><Spinner className="h-8 w-8" /></div>
        ) : selectedUser ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div><p className="text-xs text-navy-400">ID</p><p className="text-sm text-white">#{selectedUser.id}</p></div>
              <div><p className="text-xs text-navy-400">Role</p><Badge variant={roleBadgeVariant(selectedUser.role)}>{selectedUser.role}</Badge></div>
              <div><p className="text-xs text-navy-400">Created</p><p className="text-sm text-white">{formatDate(selectedUser.createdAt)}</p></div>
            </div>

            {selectedUser.wallet ? (
              <>
                <div className="border-t border-navy-600 pt-4">
                  <p className="text-xs font-medium text-navy-300 uppercase tracking-wide mb-2">Wallet</p>
                  <div className="grid grid-cols-3 gap-3">
                    <div><p className="text-xs text-navy-400">Balance</p><p className="text-sm font-mono text-emerald-400">{parseFloat(selectedUser.wallet.balance as unknown as string).toFixed(4)} USDT</p></div>
                    <div><p className="text-xs text-navy-400">Currency</p><p className="text-sm text-white">{selectedUser.wallet.currency}</p></div>
                    <div><p className="text-xs text-navy-400">Version</p><p className="text-sm text-white font-mono">{selectedUser.wallet.version}</p></div>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-sm text-navy-400 italic">No wallet found</p>
            )}

            {selectedUser.recentTransactions.length > 0 && (
              <div className="border-t border-navy-600 pt-4">
                <p className="text-xs font-medium text-navy-300 uppercase tracking-wide mb-2">Recent Transactions</p>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-navy-600">
                      <th className="py-1.5 text-left text-navy-400">ID</th>
                      <th className="py-1.5 text-left text-navy-400">Type</th>
                      <th className="py-1.5 text-right text-navy-400">Amount</th>
                      <th className="py-1.5 text-right text-navy-400">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedUser.recentTransactions.map((tx) => (
                      <tr key={tx.id} className="border-b border-navy-700 last:border-0">
                        <td className="py-1.5 text-navy-400 font-mono">#{tx.id}</td>
                        <td className="py-1.5 text-white">{tx.txType}</td>
                        <td className="py-1.5 text-right font-mono text-white">{parseFloat(tx.amount).toFixed(4)}</td>
                        <td className="py-1.5 text-right"><Badge variant={tx.status === 'SUCCESS' ? 'success' : 'warning'}>{tx.status}</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
