import api from './api';
import type { Wallet } from '../types';

export function getWallet(): Promise<Wallet> {
  return api.get('/wallets').then((res) => res.data);
}
