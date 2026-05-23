'use client';

import { useState, forwardRef, type ReactNode, type ComponentType } from 'react';
import {
  Trophy, TrendingUp, ArrowUpDown, Star, ArrowLeftRight, Armchair, User,
} from 'lucide-react';
import type { WrappedSlide } from '@/lib/wrapped/slides';

const ICONS: Record<string, ComponentType<{ size?: number | string; color?: string; strokeWidth?: number }>> = {
  Trophy, TrendingUp, ArrowUpDown, Star, ArrowLeftRight, Armchair, User,
};

function SlideIcon({ name }: { name: string }) {
  const Icon = ICONS[name];
  if (!Icon) return null;
  return (
    <Icon
      size="clamp(2rem, 8vw, 3rem)"
      color="var(--brand-secondary)"
      strokeWidth={1.5}
    />
  );
}

interface SlideProps {
  slide: WrappedSlide;
  position: 'active' | 'prev' | 'next';
  shareButton?: ReactNode;
}

const Slide = forwardRef<HTMLDivElement, SlideProps>(function Slide({ slide, position, shareButton }, ref) {
  const [copied, setCopied] = useState(false);

  const posClass =
    position === 'active'
      ? 'wrapped-slide--active'
      : position === 'prev'
      ? 'wrapped-slide--prev'
      : 'wrapped-slide--next';

  // Captain's Log slide — kit card layout needs tighter proportions
  const isKitSlide = slide.type === 'stat' && !!slide.playerKitUrl;

  async function handleShare() {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'FPL Wrapped',
          text: 'Check out FPL Wrapped — a fun look back on your FPL season',
          url,
        });
      } catch {
        // user cancelled or error — no-op
      }
      return;
    }
    // Copy fallback
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
      } else {
        const el = document.createElement('textarea');
        el.value = url;
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // copy failed silently
    }
  }

  return (
    <div ref={ref} className={`wrapped-slide ${posClass}`}>
      {slide.type !== 'split' && slide.type !== 'cta' && (
        slide.icon ? (
          <div className="wrapped-emoji"><SlideIcon name={slide.icon} /></div>
        ) : null
      )}

      {slide.type !== 'split' && slide.type !== 'cta' && (
        <h2 className="wrapped-headline" style={isKitSlide ? { fontSize: 'clamp(1rem, 3vw, 1.4rem)', fontWeight: 700, marginBottom: 'clamp(4px, 1.2vh, 12px)' } : { fontSize: 'clamp(1.1rem, 3.5vw, 1.6rem)' }}>{slide.headline}</h2>
      )}

      {slide.type !== 'split' && slide.type !== 'cta' && shareButton && (
        <div style={{ marginBottom: isKitSlide ? 'clamp(4px, 1.2vh, 12px)' : '0.5rem' }}>{shareButton}</div>
      )}

      {slide.type === 'stat' && (
        <>
          {slide.stat && <div className="wrapped-stat" style={isKitSlide ? { fontSize: 'clamp(1.6rem, 5.5vw, 3rem)', marginBottom: 'clamp(4px, 1.2vh, 12px)' } : { fontSize: 'clamp(2.5rem, 9vw, 5rem)' }}>{slide.stat}</div>}
          {slide.substat && <div className="wrapped-substat" style={isKitSlide ? { fontSize: 'clamp(0.85rem, 2.5vw, 1.2rem)', marginBottom: 'clamp(4px, 1.2vh, 12px)' } : { fontSize: 'clamp(0.95rem, 3vw, 1.4rem)' }}>{slide.substat}</div>}
          {slide.playerKitUrl && (
            <div style={{ margin: 'clamp(4px, 1.2vh, 12px) 0', textAlign: 'center' }}>
              <div style={{ position: 'relative', display: 'inline-block' }}>
                {/* Captain badge */}
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: 18,
                  height: 18,
                  borderRadius: '50%',
                  background: 'rgba(2,26,22,0.92)',
                  border: '1.5px solid rgba(255,255,255,0.5)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: 'var(--font-body)',
                  fontWeight: 700,
                  fontSize: '0.55rem',
                  color: 'white',
                  zIndex: 1,
                  lineHeight: 1,
                }}>C</div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={slide.playerKitUrl}
                  alt={slide.playerName ?? ''}
                  style={{ width: 90, height: 90, objectFit: 'contain', display: 'block' }}
                  onError={(e) => {
                    (e.target as HTMLImageElement).parentElement!.style.display = 'none';
                  }}
                />
              </div>
              {slide.playerName && (
                <p style={{
                  margin: 'clamp(4px, 1.2vh, 12px) 0 0',
                  fontFamily: 'var(--font-body)',
                  fontSize: 'clamp(0.85rem, 2.5vw, 1.1rem)',
                  color: 'rgba(255,255,255,0.75)',
                  letterSpacing: '0.02em',
                }}>
                  {slide.playerName}
                </p>
              )}
            </div>
          )}
          {slide.comparison && (
            <p className="wrapped-comparison" style={isKitSlide ? { fontSize: 'clamp(0.8rem, 2vw, 1rem)', marginTop: 'clamp(4px, 1.2vh, 12px)' } : { fontSize: 'clamp(0.85rem, 2.5vw, 1.1rem)' }}>{slide.comparison}</p>
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
          <div style={{ textAlign: 'center', padding: '0.5rem 0' }}>
            <h2 className="wrapped-headline" style={{
              fontSize: 'clamp(1rem, 3vw, 1.4rem)',
              fontWeight: 700,
              color: 'var(--brand-secondary)',
              display: 'inline',
              verticalAlign: 'middle',
            }}>
              {slide.headline}
            </h2>
          </div>

          {shareButton && (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '0.25rem 0' }}>
              {shareButton}
            </div>
          )}

          {/* Top half — best */}
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0.25rem 1rem',
            minHeight: 0,
            overflow: 'hidden',
          }}>
            {slide.topKitUrl && (
              <div style={{ marginBottom: 'clamp(4px, 1vh, 10px)', flexShrink: 0, textAlign: 'center' }}>
                {slide.topKitLabel && (
                  <p style={{
                    margin: '0 0 0.1rem',
                    fontFamily: 'var(--font-body)',
                    fontSize: '0.6rem',
                    fontWeight: 600,
                    color: 'var(--brand-secondary)',
                    letterSpacing: '0.07em',
                    textTransform: 'uppercase',
                  }}>
                    {slide.topKitLabel}
                  </p>
                )}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={slide.topKitUrl}
                  alt={slide.topPlayerName ?? ''}
                  style={{ width: 70, height: 70, objectFit: 'contain', display: 'block', margin: '0 auto' }}
                  onError={(e) => { (e.target as HTMLImageElement).parentElement!.style.display = 'none'; }}
                />
                {slide.topPlayerName && (
                  <p style={{
                    margin: '0.1rem 0 0',
                    fontFamily: 'var(--font-body)',
                    fontSize: 'clamp(0.8rem, 2.2vw, 1rem)',
                    color: 'rgba(255,255,255,0.75)',
                    letterSpacing: '0.02em',
                  }}>
                    {slide.topPlayerName}
                    {slide.topPlayerPoints !== undefined && ` (${slide.topPlayerPoints} pts)`}
                  </p>
                )}
              </div>
            )}
            {slide.topStat && (
              <div className="wrapped-stat" style={{ fontSize: 'clamp(2.2rem, 8vw, 4.5rem)' }}>{slide.topStat}</div>
            )}
            {slide.topSubstat && (
              <div className="wrapped-substat" style={{ fontSize: 'clamp(0.9rem, 2.8vw, 1.3rem)' }}>{slide.topSubstat}</div>
            )}
            {slide.topComparison && (
              <p className="wrapped-comparison" style={{ fontSize: 'clamp(0.8rem, 2.2vw, 1rem)' }}>{slide.topComparison}</p>
            )}
          </div>

          {/* Divider */}
          <hr style={{
            border: 'none',
            borderTop: '1px solid rgba(0,255,194,0.2)',
            margin: '0',
            width: '100%',
            flexShrink: 0,
          }} />

          {/* Bottom half — worst */}
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0.5rem 1rem 0.5rem',
            minHeight: 0,
            overflow: 'hidden',
          }}>
            {slide.bottomKitUrl && (
              <div style={{ marginBottom: 'clamp(4px, 1vh, 10px)', flexShrink: 0, textAlign: 'center' }}>
                {slide.bottomKitLabel && (
                  <p style={{
                    margin: '0 0 0.1rem',
                    fontFamily: 'var(--font-body)',
                    fontSize: '0.6rem',
                    fontWeight: 600,
                    color: 'var(--brand-secondary)',
                    letterSpacing: '0.07em',
                    textTransform: 'uppercase',
                  }}>
                    {slide.bottomKitLabel}
                  </p>
                )}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={slide.bottomKitUrl}
                  alt={slide.bottomPlayerName ?? ''}
                  style={{ width: 70, height: 70, objectFit: 'contain', display: 'block', margin: '0 auto' }}
                  onError={(e) => { (e.target as HTMLImageElement).parentElement!.style.display = 'none'; }}
                />
                {slide.bottomPlayerName && (
                  <p style={{
                    margin: '0.1rem 0 0',
                    fontFamily: 'var(--font-body)',
                    fontSize: 'clamp(0.8rem, 2.2vw, 1rem)',
                    color: 'rgba(255,255,255,0.75)',
                    letterSpacing: '0.02em',
                  }}>
                    {slide.bottomPlayerName}
                    {slide.bottomPlayerPoints !== undefined && ` (${slide.bottomPlayerPoints} pts)`}
                  </p>
                )}
              </div>
            )}
            {slide.bottomStat && (
              <div className="wrapped-stat" style={{ fontSize: 'clamp(2.2rem, 8vw, 4.5rem)', color: 'rgba(255,255,255,0.65)' }}>
                {slide.bottomStat}
              </div>
            )}
            {slide.bottomSubstat && (
              <div className="wrapped-substat" style={{ fontSize: 'clamp(0.9rem, 2.8vw, 1.3rem)' }}>{slide.bottomSubstat}</div>
            )}
            {slide.bottomComparison && (
              <p className="wrapped-comparison" style={{ fontSize: 'clamp(0.8rem, 2.2vw, 1rem)' }}>{slide.bottomComparison}</p>
            )}
          </div>
        </div>
      )}

      {slide.type === 'personality' && (
        <>
          <div className="wrapped-personality" style={{ fontSize: 'clamp(1.8rem, 7vw, 3.5rem)' }}>{slide.personality}</div>
          {slide.description && (
            <p className="wrapped-description" style={{ fontSize: 'clamp(0.9rem, 2.8vw, 1.3rem)', marginTop: 'clamp(8px, 2vh, 20px)' }}>{slide.description}</p>
          )}
          {slide.earnedStat && (
            <p style={{
              marginTop: 'clamp(8px, 2vh, 20px)',
              fontFamily: 'var(--font-body)',
              fontStyle: 'italic',
              fontSize: 'clamp(0.8rem, 2.2vw, 1rem)',
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
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/gameweek-logo.png"
              alt="Gameweek XI"
              style={{ width: 64, height: 64, objectFit: 'contain', marginBottom: '1rem' }}
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
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
              {copied ? 'Link copied!' : 'Share Wrapped with Friends'}
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
