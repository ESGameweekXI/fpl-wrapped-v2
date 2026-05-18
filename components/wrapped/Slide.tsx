'use client';

import { useState, forwardRef } from 'react';
import type { WrappedSlide } from '@/lib/wrapped/slides';

interface SlideProps {
  slide: WrappedSlide;
  position: 'active' | 'prev' | 'next';
}

const Slide = forwardRef<HTMLDivElement, SlideProps>(function Slide({ slide, position }, ref) {
  const [copied, setCopied] = useState(false);

  const posClass =
    position === 'active'
      ? 'wrapped-slide--active'
      : position === 'prev'
      ? 'wrapped-slide--prev'
      : 'wrapped-slide--next';

  async function handleShare() {
    const url = window.location.href;
    const text = 'Check out my FPL Wrapped — see how your season stacks up 🏆';
    if (navigator.share) {
      try {
        await navigator.share({ text, url });
      } catch {
        // user cancelled or error — no-op
      }
    } else {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div ref={ref} className={`wrapped-slide ${posClass}`}>
      {slide.type !== 'split' && slide.type !== 'cta' && slide.emoji && (
        <div className="wrapped-emoji">{slide.emoji}</div>
      )}

      {slide.type !== 'split' && slide.type !== 'cta' && (
        <h2 className="wrapped-headline">{slide.headline}</h2>
      )}

      {slide.type === 'stat' && (
        <>
          {slide.stat && <div className="wrapped-stat">{slide.stat}</div>}
          {slide.substat && <div className="wrapped-substat">{slide.substat}</div>}
          {slide.comparison && (
            <p className="wrapped-comparison">{slide.comparison}</p>
          )}
        </>
      )}

      {slide.type === 'split' && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          height: '100%',
        }}>
          {/* Header */}
          <div style={{ textAlign: 'center', padding: '0.25rem 0 0.75rem' }}>
            {slide.emoji && (
              <span style={{ fontSize: '1.4rem', marginRight: '0.4rem' }}>{slide.emoji}</span>
            )}
            <h2 className="wrapped-headline" style={{
              fontSize: 'clamp(0.9rem, 2.5vw, 1.2rem)',
              display: 'inline',
              verticalAlign: 'middle',
            }}>
              {slide.headline}
            </h2>
          </div>

          {/* Top half — best */}
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0.5rem 1rem',
          }}>
            {slide.topStat && (
              <div className="wrapped-stat">{slide.topStat}</div>
            )}
            {slide.topSubstat && (
              <div className="wrapped-substat">{slide.topSubstat}</div>
            )}
            {slide.topComparison && (
              <p className="wrapped-comparison">{slide.topComparison}</p>
            )}
          </div>

          {/* Divider */}
          <hr style={{
            border: 'none',
            borderTop: '1px solid rgba(0,255,194,0.2)',
            margin: '0',
            width: '100%',
          }} />

          {/* Bottom half — worst */}
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0.5rem 1rem',
          }}>
            {slide.bottomStat && (
              <div className="wrapped-stat" style={{ color: 'rgba(255,255,255,0.65)' }}>
                {slide.bottomStat}
              </div>
            )}
            {slide.bottomSubstat && (
              <div className="wrapped-substat">{slide.bottomSubstat}</div>
            )}
            {slide.bottomComparison && (
              <p className="wrapped-comparison">{slide.bottomComparison}</p>
            )}
          </div>
        </div>
      )}

      {slide.type === 'personality' && (
        <>
          <div className="wrapped-personality">{slide.personality}</div>
          {slide.description && (
            <p className="wrapped-description">{slide.description}</p>
          )}
          {slide.earnedStat && (
            <p style={{
              marginTop: '1.5rem',
              fontFamily: 'var(--font-body)',
              fontStyle: 'italic',
              fontSize: 'clamp(0.75rem, 2vw, 0.9rem)',
              color: 'var(--brand-secondary)',
              opacity: 0.75,
              letterSpacing: '0.03em',
              maxWidth: '22rem',
              textAlign: 'center',
            }}>
              earned because: {slide.earnedStat}
            </p>
          )}
        </>
      )}

      {slide.type === 'cta' && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          height: '100%',
          justifyContent: 'space-between',
        }}>
          {/* Content */}
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem 1.5rem 0',
            textAlign: 'center',
          }}>
            {slide.emoji && (
              <div className="wrapped-emoji">{slide.emoji}</div>
            )}
            <h2 className="wrapped-headline">{slide.headline}</h2>

            {slide.substat && (
              <div className="wrapped-stat" style={{ fontSize: 'clamp(1.5rem, 6vw, 3rem)' }}>
                {slide.substat}
              </div>
            )}
            {slide.description && (
              <p className="wrapped-substat">{slide.description}</p>
            )}

            <p style={{
              marginTop: '1.25rem',
              fontFamily: 'var(--font-body)',
              fontSize: 'clamp(0.85rem, 2.2vw, 1rem)',
              color: 'var(--brand-text-muted)',
              letterSpacing: '0.02em',
            }}>
              Share with your friends
            </p>

            <p style={{
              marginTop: '0.5rem',
              fontFamily: 'var(--font-body)',
              fontSize: 'clamp(0.65rem, 1.6vw, 0.75rem)',
              color: 'var(--brand-text-muted)',
              opacity: 0.65,
              maxWidth: '18rem',
              lineHeight: 1.4,
            }}>
              Share &amp; follow @GameweekXI on X for a chance to win a football shirt of your choice
            </p>
          </div>

          {/* Bottom bar */}
          <div style={{
            padding: '1rem 1.5rem 1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.625rem',
          }}>
            <button
              onClick={handleShare}
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                background: 'var(--brand-secondary)',
                color: 'var(--brand-primary)',
                border: 'none',
                borderRadius: '0.5rem',
                fontFamily: 'var(--font-body)',
                fontWeight: 700,
                fontSize: 'clamp(0.85rem, 2.2vw, 1rem)',
                cursor: 'pointer',
                letterSpacing: '0.02em',
              }}
            >
              {copied ? 'Link copied!' : '↗ Share Your Wrapped'}
            </button>

            <a
              href="https://gameweekxi.com"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                background: 'transparent',
                color: 'var(--brand-secondary)',
                border: '1px solid var(--brand-secondary)',
                borderRadius: '0.5rem',
                fontFamily: 'var(--font-body)',
                fontWeight: 600,
                fontSize: 'clamp(0.8rem, 2vw, 0.9rem)',
                cursor: 'pointer',
                letterSpacing: '0.02em',
                textAlign: 'center',
                textDecoration: 'none',
                display: 'block',
                boxSizing: 'border-box',
              }}
            >
              Find out more about Gameweek XI
            </a>
          </div>
        </div>
      )}
    </div>
  );
});

export default Slide;
