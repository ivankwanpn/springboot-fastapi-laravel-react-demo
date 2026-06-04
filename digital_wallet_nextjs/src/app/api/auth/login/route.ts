import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { comparePassword, signToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    const user = await prisma.user.findUnique({
      where: { username },
    });

    if (!user) {
      return NextResponse.json(
        { status: 'ERROR', message: 'Invalid username or password' },
        { status: 401 }
      );
    }

    if (user.role === 'ROLE_DISABLED') {
      return NextResponse.json(
        { status: 'ERROR', message: 'Invalid username or password' },
        { status: 401 }
      );
    }

    const passwordValid = await comparePassword(password, user.passwordHash);
    if (!passwordValid) {
      return NextResponse.json(
        { status: 'ERROR', message: 'Invalid username or password' },
        { status: 401 }
      );
    }

    const token = await signToken({
      sub: String(user.id),
      username: user.username,
      role: user.role,
    });

    return NextResponse.json(
      {
        token,
        user: {
          id: Number(user.id),
          username: user.username,
          role: user.role,
          createdAt: user.createdAt,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { status: 'ERROR', message: 'Internal server error' },
      { status: 500 }
    );
  }
}
