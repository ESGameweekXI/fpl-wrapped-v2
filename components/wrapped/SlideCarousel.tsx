'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import type { WrappedSlide } from '@/lib/wrapped/slides';
import Slide from './Slide';
import ShareCard from './ShareCard';
import type { ShareData } from './ShareButton';

interface SlideCarouselProps {
  slides: WrappedSlide[];
  shareData: ShareData;
}

function buildTweetText(slide: WrappedSlide): string {
  const suffix = ' @GameweekXI';
  switch (slide.type) {
    case 'stat': {
      const middle = [slide.stat, slide.substat].filter(Boolean).join(' ');
      return `${slide.headline}: ${middle} — see your FPL Wrapped${suffix}`;
    }
    case 'split': {
      const middle = [slide.topStat, slide.topSubstat].filter(Boolean).join(' ');
      return `${slide.headline}: ${middle} — see your FPL Wrapped${suffix}`;
    }
    case 'personality': {
      const desc = slide.description ?? '';
      const shortened = desc.length > 80 ? desc.slice(0, 77) + '...' : desc;
      return `My FPL personality is ${slide.personality} — ${shortened}. See yours:${suffix}`;
    }
    default:
      return `See your FPL Wrapped${suffix}`;
  }
}

export default function SlideCarousel({ slides, shareData }: SlideCarouselProps) {
  const [current, setCurrent] = useState(0);
  const touchStartX = useRef<number | null>(null);

  const goNext = useCallback(() => {
    setCurrent((c) => Math.min(c + 1, slides.length - 1));
  }, [slides.length]);

  const goPrev = useCallback(() => {
    setCurrent((c) => Math.max(c - 1, 0));
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') goNext();
      if (e.key === 'ArrowLeft') goPrev();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [goNext, goPrev]);

  // Touch navigation
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const delta = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(delta) > 50) {
      delta > 0 ? goNext() : goPrev();
    }
    touchStartX.current = null;
  };

  const handleClick = (e: React.MouseEvent) => {
    const x = e.clientX;
    const mid = window.innerWidth / 2;
    x > mid ? goNext() : goPrev();
  };

  return (
    <div
      className="wrapped-container"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onClick={handleClick}
    >
      {/* Progress bars */}
      <div className="wrapped-progress">
        {slides.map((slide, i) => (
          <div key={slide.id} className="wrapped-progress-bar">
            <div
              className="wrapped-progress-fill"
              style={{ width: i <= current ? '100%' : '0%' }}
            />
          </div>
        ))}
      </div>

      {/* Slides */}
      {slides.map((slide, i) => {
        const position: 'active' | 'prev' | 'next' =
          i === current ? 'active' : i < current ? 'prev' : 'next';
        return (
          <Slide
            key={slide.id}
            slide={slide}
            position={position}
          />
        );
      })}

      {/* Share on X — shown on every slide except CTA */}
      {slides[current]?.type !== 'cta' && (() => {
        const pageUrl = typeof window !== 'undefined' ? window.location.href : '';
        const text = buildTweetText(slides[current]);
        const href = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(pageUrl)}`;
        return (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'fixed',
              bottom: '6.5rem',
              left: '50%',
              transform: 'translateX(-50%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.35rem',
              minHeight: '44px',
              padding: '0 1.25rem',
              fontFamily: 'var(--font-body)',
              fontSize: '0.8rem',
              color: 'var(--brand-text-muted)',
              opacity: 0.6,
              textDecoration: 'none',
              whiteSpace: 'nowrap',
              zIndex: 10,
            }}
          >
            <span style={{ fontSize: '0.95rem', lineHeight: 1 }}>𝕏</span>
            Share on X
          </a>
        );
      })()}

      {/* Nav dots */}
      <nav className="wrapped-nav" onClick={(e) => e.stopPropagation()}>
        {slides.map((slide, i) => (
          <button
            key={slide.id}
            className={`wrapped-nav-dot${i === current ? ' wrapped-nav-dot--active' : ''}`}
            onClick={() => setCurrent(i)}
            aria-label={`Go to slide ${i + 1}`}
          />
        ))}
      </nav>

      <p className="wrapped-tap-hint">Tap to advance</p>

      {/* Hidden share card for html2canvas */}
      <ShareCard shareData={shareData} personality={shareData.personality} />
    </div>
  );
}
