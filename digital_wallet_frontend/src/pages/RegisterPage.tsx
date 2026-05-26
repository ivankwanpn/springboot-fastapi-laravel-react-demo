import { Link, useNavigate } from 'react-router-dom';
import { register as registerService } from '../services/authService';
import { useForm } from '../hooks/useForm';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import type { AxiosError } from 'axios';

interface RegisterForm {
  username: string;
  password: string;
  confirmPassword: string;
}

export default function RegisterPage() {
  const navigate = useNavigate();

  const { values, errors, isSubmitting, serverError, handleChange, handleSubmit } =
    useForm<RegisterForm>({
      initialState: { username: '', password: '', confirmPassword: '' },
      validate: (v) => {
        const errs: Partial<Record<keyof RegisterForm, string>> = {};
        if (!v.username.trim()) errs.username = 'Username is required';
        else if (v.username.trim().length < 3) errs.username = 'Username must be at least 3 characters';
        if (!v.password) errs.password = 'Password is required';
        else if (v.password.length < 6) errs.password = 'Password must be at least 6 characters';
        if (!v.confirmPassword) errs.confirmPassword = 'Please confirm your password';
        else if (v.password !== v.confirmPassword) errs.confirmPassword = 'Passwords do not match';
        return errs;
      },
      onSubmit: async (v) => {
        try {
          await registerService({
            username: v.username.trim(),
            password: v.password,
            role: 'ROLE_USER',
          });
          navigate('/login', { replace: true });
        } catch (err) {
          const axiosErr = err as AxiosError<{ message?: string }>;
          throw new Error(
            axiosErr.response?.data?.message || 'Registration failed',
          );
        }
      },
    });

  return (
    <Card>
      <h2 className="text-lg font-semibold text-white mb-5">Create account</h2>
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
          placeholder="Choose a username"
          autoComplete="username"
        />
        <Input
          label="Password"
          name="password"
          type="password"
          value={values.password}
          onChange={handleChange}
          error={errors.password}
          placeholder="Create a password"
          autoComplete="new-password"
        />
        <Input
          label="Confirm Password"
          name="confirmPassword"
          type="password"
          value={values.confirmPassword}
          onChange={handleChange}
          error={errors.confirmPassword}
          placeholder="Confirm your password"
          autoComplete="new-password"
        />
        <Button type="submit" isLoading={isSubmitting} className="w-full">
          Create account
        </Button>
      </form>
      <p className="mt-5 text-center text-sm text-navy-300">
        Already have an account?{' '}
        <Link to="/login" className="text-emerald-400 hover:text-emerald-300 font-medium transition-colors">
          Sign in
        </Link>
      </p>
    </Card>
  );
}
