export interface User {
  id: number;
  username: string;
  role: string;
  createdAt: string;
}

export interface Wallet {
  id: number;
  userId: number;
  currency: string;
  balance: number;
  version: number;
  updatedAt: string;
}

export interface Transaction {
  id: number;
  fromWalletId: number | null;
  toWalletId: number | null;
  amount: string;
  txType: string;
  status: string;
  createdAt: string;
}

export interface ApiResponse {
  status: string;
  message: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface UserCreateRequest {
  username: string;
  password: string;
  role: string;
}

export interface TransferRequest {
  toUsername: string;
  amount: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  page: number;
  size: number;
  total: number;
}

export interface UserDetail extends User {
  wallet: Wallet | null;
  recentTransactions: Transaction[];
}

export interface AdminTransaction extends Transaction {
  fromUsername: string | null;
  toUsername: string | null;
}

export interface TransactionStats {
  totalTransactions: number;
  totalAmount: string;
  dailyVolume: DailyVolume[];
}

export interface DailyVolume {
  date: string;
  count: number;
  amount: string;
}
