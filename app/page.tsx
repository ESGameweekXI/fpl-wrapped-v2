'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';

export default function LandingPage() {
  const router = useRouter();
  const [teamId, setTeamId] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showOverlay, setShowOverlay] = useState(false);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const id = teamId.trim();
    if (!id || isNaN(Number(id)) || Number(id) <= 0) {
      setError('Please enter a valid FPL team ID.');
      return;
    }
    setError('');
    setLoading(true);
    setTimeout(() => setShowOverlay(true), 500);
    router.push(`/wrapped/${id}`);
  }

  return (
    <>
      {showOverlay && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: '#021A16',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          animation: 'fpl-overlay-fade 0.3s ease forwards',
        }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/gameweek-logo.png"
            alt="Gameweek XI"
            style={{ width: 80, marginBottom: '2rem', opacity: 0.9 }}
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
          <p style={{
            fontFamily: 'var(--font-heading)',
            fontSize: '1.1rem',
            color: 'var(--brand-secondary)',
            letterSpacing: '0.06em',
            marginBottom: '2rem',
            margin: '0 0 2rem',
          }}>
            Unwrapping your season...
          </p>
          <div style={{
            width: '10rem',
            height: '2px',
            background: 'rgba(133,255,226,0.12)',
            borderRadius: '999px',
            overflow: 'hidden',
          }}>
            <div style={{
              height: '100%',
              width: '35%',
              background: 'var(--brand-secondary)',
              borderRadius: '999px',
              animation: 'fpl-loading-bar 1.6s cubic-bezier(0.4,0,0.6,1) infinite',
            }} />
          </div>
        </div>
      )}

      <main
        style={{
          minHeight: '100dvh',
          background: 'var(--brand-bg)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem',
          fontFamily: 'var(--font-body)',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/gameweek-logo.png"
          alt="Gameweek XI"
          style={{ width: 120, marginBottom: '2rem' }}
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />

        <h1
          style={{
            fontFamily: 'var(--font-heading)',
            fontSize: 'clamp(2rem, 8vw, 3.5rem)',
            fontWeight: 800,
            color: 'var(--brand-text)',
            textAlign: 'center',
            lineHeight: 1.1,
            marginBottom: '0.75rem',
          }}
        >
          FPL{' '}
          <span style={{ color: 'var(--brand-secondary)' }}>Wrapped</span>
        </h1>

        <p
          style={{
            color: 'var(--brand-text-muted)',
            fontSize: '1.1rem',
            textAlign: 'center',
            marginBottom: '2.5rem',
            maxWidth: '22rem',
          }}
        >
          Unwrap your FPL season to relive some of its best (and worst) moments.
        </p>

        <form
          onSubmit={handleSubmit}
          style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%', maxWidth: '22rem' }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <label
              htmlFor="teamId"
              style={{ color: 'var(--brand-text-muted)', fontSize: '0.875rem', fontWeight: 500 }}
            >
              Your FPL Team ID
            </label>
            <input
              id="teamId"
              type="number"
              min={1}
              value={teamId}
              onChange={(e) => setTeamId(e.target.value)}
              placeholder="e.g. 1234567"
              style={{
                padding: '0.85rem 1rem',
                borderRadius: '0.75rem',
                border: '2px solid rgba(0,255,194,0.3)',
                background: 'rgba(255,255,255,0.05)',
                color: 'var(--brand-text)',
                fontSize: '1.1rem',
                fontFamily: 'var(--font-body)',
                outline: 'none',
                transition: 'border-color 0.2s',
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--brand-secondary)')}
              onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(0,255,194,0.3)')}
            />
            <p style={{ fontSize: '0.75rem', color: 'rgba(133,255,226,0.6)' }}>
              Find your ID in the FPL app under Points &rarr; your team URL
            </p>
          </div>

          {error && (
            <p style={{ color: '#ff6b6b', fontSize: '0.875rem', margin: 0 }}>{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              background: 'var(--brand-secondary)',
              color: 'var(--brand-primary)',
              fontFamily: 'var(--font-heading)',
              fontWeight: 700,
              fontSize: '1.1rem',
              padding: '0.9rem',
              borderRadius: '999px',
              border: 'none',
              cursor: loading ? 'default' : 'pointer',
              transition: 'opacity 0.2s',
              animation: loading ? 'fpl-pulse 1.5s ease-in-out infinite' : 'none',
            }}
            onMouseEnter={!loading ? (e) => ((e.currentTarget as HTMLButtonElement).style.opacity = '0.85') : undefined}
            onMouseLeave={!loading ? (e) => ((e.currentTarget as HTMLButtonElement).style.opacity = '1') : undefined}
          >
            {loading ? 'Loading your season...' : 'See My Wrapped'}
          </button>
        </form>

        <p
          style={{
            marginTop: '3rem',
            fontSize: '0.75rem',
            color: 'rgba(133,255,226,0.4)',
            textAlign: 'center',
          }}
        >
          Powered by Gameweek XI · Not affiliated with the Premier League
        </p>
      </main>
    </>
  );
}
