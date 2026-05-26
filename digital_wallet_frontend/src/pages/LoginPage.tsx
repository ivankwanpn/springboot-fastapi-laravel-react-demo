import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { login as loginService } from '../services/authService';
import { useForm } from '../hooks/useForm';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import type { AxiosError } from 'axios';

interface LoginForm {
  username: string;
  password: string;
}

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const { values, errors, isSubmitting, serverError, handleChange, handleSubmit } =
    useForm<LoginForm>({
      initialState: { username: '', password: '' },
      validate: (v) => {
        const errs: Partial<Record<keyof LoginForm, string>> = {};
        if (!v.username.trim()) errs.username = 'Username is required';
        if (!v.password) errs.password = 'Password is required';
        return errs;
      },
      onSubmit: async (v) => {
        try {
          const res = await loginService({ username: v.username.trim(), password: v.password });
          login(res.token, res.user);
          navigate('/dashboard', { replace: true });
        } catch (err) {
          const axiosErr = err as AxiosError<{ message?: string }>;
          throw new Error(
            axiosErr.response?.data?.message || 'Invalid username or password',
          );
        }
      },
    });

  return (
    <Card>
      <h2 className="text-lg font-semibold text-white mb-5">Sign in</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        {serverError && (
          <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
            {serverError}
          </div>
        )}
        <Input
          label="Username"
          name="username"
          value={values.username}
          onChange={handleChange}
          error={errors.username}
          placeholder="Enter your username"
          autoComplete="username"
        />
        <Input
          label="Password"
          name="password"
          type="password"
          value={values.password}
          onChange={handleChange}
          error={errors.password}
          placeholder="Enter your password"
          autoComplete="current-password"
        />
        <Button type="submit" isLoading={isSubmitting} className="w-full">
          Sign in
        </Button>
      </form>
      <p className="mt-5 text-center text-sm text-navy-300">
        Don't have an account?{' '}
        <Link to="/register" className="text-emerald-400 hover:text-emerald-300 font-medium transition-colors">
          Create one
        </Link>
      </p>
    </Card>
  );
}
