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
            shareData={slide.type === 'cta' ? shareData : undefined}
          />
        );
      })}

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
