'use client';

import dynamic from 'next/dynamic';

const App = dynamic(() => import('../App.jsx'), {
  ssr: false,
  loading: () => (
    <div id="app" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: 'var(--label-3)', fontSize: 34 }}>🏋️</div>
    </div>
  ),
});

export default function HomePage() {
  return <App />;
}
