import { Outlet } from 'react-router-dom';

export default function AuthLayout() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-navy-900 px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/20">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400">
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <path d="M12 9v6M9 12h6" />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold text-white">Digital Wallet</h1>
          <p className="mt-1 text-sm text-navy-300">Secure USDT wallet management</p>
        </div>
        <Outlet />
      </div>
    </div>
  );
}
