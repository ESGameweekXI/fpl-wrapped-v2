'use client';

import { useState, useCallback, useEffect, useRef, type ReactNode } from 'react';
import type { WrappedSlide } from '@/lib/wrapped/slides';
import Slide from './Slide';
import ShareCard from './ShareCard';
import type { ShareData } from './ShareButton';

interface SlideCarouselProps {
  slides: WrappedSlide[];
  shareData: ShareData;
}

interface SlideShareButtonProps {
  getCardEl: () => HTMLDivElement | null;
  slideId: string;
  slideHeadline: string;
}

function SlideShareButton({ getCardEl, slideId }: SlideShareButtonProps) {
  const [sharing, setSharing] = useState(false);

  async function handleShare() {
    const el = getCardEl();
    if (!el || sharing) return;
    setSharing(true);
    try {
      await document.fonts.ready;
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(el, {
        scale: window.devicePixelRatio || 2,
        useCORS: true,
        backgroundColor: null,
      });
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error('toBlob failed'))),
          'image/png'
        );
      });
      const file = new File([blob], `fpl-wrapped-${slideId}.png`, { type: 'image/png' });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          text: 'Check out my FPL Wrapped @GameweekXI',
          url: window.location.href,
        });
      } else {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `fpl-wrapped-${slideId}.png`;
        a.click();
        URL.revokeObjectURL(a.href);
      }
    } catch {
      // user cancelled or capture failed — no-op
    } finally {
      setSharing(false);
    }
  }

  return (
    <button
      onClick={(e) => { e.stopPropagation(); void handleShare(); }}
      disabled={sharing}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.35rem',
        padding: '0 1.1rem',
        minHeight: '44px',
        background: 'transparent',
        border: '1px solid rgba(133, 255, 226, 0.35)',
        borderRadius: '999px',
        color: 'var(--brand-text-muted)',
        fontFamily: 'var(--font-body)',
        fontSize: '0.8rem',
        cursor: sharing ? 'default' : 'pointer',
        opacity: sharing ? 0.6 : 1,
        whiteSpace: 'nowrap',
        letterSpacing: '0.02em',
      }}
    >
      <span>↗</span>
      {sharing ? 'Sharing…' : 'Share slide'}
    </button>
  );
}

export default function SlideCarousel({ slides, shareData }: SlideCarouselProps) {
  const [current, setCurrent] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const slideRefs = useRef<Array<HTMLDivElement | null>>(Array(slides.length).fill(null));

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
        const shareButton: ReactNode = slide.type !== 'cta' ? (
          <SlideShareButton
            getCardEl={() => slideRefs.current[i]}
            slideId={slide.id}
            slideHeadline={slide.headline}
          />
        ) : undefined;
        return (
          <Slide
            key={slide.id}
            ref={(el) => { slideRefs.current[i] = el; }}
            slide={slide}
            position={position}
            shareButton={shareButton}
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
