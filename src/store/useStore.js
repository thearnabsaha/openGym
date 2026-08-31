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

export const useStore = create((set, get) => {
  const persist = (S) => {
    S._ts = Date.now()
    registerCustom(S.customEx)
    if (typeof window !== 'undefined') {
      localStorage.setItem(KEY, JSON.stringify(S))
    }
    set({ S })
  }

  // Clear local storage and reset
  const clearLocalSession = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('gym_guest')
      localStorage.removeItem('gym_dirty')
      localStorage.removeItem(KEY)
    }
    persist(clone(DEF))
  }

  return {
    S: (() => { const s = loadState(); registerCustom(s.customEx); return s })(),
    user: { id: 'local_user', name: 'Athlete', local: true },
    ready: false,

    // Mutate a draft of S via producer fn, then persist.
    update(mut) {
      const S = clone(get().S)
      mut(S)
      persist(S)
    },
    replaceState(S) { persist(clone(S)) },

    isGuest: () => true,
    setGuest(v) { set({}) },

    setUser(u) {
      set({ user: u })
    },

    async pushState() {
      // Future cloud database sync hook
    },
    async pullState() {
      // Future cloud database sync hook
    },

    async signOut() {
      clearLocalSession()
    },

    async signOutAll() {
      clearLocalSession()
    },

    // Reset demo profile / starter workouts
    async resetDemo() {
      const { buildDemoState } = await import('../lib/demoSeed.js')
      persist(Object.assign(clone(DEF), buildDemoState()))
    },

    // Boot: instant local boot
    async boot() {
      const S = loadState()
      registerCustom(S.customEx)
      const tz = typeof window !== 'undefined' ? localTZ() : 'UTC'
      if (S.reminder?.on && S.reminder.tz !== tz) {
        S.reminder = { ...S.reminder, tz }
        persist(S)
      }
      set({ S, ready: true })
    }
  }
})

export { hasData }
