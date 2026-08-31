// Tiny dependency-free i18n.
import { useSyncExternalStore } from 'react'

export const LANGS = {
  en: 'English', de: 'Deutsch', es: 'Español', fr: 'Français', it: 'Italiano',
  pt: 'Português', pl: 'Polski', tr: 'Türkçe', ru: 'Русский', zh: '中文',
  ko: '한국어', hi: 'हिन्दी'
}
export const INSTR_LANGS = ['en', 'es', 'fr', 'it', 'tr', 'ru', 'zh', 'hi', 'pl', 'ko']
const DATE_LOCALES = {
  en: 'en-GB', de: 'de-DE', es: 'es-ES', fr: 'fr-FR', it: 'it-IT', pt: 'pt-PT',
  pl: 'pl-PL', tr: 'tr-TR', ru: 'ru-RU', zh: 'zh-CN', ko: 'ko-KR', hi: 'hi-IN'
}

const localeLoaders = {
  de: () => import('../locales/de.js'),
  es: () => import('../locales/es.js'),
  fr: () => import('../locales/fr.js'),
  it: () => import('../locales/it.js'),
  pt: () => import('../locales/pt.js'),
  pl: () => import('../locales/pl.js'),
  tr: () => import('../locales/tr.js'),
  ru: () => import('../locales/ru.js'),
  zh: () => import('../locales/zh.js'),
  ko: () => import('../locales/ko.js'),
  hi: () => import('../locales/hi.js'),
}

const instrLoaders = {
  es: () => import('../instr/es.js'),
  fr: () => import('../instr/fr.js'),
  it: () => import('../instr/it.js'),
  pl: () => import('../instr/pl.js'),
  tr: () => import('../instr/tr.js'),
  ru: () => import('../instr/ru.js'),
  zh: () => import('../instr/zh.js'),
  ko: () => import('../instr/ko.js'),
  hi: () => import('../instr/hi.js'),
}

let lang = 'en'
let dict = {}
let instr = null            // { exId: [steps] } for the current language, null = English
let version = 0
const subs = new Set()
const notify = () => { version++; subs.forEach(f => f()) }

export const getLang = () => lang
export const dateLocale = () => DATE_LOCALES[lang] || 'en-GB'

// Translate a source string; {0},{1}… are replaced with args (also on the English fallback).
export function t(s, ...args) {
  let v = dict[s] || s
  for (let i = 0; i < args.length; i++) v = v.replaceAll('{' + i + '}', args[i])
  return v
}
// Instructions for an exercise in the current language (English steps as fallback).
export const instrFor = ex => (instr && instr[ex.id]) || ex.st || []

export async function setLang(l) {
  if (!LANGS[l]) l = 'en'
  if (l === lang && version > 0) return
  lang = l
  try {
    dict = l === 'en' || !localeLoaders[l] ? {} : (await localeLoaders[l]()).default
    instr = l === 'en' || !instrLoaders[l] ? null : (await instrLoaders[l]()).default
  } catch (e) {
    dict = {}
    instr = null
  }
  notify()
}

// Re-renders the subscribing component (and its children) whenever the language changes.
export function useLang() {
  return useSyncExternalStore(fn => { subs.add(fn); return () => subs.delete(fn) }, () => version)
}
