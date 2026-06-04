import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifyToken } from '@/lib/auth';
import { prisma } from '@/lib/db';
import Sidebar from '@/components/layout/Sidebar';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const tokenCookie = cookieStore.get('token');

  if (!tokenCookie?.value) {
    redirect('/login');
  }

  let userData: { id: number; username: string; role: string };

  try {
    const payload = await verifyToken(tokenCookie.value);

    const user = await prisma.user.findUnique({
      where: { id: BigInt(payload.sub) },
      select: { id: true, username: true, role: true },
    });

    if (!user) {
      redirect('/login');
    }

    userData = {
      id: Number(user.id),
      username: user.username,
      role: user.role,
    };
  } catch {
    // Invalid token or expired
    redirect('/login');
  }

  return (
    <div className="flex min-h-screen w-full">
      <Sidebar user={userData} />
      <main className="flex-1 overflow-auto bg-navy-800">
        {children}
      </main>
    </div>
  );
}
