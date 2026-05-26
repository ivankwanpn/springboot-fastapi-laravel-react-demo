import api from './api';
import type { LoginRequest, LoginResponse, UserCreateRequest } from '../types';

export function login(data: LoginRequest): Promise<LoginResponse> {
  return api.post('/auth/login', data).then((res) => res.data);
}

export function register(data: UserCreateRequest): Promise<void> {
  return api.post('/auth/register', data).then((res) => res.data);
}
