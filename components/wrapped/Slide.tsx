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
      {slide.emoji && <div className="wrapped-emoji">{slide.emoji}</div>}

      <h2 className="wrapped-headline">{slide.headline}</h2>

      {slide.type === 'stat' && (
        <>
          {slide.stat && <div className="wrapped-stat">{slide.stat}</div>}
          {slide.substat && <div className="wrapped-substat">{slide.substat}</div>}
          {slide.comparison && (
            <p className="wrapped-comparison">{slide.comparison}</p>
          )}
        </>
      )}

      {slide.type === 'personality' && (
        <>
          <div className="wrapped-personality">{slide.personality}</div>
          {slide.description && (
            <p className="wrapped-description">{slide.description}</p>
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
