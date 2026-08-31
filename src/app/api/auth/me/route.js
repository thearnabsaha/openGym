import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { connectToDatabase } from '../../../../lib/mongodb.js';
import { getAuthUser } from '../../../../lib/auth-server.js';

export async function GET(request) {
  try {
    const auth = getAuthUser(request);
    if (!auth) {
      return NextResponse.json({ ok: true, user: null });
    }

    const { db } = await connectToDatabase();
    const users = db.collection('users');

    let user = null;
    try {
      user = await users.findOne(
        { _id: new ObjectId(auth.userId) },
        { projection: { passwordHash: 0 } }
      );
    } catch (e) {
      user = await users.findOne(
        { username: auth.username },
        { projection: { passwordHash: 0 } }
      );
    }

    if (!user) {
      return NextResponse.json({ ok: true, user: null });
    }

    return NextResponse.json({
      ok: true,
      user: {
        id: user._id.toString(),
        username: user.username,
        displayName: user.displayName || user.username,
      },
    });
  } catch (error) {
    console.error('Auth verification error:', error);
    return NextResponse.json({ ok: true, user: null });
  }
}
