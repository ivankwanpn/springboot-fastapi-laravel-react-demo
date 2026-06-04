import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { status: 'ERROR', message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.slice(7);
    const { role } = await verifyToken(token);

    if (role !== 'ROLE_ADMIN') {
      return NextResponse.json(
        { status: 'ERROR', message: 'Forbidden' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const size = Math.min(100, Math.max(1, parseInt(searchParams.get('size') || '20')));
    const skip = (page - 1) * size;

    const where = search
      ? { username: { contains: search } }
      : {};

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          username: true,
          role: true,
          createdAt: true,
        },
        skip,
        take: size,
        orderBy: { id: 'asc' },
      }),
      prisma.user.count({ where }),
    ]);

    const data = users.map((user) => ({
      id: Number(user.id),
      username: user.username,
      role: user.role,
      createdAt: user.createdAt,
    }));

    return NextResponse.json(
      { data, page, size, total },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof Error && error.name === 'JWSSignatureVerificationFailed') {
      return NextResponse.json(
        { status: 'ERROR', message: 'Unauthorized' },
        { status: 401 }
      );
    }
    return NextResponse.json(
      { status: 'ERROR', message: 'Internal server error' },
      { status: 500 }
    );
  }
}
