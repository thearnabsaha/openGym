import { create } from 'zustand'
import { localTZ } from '../lib/format.js'
import { registerCustom } from '../lib/exercises.js'

const KEY = 'gym_state_v1'
export const DEF = {
  unit: 'kg', restSec: 90, sound: true, keepAwake: true, lang: 'en',
  theme: 'dark', accent: 'lime', body: 'male', targetW: null,
  bodyweight: [], routines: [], week: {}, dayPlan: {},
  exWeights: {}, workouts: [], active: null, customEx: [], gifSize: 'full',
  reminder: { on: false, time: '08:00', tz: null }, effort: null
}
const clone = o => JSON.parse(JSON.stringify(o))

function loadState() {
  if (typeof window === 'undefined') return clone(DEF)
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return Object.assign(clone(DEF), JSON.parse(raw))
  } catch (e) { /* ignore */ }
  return clone(DEF)
}

const hasData = st => !!((st.workouts || []).length || (st.routines || []).length || (st.bodyweight || []).length)

let syncTimer = null

export const useStore = create((set, get) => {
  const persist = (S) => {
    S._ts = Date.now()
    registerCustom(S.customEx)
    if (typeof window !== 'undefined') {
      localStorage.setItem(KEY, JSON.stringify(S))
    }
    set({ S })

    // Auto-sync debounced to cloud if signed in
    if (get().user && !get().user.isGuest) {
      clearTimeout(syncTimer)
      syncTimer = setTimeout(() => {
        get().pushState()
      }, 800)
    }
  }

  return {
    S: (() => { const s = loadState(); registerCustom(s.customEx); return s })(),
    user: null, // { id, username, displayName }
    ready: false,
    syncStatus: 'idle', // 'idle' | 'syncing' | 'synced' | 'error'
    lastSyncedAt: null,

    // Mutate a draft of S via producer fn, then persist.
    update(mut) {
      const S = clone(get().S)
      mut(S)
      persist(S)
    },
    replaceState(S) { persist(clone(S)) },

    isGuest: () => !get().user || !!get().user.isGuest,

    setUser(u) {
      set({ user: u })
    },

    // Push local state to MongoDB Atlas
    async pushState() {
      const user = get().user
      if (!user || user.isGuest) return

      try {
        set({ syncStatus: 'syncing' })
        const res = await fetch('/api/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ state: get().S }),
        })

        if (res.ok) {
          const data = await res.json()
          set({ syncStatus: 'synced', lastSyncedAt: data.syncedAt || new Date().toISOString() })
        } else {
          set({ syncStatus: 'error' })
        }
      } catch (err) {
        console.warn('Sync push error:', err)
        set({ syncStatus: 'error' })
      }
    },

    // Pull cloud state from MongoDB Atlas
    async pullState() {
      const user = get().user
      if (!user || user.isGuest) return

      try {
        set({ syncStatus: 'syncing' })
        const res = await fetch('/api/sync')
        if (res.ok) {
          const data = await res.json()
          if (data.state) {
            const local = get().S
            // Merge with local if local was newer, or replace with cloud
            const merged = Object.assign(clone(DEF), local, data.state)
            persist(merged)
          }
          set({ syncStatus: 'synced', lastSyncedAt: new Date().toISOString() })
        } else {
          set({ syncStatus: 'error' })
        }
      } catch (err) {
        console.warn('Sync pull error:', err)
        set({ syncStatus: 'error' })
      }
    },

    // Sign In with username & password
    async login(username, password) {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })

      const data = await res.json()
      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Failed to sign in')
      }

      set({ user: data.user })
      await get().pullState()
      return data.user
    },

    // Sign Up / Register with username, password, displayName
    async register(username, password, displayName) {
      const currentState = get().S
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          password,
          displayName,
          initialState: hasData(currentState) ? currentState : undefined,
        }),
      })

      const data = await res.json()
      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Failed to create account')
      }

      set({ user: data.user, syncStatus: 'synced', lastSyncedAt: new Date().toISOString() })
      return data.user
    },

    // Sign Out
    async signOut() {
      try {
        await fetch('/api/auth/logout', { method: 'POST' })
      } catch (e) { /* ignore */ }
      set({ user: null, syncStatus: 'idle' })
    },

    async signOutAll() {
      await get().signOut()
    },

    // Reset demo profile / starter workouts
    async resetDemo() {
      const { buildDemoState } = await import('../lib/demoSeed.js')
      persist(Object.assign(clone(DEF), buildDemoState()))
    },

    // Boot: check session and load state
    async boot() {
      const S = loadState()
      registerCustom(S.customEx)
      const tz = typeof window !== 'undefined' ? localTZ() : 'UTC'
      if (S.reminder?.on && S.reminder.tz !== tz) {
        S.reminder = { ...S.reminder, tz }
        persist(S)
      }

      // Check current auth session
      try {
        const res = await fetch('/api/auth/me')
        if (res.ok) {
          const data = await res.json()
          if (data.user) {
            set({ user: data.user })
            // Background pull to get latest data from MongoDB
            get().pullState().catch(() => {})
          }
        }
      } catch (e) {
        // Offline / local mode
      }

      set({ S, ready: true })
    }
  }
})

export { hasData }
