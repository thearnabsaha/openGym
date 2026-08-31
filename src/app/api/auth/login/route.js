import { NextResponse } from 'next/server';
import { connectToDatabase } from '../../../../lib/mongodb.js';
import { comparePassword, signToken } from '../../../../lib/auth-server.js';

export async function POST(request) {
  try {
    const body = await request.json();
    const { username, password } = body || {};

    if (!username || !password) {
      return NextResponse.json(
        { ok: false, error: 'Please provide both username and password.' },
        { status: 400 }
      );
    }

    const cleanUsername = username.trim().toLowerCase();

    const { db } = await connectToDatabase();
    const users = db.collection('users');

    const user = await users.findOne({ username: cleanUsername });
    if (!user) {
      return NextResponse.json(
        { ok: false, error: 'Invalid username or password.' },
        { status: 401 }
      );
    }

    const valid = await comparePassword(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json(
        { ok: false, error: 'Invalid username or password.' },
        { status: 401 }
      );
    }

    const userId = user._id.toString();
    const token = signToken({ userId, username: cleanUsername });

    const response = NextResponse.json({
      ok: true,
      user: {
        id: userId,
        username: cleanUsername,
        displayName: user.displayName || user.username,
      },
    });

    response.cookies.set({
      name: 'opengym_token',
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 90 * 24 * 60 * 60, // 90 days
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { ok: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
