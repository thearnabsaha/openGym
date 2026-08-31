import { NextResponse } from 'next/server';
import { connectToDatabase } from '../../../../lib/mongodb.js';
import { hashPassword, signToken } from '../../../../lib/auth-server.js';

export async function POST(request) {
  try {
    const body = await request.json();
    const { username, password, displayName, initialState } = body || {};

    if (!username || typeof username !== 'string' || username.trim().length < 3) {
      return NextResponse.json(
        { ok: false, error: 'Username must be at least 3 characters long.' },
        { status: 400 }
      );
    }

    if (!password || typeof password !== 'string' || password.length < 4) {
      return NextResponse.json(
        { ok: false, error: 'Password must be at least 4 characters long.' },
        { status: 400 }
      );
    }

    const cleanUsername = username.trim().toLowerCase();
    const cleanDisplayName = (displayName && displayName.trim()) || username.trim();

    const { db } = await connectToDatabase();
    const users = db.collection('users');

    const existing = await users.findOne({ username: cleanUsername });
    if (existing) {
      return NextResponse.json(
        { ok: false, error: 'Username is already taken. Please choose another.' },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);
    const now = new Date();

    const insertResult = await users.insertOne({
      username: cleanUsername,
      displayName: cleanDisplayName,
      passwordHash,
      createdAt: now,
      updatedAt: now,
    });

    const userId = insertResult.insertedId.toString();

    // If client provided existing local state (workouts, routines, etc.), save it immediately!
    if (initialState && typeof initialState === 'object') {
      const userData = db.collection('userData');
      await userData.updateOne(
        { userId },
        {
          $set: {
            userId,
            username: cleanUsername,
            workouts: initialState.workouts || [],
            routines: initialState.routines || [],
            week: initialState.week || {},
            dayPlan: initialState.dayPlan || {},
            exWeights: initialState.exWeights || {},
            bodyweight: initialState.bodyweight || [],
            customEx: initialState.customEx || [],
            unit: initialState.unit || 'kg',
            targetW: initialState.targetW || null,
            theme: initialState.theme || 'dark',
            accent: initialState.accent || 'lime',
            reminder: initialState.reminder || null,
            effort: initialState.effort || null,
            updatedAt: now,
          },
        },
        { upsert: true }
      );
    }

    const token = signToken({ userId, username: cleanUsername });

    const response = NextResponse.json({
      ok: true,
      user: {
        id: userId,
        username: cleanUsername,
        displayName: cleanDisplayName,
      },
    });

    // Set secure HTTP-only cookie
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
    console.error('Registration error:', error);
    return NextResponse.json(
      { ok: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
