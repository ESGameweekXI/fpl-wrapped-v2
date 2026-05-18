'use client';

import type { WrappedSlide } from '@/lib/wrapped/slides';
import ShareButton from './ShareButton';
import type { ShareData } from './ShareButton';

interface SlideProps {
  slide: WrappedSlide;
  position: 'active' | 'prev' | 'next';
  shareData?: ShareData;
}

export default function Slide({ slide, position, shareData }: SlideProps) {
  const posClass =
    position === 'active'
      ? 'wrapped-slide--active'
      : position === 'prev'
      ? 'wrapped-slide--prev'
      : 'wrapped-slide--next';

  return (
    <div className={`wrapped-slide ${posClass}`}>
      {slide.type !== 'split' && slide.emoji && (
        <div className="wrapped-emoji">{slide.emoji}</div>
      )}

      {slide.type !== 'split' && (
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
        <>
          {slide.substat && <div className="wrapped-stat" style={{ fontSize: 'clamp(1.5rem, 6vw, 3rem)' }}>{slide.substat}</div>}
          {slide.description && (
            <p className="wrapped-substat">{slide.description}</p>
          )}
          {shareData && (
            <div style={{ marginTop: '2rem' }}>
              <ShareButton shareData={shareData} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
