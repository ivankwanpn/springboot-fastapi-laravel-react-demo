import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'dev-secret-key-change-in-production')

const publicPaths = ['/login', '/register', '/api/auth/register', '/api/auth/login']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow public paths
  if (publicPaths.some(p => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  // Allow static assets and Next.js internals
  if (pathname.startsWith('/_next') || pathname.startsWith('/favicon.ico')) {
    return NextResponse.next()
  }

  // Check for API routes — use Bearer token
  if (pathname.startsWith('/api/')) {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { status: 'ERROR', message: 'Invalid username or password' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)
    try {
      const { payload } = await jwtVerify(token, secret, { algorithms: ['HS256'] })

      // Admin routes need ROLE_ADMIN
      if (pathname.startsWith('/api/admin/')) {
        if (payload.role !== 'ROLE_ADMIN') {
          return NextResponse.json(
            { status: 'ERROR', message: 'Access denied' },
            { status: 403 }
          )
        }
      }

      return NextResponse.next()
    } catch {
      return NextResponse.json(
        { status: 'ERROR', message: 'Invalid username or password' },
        { status: 401 }
      )
    }
  }

  // Page routes — check cookie
  const token = request.cookies.get('token')?.value
  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  try {
    const { payload } = await jwtVerify(token, secret, { algorithms: ['HS256'] })

    // Admin pages
    if (pathname.startsWith('/admin')) {
      if (payload.role !== 'ROLE_ADMIN') {
        return NextResponse.redirect(new URL('/dashboard', request.url))
      }
    }

    return NextResponse.next()
  } catch {
    return NextResponse.redirect(new URL('/login', request.url))
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
