import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore, DEF, hasData } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { ACCENTS, todayISO, localTZ } from '../lib/format.js'
import { effortOf } from '../lib/history.js'
import { wakeLockSupported } from '../lib/wakelock.js'
import { t, LANGS, INSTR_LANGS } from '../lib/i18n.js'
import { loadStarterPlan, confirmSheet, importFromApp, authSheet } from '../sheets.jsx'
import Icon from '../components/Icon.jsx'
import { Section, Row, SelectRow, Switch, Segmented, Button } from '../components/ui.jsx'

export default function Settings() {
  const nav = useNavigate()
  const S = useStore(s => s.S)
  const user = useStore(s => s.user)
  const syncStatus = useStore(s => s.syncStatus)
  const { update, replaceState, resetDemo, pushState, signOut } = useStore()
  const toast = useUI(s => s.toast)
  const fileRef = useRef(null)
  const importRef = useRef(null)
  const wakeOK = wakeLockSupported()

  const doExport = async () => {
    const json = JSON.stringify(S, null, 2)
    const name = 'opengym-backup-' + todayISO() + '.json'
    const blob = new Blob([json], { type: 'application/json' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click(); URL.revokeObjectURL(a.href)
    toast(t('Backup exported'))
  }

  const doImport = ev => {
    const f = ev.target.files[0]; if (!f) return
    const rd = new FileReader()
    rd.onload = () => {
      try {
        const data = JSON.parse(rd.result)
        if (!data.workouts || !data.routines) throw new Error('not an openGym backup')
        confirmSheet({
          title: t('Import backup?'),
          message: t('This replaces all current data with the backup file.'),
          confirmText: t('Import'),
          danger: true,
          onConfirm: () => {
            replaceState(Object.assign(JSON.parse(JSON.stringify(DEF)), data))
            toast(t('Backup imported'))
          }
        })
      } catch (e) { toast(t('Import failed: {0}', e.message)) }
    }
    rd.readAsText(f)
  }

  return <div className="narrow">
    <div className="hdr">
      <button className="iconbtn" onClick={() => nav('/home')} aria-label={t('Home')}><Icon name="chevronLeft" /></button>
      <div style={{ flex: 1, marginLeft: 10 }}><h1>{t('Settings')}</h1></div>
    </div>

    {/* ---------- Account & Cloud Sync ---------- */}
    <Section title={t('Account & MongoDB Sync')}>
      {user ? (
        <>
          <Row
            icon="personCircle"
            iconTint="var(--acc)"
            title={user.displayName || user.username}
            subtitle={`@${user.username} · ${t('MongoDB Atlas Connected')}`}
          />
          <Row
            icon="cloud"
            iconTint="var(--blue)"
            title={t('Cloud Sync')}
            subtitle={
              syncStatus === 'syncing'
                ? t('Syncing with MongoDB…')
                : syncStatus === 'synced'
                ? t('All workouts, weights & patterns synced')
                : syncStatus === 'error'
                ? t('Sync error — tap Sync Now to retry')
                : t('Connected & ready')
            }
            accessory={
              <Button
                size="sm"
                variant="tinted"
                icon="reset"
                disabled={syncStatus === 'syncing'}
                onClick={async () => {
                  await pushState()
                  toast(t('Synced with MongoDB'))
                }}
              >
                {t('Sync Now')}
              </Button>
            }
          />
          <Row
            icon="signOut"
            iconTint="var(--red)"
            title={t('Sign Out')}
            accessory="chevron"
            onClick={() =>
              confirmSheet({
                title: t('Sign out?'),
                message: t('Your workout data remains safely stored in MongoDB.'),
                confirmText: t('Sign Out'),
                danger: true,
                onConfirm: async () => {
                  await signOut()
                  toast(t('Signed out'))
                },
              })
            }
          />
        </>
      ) : (
        <Row
          icon="cloud"
          iconTint="var(--acc)"
          title={t('Sign In / Register')}
          subtitle={t('Save all workouts, weights, routines, and days to MongoDB.')}
          accessory={
            <Button size="sm" variant="primary" icon="person" onClick={authSheet}>
              {t('Sign In')}
            </Button>
          }
        />
      )}
    </Section>

    {/* ---------- Storage & Mode ---------- */}
    <Section title={t('Storage & Data')}>
      <Row icon="lock" iconTint="var(--teal)" title={t('Local Cache & Offline Access')} subtitle={t('Workouts are cached locally for instant access even without internet.')} />
      <Row icon="sparkles" iconTint="var(--blue)" title={t('Load sample / demo plan')} accessory="chevron"
        onClick={() => confirmSheet({
          title: t('Reset sample data?'),
          message: t('Puts the example plan, workouts and weigh-ins back the way they started.'),
          confirmText: t('Load Demo'),
          onConfirm: () => { resetDemo(); nav('/home'); toast(t('Sample data loaded')) }
        })}
      />
    </Section>

    {/* ---------- general ---------- */}
    <Section title={t('General')} footer={t('Note: switching units only changes the label — logged numbers are not converted.')}>
      <SelectRow
        icon="globe" iconTint="var(--blue)" title={t('Language')}
        value={S.lang || 'en'} onChange={v => update(s => { s.lang = v })}
        options={Object.entries(LANGS).map(([k, name]) => ({
          value: k, label: name,
          subtitle: INSTR_LANGS.includes(k) ? null : t("Exercise instructions aren't available in this language yet — they stay in English."),
        }))}
      />
      <Row icon="scale" iconTint="var(--teal)" title={t('Weight unit')}>
        <Segmented className="seg-inline"
          options={[{ value: 'kg', label: 'kg' }, { value: 'lb', label: 'lb' }]}
          value={S.unit} onChange={v => update(s => { s.unit = v })} />
      </Row>
    </Section>

    {/* ---------- during a workout ---------- */}
    <Section title={t('During a workout')} footer={wakeOK ? t('The screen stays on while a workout is running, so you don’t have to unlock your phone between sets.') : null}>
      <SelectRow icon="timer" iconTint="var(--orange)" title={t('Rest timer')}
        value={S.restSec} onChange={v => update(s => { s.restSec = v })}
        options={[60, 90, 120, 150, 180].map(v => ({ value: v, label: v + 's' }))} />
      {wakeOK && (
        <Row icon="sun" iconTint="var(--yellow)" title={t('Keep screen awake')}
          subtitle={wakeOK ? null : t('Not supported in this browser.')}>
          <Switch checked={wakeOK && S.keepAwake !== false} disabled={!wakeOK}
            onChange={v => update(s => { s.keepAwake = v })} />
        </Row>
      )}
      <Row icon="bell" iconTint="var(--pink)" title={t('Sounds')}>
        <Switch checked={!!S.sound} onChange={v => update(s => { s.sound = v })} />
      </Row>
      <Row icon="target" iconTint="var(--purple)" title={t('Effort per set')}>
        <button className="helpbtn" aria-label={t('What are RIR and RPE?')} onClick={effortHelpSheet}><Icon name="info" /></button>
        <Segmented className="seg-inline"
          options={[{ value: 'none', label: t('Off') }, { value: 'rir', label: t('RIR') }, { value: 'rpe', label: t('RPE') }]}
          value={effortOf(S)} onChange={v => update(s => { s.effort = v; delete s.showRir })} />
      </Row>
    </Section>

    {/* ---------- appearance ---------- */}
    <Section title={t('Appearance')}>
      <Row icon="moon" iconTint="var(--indigo)" title={t('Theme')}>
        <Segmented
          className="seg-inline"
          options={[{ value: 'dark', icon: 'moon', label: t('Dark') }, { value: 'light', icon: 'sun', label: t('Light') }]}
          value={S.theme === 'light' ? 'light' : 'dark'}
          onChange={v => update(s => { s.theme = v })}
        />
      </Row>
      <Row icon="figureStrength" iconTint="var(--teal)" title={t('Body diagram')}>
        <Segmented
          className="seg-inline"
          options={[{ value: 'male', label: t('Male') }, { value: 'female', label: t('Female') }]}
          value={S.body === 'female' ? 'female' : 'male'}
          onChange={v => update(s => { s.body = v })}
        />
      </Row>
      <div className="lrow" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 12, paddingTop: 13, paddingBottom: 14 }}>
        <span className="lrow-t">{t('Accent color')}</span>
        <div className="swatches">
          {Object.entries(ACCENTS).map(([k, c]) => (
            <button key={k} className={'swatch' + ((S.accent || 'lime') === k ? ' on' : '')}
              style={{ background: c }} onClick={() => update(s => { s.accent = k })} aria-label={k} />
          ))}
        </div>
      </div>
    </Section>

    {/* ---------- data: fill it, bring things over, back it up, wipe it ---------- */}
    <Section title={t('Backup & Data Management')}>
      <Row icon="sparkles" iconTint="var(--acc)" title={t('Load starter plan (PPL)')} accessory="chevron" onClick={loadStarterPlan} />
      <Row icon="shuffle" iconTint="var(--teal)" title={t('Import from another app')}
        subtitle={t('FitNotes, Strong, Hevy — or body weight from Apple Health')}
        accessory="chevron" onClick={() => importRef.current.click()} />
      <Row icon="upload" iconTint="var(--blue)" title={t('Import backup (JSON)')} accessory="chevron" onClick={() => fileRef.current.click()} />
      <Row icon="download" iconTint="var(--blue)" title={t('Export backup (JSON)')} accessory="chevron" onClick={doExport} />
      <Row icon="trash" iconTint="var(--red)" title={t('Reset everything')} danger onClick={() => confirmSheet({
        title: t('Reset everything?'),
        message: t('Deletes your plan, workouts and body weight on this device. This cannot be undone.'),
        confirmText: t('Delete everything'),
        danger: true,
        onConfirm: () => {
          replaceState(JSON.parse(JSON.stringify(DEF)))
          nav('/home')
          toast(t('All data reset'))
        }
      })} />
    </Section>
    <input ref={fileRef} type="file" accept=".json,application/json" style={{ display: 'none' }} onChange={doImport} />
    <input ref={importRef} type="file" accept=".csv,.xml,text/csv,text/xml" style={{ display: 'none' }}
      onChange={ev => { const f = ev.target.files[0]; if (f) importFromApp(f); ev.target.value = '' }} />

    {/* PWA Installation Tip */}
    <Section title={t('PWA Installation')}>
      <Row icon="lightbulb" iconTint="var(--yellow)"
        title={t('Install as App on Home Screen')}
        subtitle={t('iOS: Tap Share → Add to Home Screen. Android / Chrome: Tap ⋮ menu → Install App / Add to Home screen.')} />
    </Section>

    <div className="dim small" style={{ textAlign: 'center', marginTop: 12, marginBottom: 40, lineHeight: 1.6 }}>
      openGym Next.js PWA · {t('free & open source (AGPL v3)')}<br />
      exercise data: hasaneyldrm/exercises-dataset (CC)
    </div>
  </div>
}

const EFFORT_ROWS = [
  ['0', '10', 'Nothing left — went to failure'],
  ['1', '9', 'One more rep in the tank'],
  ['2', '8', 'Two more reps'],
  ['3', '7', 'Three more reps'],
  ['4+', '≤6', 'Easy — warm-up territory'],
]
const EFFORT_TYPICAL = 2

function effortHelpSheet() {
  useUI.getState().openSheet(close => <>
    <h3>{t('Effort per set')}</h3>
    <div className="muted small" style={{ lineHeight: 1.5 }}>
      {t('How hard a set was, logged next to weight and reps. Two scales for the same judgement, counted from opposite ends.')}
    </div>
    <div className="efftbl">
      <div className="r hd"><span className="n">{t('RIR')}</span><span className="n">{t('RPE')}</span><span className="f">{t('How it felt')}</span></div>
      {EFFORT_ROWS.map(([rir, rpe, feel], i) => (
        <div key={rir} className={'r' + (i === EFFORT_TYPICAL ? ' on' : '')}>
          <span className="n">{rir}</span><span className="n">{rpe}</span><span className="f">{t(feel)}</span>
        </div>
      ))}
    </div>
    <div className="dim small" style={{ lineHeight: 1.5, display: 'grid', gap: 8 }}>
      <div>{t('RIR counts the reps you left; RPE reads the same effort off a 10-point scale — so RPE ≈ 10 − RIR. Pick the one you already think in.')}</div>
      <div>{t('The highlighted row is where most working sets land. Sets you have already logged keep their own scale, and nothing else reads the value — progression and estimated 1RM are unaffected.')}</div>
    </div>
    <div style={{ height: 8 }} />
  </>)
}
