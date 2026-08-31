import { NextResponse } from 'next/server';
import { connectToDatabase } from '../../../lib/mongodb.js';
import { getAuthUser } from '../../../lib/auth-server.js';

export async function GET(request) {
  try {
    const auth = getAuthUser(request);
    if (!auth) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { db } = await connectToDatabase();
    const userData = db.collection('userData');

    const data = await userData.findOne({ userId: auth.userId });
    if (!data) {
      return NextResponse.json({ ok: true, state: null });
    }

    const state = {
      workouts: data.workouts || [],
      routines: data.routines || [],
      week: data.week || {},
      dayPlan: data.dayPlan || {},
      exWeights: data.exWeights || {},
      bodyweight: data.bodyweight || [],
      customEx: data.customEx || [],
      unit: data.unit || 'kg',
      targetW: data.targetW || null,
      theme: data.theme || 'dark',
      accent: data.accent || 'lime',
      reminder: data.reminder || null,
      effort: data.effort || null,
      updatedAt: data.updatedAt || null,
    };

    return NextResponse.json({ ok: true, state });
  } catch (error) {
    console.error('Sync GET error:', error);
    return NextResponse.json(
      { ok: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const auth = getAuthUser(request);
    if (!auth) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { state } = body || {};

    if (!state || typeof state !== 'object') {
      return NextResponse.json({ ok: false, error: 'Invalid state payload' }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    const userData = db.collection('userData');

    const now = new Date();

    // Compute basic summary aggregates for fast profile stats queries
    const workouts = Array.isArray(state.workouts) ? state.workouts : [];
    const totalWorkouts = workouts.length;
    const totalDurationSeconds = workouts.reduce((sum, w) => sum + (Number(w.dur) || 0), 0);
    const totalVolume = workouts.reduce((sum, w) => {
      let vol = 0;
      (w.entries || []).forEach(e => {
        (e.sets || []).forEach(s => {
          if (s.done !== false) vol += (Number(s.w) || 0) * (Number(s.r) || 0);
        });
      });
      return sum + vol;
    }, 0);

    const updateDoc = {
      userId: auth.userId,
      username: auth.username,
      workouts: workouts,
      routines: Array.isArray(state.routines) ? state.routines : [],
      week: state.week && typeof state.week === 'object' ? state.week : {},
      dayPlan: state.dayPlan && typeof state.dayPlan === 'object' ? state.dayPlan : {},
      exWeights: state.exWeights && typeof state.exWeights === 'object' ? state.exWeights : {},
      bodyweight: Array.isArray(state.bodyweight) ? state.bodyweight : [],
      customEx: Array.isArray(state.customEx) ? state.customEx : [],
      unit: state.unit || 'kg',
      targetW: state.targetW || null,
      theme: state.theme || 'dark',
      accent: state.accent || 'lime',
      reminder: state.reminder || null,
      effort: state.effort || null,
      stats: {
        totalWorkouts,
        totalDurationSeconds,
        totalVolume,
        lastWorkoutDate: workouts.length > 0 ? workouts[workouts.length - 1].d : null,
      },
      updatedAt: now,
    };

    await userData.updateOne(
      { userId: auth.userId },
      { $set: updateDoc },
      { upsert: true }
    );

    return NextResponse.json({ ok: true, syncedAt: now.toISOString() });
  } catch (error) {
    console.error('Sync POST error:', error);
    return NextResponse.json(
      { ok: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
