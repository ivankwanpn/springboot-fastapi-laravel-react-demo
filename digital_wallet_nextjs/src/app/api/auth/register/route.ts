import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { hashPassword } from '@/lib/auth';

export async function POST(request: NextRequest) {
  let username: string | undefined;

  try {
    const body = await request.json();
    username = body.username;
    const password = body.password;

    if (!username || username.length < 3) {
      return NextResponse.json(
        { status: 'ERROR', message: 'Username must be at least 3 characters' },
        { status: 400 }
      );
    }

    if (!password || password.length < 6) {
      return NextResponse.json(
        { status: 'ERROR', message: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    const passwordHash = await hashPassword(password);

    await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          username,
          passwordHash,
          role: 'ROLE_USER',
        },
      });

      await tx.wallet.create({
        data: {
          userId: user.id,
          currency: 'USDT',
          balance: 0,
          version: 0,
        },
      });
    });

    return NextResponse.json(
      { status: 'SUCCESS', message: 'User registered successfully' },
      { status: 201 }
    );
  } catch (error: any) {
    if (error?.code === 'P2002') {
      const target = (error.meta?.target as string[]) || [];
      if (target.includes('username')) {
        return NextResponse.json(
          { status: 'ERROR', message: `Username '${username || 'unknown'}' is already taken` },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { status: 'ERROR', message: 'Username is already taken' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { status: 'ERROR', message: 'Internal server error' },
      { status: 500 }
    );
  }
}
