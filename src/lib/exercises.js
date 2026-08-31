import { EXDB } from './exercises-data.js'
import { t } from './i18n.js'

export { EXDB }
export const EXIDX = {}
EXDB.forEach(e => { EXIDX[e.id] = e })
export const BODYPARTS = [...new Set(EXDB.map(e => e.bp))].sort()

// Equipment options present in a given list of exercises, most common first
export function equipmentOf(list) {
  const c = {}
  list.forEach(e => { if (e.eq) c[e.eq] = (c[e.eq] || 0) + 1 })
  return Object.keys(c).sort((a, b) => c[b] - c[a] || (a < b ? -1 : 1))
}

// Custom (user-created) exercises
let customIds = []
export function registerCustom(list) {
  customIds.forEach(id => delete EXIDX[id])
  customIds = (list || []).map(e => e.id)
  ;(list || []).forEach(e => { EXIDX[e.id] = e })
}
// Full searchable catalogue — customs first
export const allExercises = st => [...(st.customEx || []), ...EXDB]

// Exercise media: CDN fallback ensures zero-configuration media streaming on Vercel
const DEFAULT_CDN_IMG = 'https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@7455efae41b330c265e7cd4b78dfa848e7ce5ebd/images/'
const DEFAULT_CDN_GIF = 'https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@7455efae41b330c265e7cd4b78dfa848e7ce5ebd/videos/'

const IMG_BASE = (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_IMG_BASE) || DEFAULT_CDN_IMG
const GIF_BASE = (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_GIF_BASE) || DEFAULT_CDN_GIF

export const imgSrc = ex => (ex?.img ? (ex.img.startsWith('http') ? ex.img : IMG_BASE + ex.img) : '')
export const gifSrc = ex => (ex?.gif ? (ex.gif.startsWith('http') ? ex.gif : GIF_BASE + ex.gif) : '')

// Cardio exercises log time + speed instead of weight × reps.
export const isCardio = idOrEx => (typeof idOrEx === 'string' ? EXIDX[idOrEx] : idOrEx)?.bp === 'cardio'

// Bodyweight detection
export const isBodyweightEq = idOrEx =>
  (typeof idOrEx === 'string' ? EXIDX[idOrEx] : idOrEx)?.eq === 'body weight'

// Fallback for missing exercises
export const exOr = id => EXIDX[id] ||
  { id, n: t('Unknown exercise'), bp: '', tg: '', eq: '', sm: [], st: [], missing: true }

/* ============================================================================
   Smart Search & Ranking Engine
   - Hyphen & punctuation normalization (e.g. push-up == push up)
   - Stemming & plural handling (e.g. ups -> up, curls -> curl, presses -> press)
   - Multi-word compound expansion (e.g. pushups -> push up, pullups -> pull up)
   - Fuzzy multi-token matching in any order (e.g. bench dumb -> dumbbell bench press)
   - Precision scoring & ranking so direct hits appear first
   ========================================================================== */

export function normalizeQuery(q) {
  if (!q) return ''
  return q
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[-_/\\(),.+:;'"!?]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

const STEM_RULES = [
  [/ies$/, 'y'],       // flies -> fly
  [/shes$/, 'sh'],    // pushes -> push
  [/ches$/, 'ch'],    // crunches -> crunch
  [/sses$/, 'ss'],    // presses -> press
  [/xes$/, 'x'],      // boxes -> box
  [/s$/, ''],         // ups -> up, curls -> curl, squats -> squat, pullups -> pullup
]

export function stemWord(w) {
  if (!w || w.length <= 2) return w
  for (const [re, repl] of STEM_RULES) {
    if (re.test(w)) return w.replace(re, repl)
  }
  return w
}

const SHORTCUTS = {
  pushup: ['push', 'up'],
  pushups: ['push', 'up'],
  pullup: ['pull', 'up'],
  pullups: ['pull', 'up'],
  chinup: ['chin', 'up'],
  chinups: ['chin', 'up'],
  situp: ['sit', 'up'],
  situps: ['sit', 'up'],
  stepup: ['step', 'up'],
  stepups: ['step', 'up'],
  pulldown: ['pull', 'down'],
  pulldowns: ['pull', 'down'],
  pushdown: ['push', 'down'],
  pushdowns: ['push', 'down'],
  deadlift: ['dead', 'lift'],
  deadlifts: ['dead', 'lift'],
  bicep: ['biceps'],
  tricep: ['triceps'],
  ab: ['abs'],
}

export function tokenizeQuery(query) {
  const norm = normalizeQuery(query)
  if (!norm) return []
  const rawWords = norm.split(' ').filter(Boolean)
  const tokens = []
  
  for (const w of rawWords) {
    if (SHORTCUTS[w]) {
      tokens.push(...SHORTCUTS[w])
    } else {
      tokens.push(w)
      const stemmed = stemWord(w)
      if (stemmed !== w) tokens.push(stemmed)
    }
  }
  return [...new Set(tokens)]
}

export function scoreExercise(ex, queryWords, rawQuery) {
  if (!queryWords.length) return 1
  
  const normName = normalizeQuery(ex.n)
  const nameTokens = normName.split(' ')
  const nameStemmed = nameTokens.map(stemWord)
  
  const normTarget = normalizeQuery(ex.tg || '')
  const targetTokens = normTarget.split(' ')
  const targetStemmed = targetTokens.map(stemWord)

  const normBp = normalizeQuery(ex.bp || '')
  const bpTokens = normBp.split(' ')

  const normEq = normalizeQuery(ex.eq || '')
  const eqTokens = normEq.split(' ')

  let totalScore = 0
  let matchedAll = true
  
  // Exact or prefix full query match
  if (normName === rawQuery) {
    totalScore += 1500
  } else if (normName.startsWith(rawQuery + ' ') || normName.startsWith(rawQuery)) {
    totalScore += 600
  }

  // Expand query words if they are compounds (e.g. 'pushups' -> ['push', 'up'], 'bench' -> ['bench'])
  const requiredTokens = []
  for (const w of queryWords) {
    if (SHORTCUTS[w]) {
      requiredTokens.push(...SHORTCUTS[w])
    } else {
      requiredTokens.push(w)
    }
  }

  for (const qWord of requiredTokens) {
    const qStem = stemWord(qWord)
    let tokenScore = 0

    // 1. Exact word in exercise name
    if (nameTokens.includes(qWord) || nameStemmed.includes(qStem) || nameTokens.includes(qStem)) {
      tokenScore = 250
      // Boost main foundational lifts with simple 1-2 word names (e.g. push-up, pull-up, chin-up)
      if (nameTokens.length <= 2) tokenScore += 150
      else if (nameTokens.length <= 3) tokenScore += 60
      if (nameStemmed[nameStemmed.length - 1] === qStem) tokenScore += 50
    }
    // 2. Prefix of a word in exercise name (e.g. 'dumb' matches 'dumbbell', 'bicep' matches 'biceps')
    else if (nameTokens.some(w => w.startsWith(qWord) || w.startsWith(qStem))) {
      tokenScore = 120
    }
    // 3. Match in target muscle / bodypart / equipment
    else if (targetTokens.includes(qWord) || targetStemmed.includes(qStem) || targetTokens.some(w => w.startsWith(qWord))) {
      tokenScore = 60
    } else if (bpTokens.includes(qWord) || eqTokens.includes(qWord)) {
      tokenScore = 40
    }

    if (tokenScore === 0) {
      matchedAll = false
    } else {
      totalScore += tokenScore
    }
  }

  if (!matchedAll) return 0
  return totalScore
}

export function searchAndRankExercises(list, query) {
  const norm = normalizeQuery(query)
  if (!norm) return list
  
  const rawWords = norm.split(' ').filter(Boolean)
  const scored = []
  
  for (const ex of list) {
    const score = scoreExercise(ex, rawWords, norm)
    if (score > 0) {
      scored.push({ ex, score })
    }
  }
  
  // Sort descending by score, tie-break by shorter name (more direct match), then alphabetical
  scored.sort((a, b) => b.score - a.score || a.ex.n.length - b.ex.n.length || (a.ex.n < b.ex.n ? -1 : 1))
  return scored.map(s => s.ex)
}
