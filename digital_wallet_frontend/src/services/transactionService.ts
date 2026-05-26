import api from './api';
import type { Transaction, TransferRequest } from '../types';

export function transfer(data: TransferRequest): Promise<void> {
  return api.post('/transactions/transfer', data).then((res) => res.data);
}

export function getTransactionHistory(): Promise<Transaction[]> {
  return api.get('/transactions').then((res) => res.data);
}
