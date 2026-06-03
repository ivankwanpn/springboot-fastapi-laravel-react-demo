import api from './api';
import type { User, PaginatedResponse, UserDetail, AdminTransaction, TransactionStats } from '../types';

export function listUsers(search: string, page: number, size: number): Promise<PaginatedResponse<User>> {
  return api.get('/admin/users', { params: { search, page, size } }).then((res) => res.data);
}

export function getUserDetail(id: number): Promise<UserDetail> {
  return api.get(`/admin/users/${id}`).then((res) => res.data);
}

export function disableUser(id: number): Promise<{ status: string; message: string }> {
  return api.put(`/admin/users/${id}/disable`).then((res) => res.data);
}

export function enableUser(id: number): Promise<{ status: string; message: string }> {
  return api.put(`/admin/users/${id}/enable`).then((res) => res.data);
}

export function listTransactions(
  username: string,
  from: string,
  to: string,
  page: number,
  size: number
): Promise<PaginatedResponse<AdminTransaction>> {
  return api.get('/admin/transactions', { params: { username: username || undefined, from: from || undefined, to: to || undefined, page, size } }).then((res) => res.data);
}

export function getTransactionStats(from: string, to: string): Promise<TransactionStats> {
  return api.get('/admin/transactions/stats', { params: { from: from || undefined, to: to || undefined } }).then((res) => res.data);
}
