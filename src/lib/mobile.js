// Web / PWA mobile helper
export const MOBILE = false

export async function nativeLoad() {
  return null
}

export async function nativeSave(state) {
  // Saved via localStorage
}

export async function syncReminder(S, interactive = false) {
  return true
}

export async function shareExport(json, filename) {
  if (typeof navigator !== 'undefined' && navigator.share && navigator.canShare) {
    try {
      const file = new File([json], filename, { type: 'application/json' })
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: filename })
        return
      }
    } catch (e) {
      // fallback to download
    }
  }
  const blob = new Blob([json], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  a.click()
  URL.revokeObjectURL(a.href)
}
