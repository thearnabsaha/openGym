import { useState } from 'react';
import { useStore } from '../store/useStore.js';
import { useUI } from '../store/useUI.js';
import { Button } from './ui.jsx';
import Icon from './Icon.jsx';
import { t } from '../lib/i18n.js';

export default function AuthModal({ close }) {
  const [tab, setTab] = useState('login'); // 'login' | 'register'
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const login = useStore(s => s.login);
  const register = useStore(s => s.register);
  const toast = useUI(s => s.toast);

  const handleSubmit = async (e) => {
    e?.preventDefault();
    setError('');

    if (!username.trim()) {
      setError(t('Please enter a username'));
      return;
    }
    if (!password) {
      setError(t('Please enter a password'));
      return;
    }

    try {
      setLoading(true);
      if (tab === 'login') {
        await login(username.trim(), password);
        toast(t('Signed in as {0}', username.trim()));
      } else {
        await register(username.trim(), password, displayName.trim());
        toast(t('Account created successfully!'));
      }
      close();
    } catch (err) {
      setError(err.message || t('Authentication failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '4px 0' }}>
      <div className="row between" style={{ marginBottom: 16 }}>
        <h3 style={{ margin: 0 }}>{tab === 'login' ? t('Sign In') : t('Create Account')}</h3>
      </div>

      <div className="chips" style={{ marginBottom: 16 }}>
        <button
          type="button"
          className={'chip nocap' + (tab === 'login' ? ' on' : '')}
          onClick={() => { setTab('login'); setError(''); }}
        >
          {t('Sign In')}
        </button>
        <button
          type="button"
          className={'chip nocap' + (tab === 'register' ? ' on' : '')}
          onClick={() => { setTab('register'); setError(''); }}
        >
          {t('Create Account')}
        </button>
      </div>

      {error && (
        <div
          style={{
            padding: '10px 14px',
            borderRadius: 'var(--r-sm, 10px)',
            background: 'color-mix(in srgb, var(--red, #ff453a) 15%, transparent)',
            color: 'var(--red, #ff453a)',
            fontSize: '0.9rem',
            marginBottom: 14,
            fontWeight: 500,
          }}
        >
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 18 }}>
          <div>
            <label className="sub" style={{ display: 'block', marginBottom: 5, fontSize: '0.85rem' }}>
              {t('Username')}
            </label>
            <input
              className="input"
              type="text"
              autoCapitalize="none"
              autoCorrect="off"
              placeholder={t('e.g. arnab')}
              value={username}
              onChange={e => setUsername(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          {tab === 'register' && (
            <div>
              <label className="sub" style={{ display: 'block', marginBottom: 5, fontSize: '0.85rem' }}>
                {t('Display Name (optional)')}
              </label>
              <input
                className="input"
                type="text"
                placeholder={t('e.g. Arnab Saha')}
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                disabled={loading}
              />
            </div>
          )}

          <div>
            <label className="sub" style={{ display: 'block', marginBottom: 5, fontSize: '0.85rem' }}>
              {t('Password')}
            </label>
            <input
              className="input"
              type="password"
              placeholder={tab === 'register' ? t('At least 4 characters') : t('Your password')}
              value={password}
              onChange={e => setPassword(e.target.value)}
              disabled={loading}
              required
            />
          </div>
        </div>

        <Button
          type="submit"
          variant="primary"
          icon={tab === 'login' ? 'arrowRight' : 'sparkles'}
          disabled={loading}
          style={{ width: '100%' }}
        >
          {loading ? t('Connecting…') : tab === 'login' ? t('Sign In') : t('Create Account & Sync')}
        </Button>
      </form>

      <div className="muted small" style={{ marginTop: 14, textAlign: 'center', lineHeight: 1.4 }}>
        {tab === 'login'
          ? t('All workouts, weights, routines and schedules will sync across your devices.')
          : t('Your local workouts and routines will be automatically saved to your new cloud account.')}
      </div>
    </div>
  );
}
