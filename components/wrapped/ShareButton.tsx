'use client';

import { useRef, useState } from 'react';
import html2canvas from 'html2canvas';

export interface ShareData {
  teamName: string;
  overallRank: number;
  totalPoints: number;
  personality: string;
}

interface ShareButtonProps {
  shareData: ShareData;
}

export default function ShareButton({ shareData }: ShareButtonProps) {
  const [sharing, setSharing] = useState(false);

  async function handleShare() {
    setSharing(true);
    try {
      const cardEl = document.getElementById('share-card');
      if (!cardEl) throw new Error('Share card not found');

      const canvas = await html2canvas(cardEl, {
        width: 1080,
        height: 1080,
        scale: 1,
        useCORS: true,
        backgroundColor: '#021A16',
      });

      canvas.toBlob(async (blob) => {
        if (!blob) return;
        const file = new File([blob], 'fpl-wrapped.png', { type: 'image/png' });

        if (navigator.canShare?.({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: `${shareData.teamName} — FPL Wrapped`,
            text: `I finished ${shareData.overallRank.toLocaleString()} overall with ${shareData.totalPoints.toLocaleString()} points. I'm ${shareData.personality}. Check your FPL Wrapped!`,
          });
        } else {
          // Fallback: download the image
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'fpl-wrapped.png';
          a.click();
          URL.revokeObjectURL(url);
        }
      }, 'image/png');
    } catch (err) {
      console.error('Share failed:', err);
    } finally {
      setSharing(false);
    }
  }

  return (
    <button
      onClick={handleShare}
      disabled={sharing}
      style={{
        background: 'var(--brand-secondary)',
        color: 'var(--brand-primary)',
        fontFamily: 'var(--font-heading)',
        fontWeight: 700,
        fontSize: '1.1rem',
        padding: '0.9rem 2.5rem',
        borderRadius: '999px',
        border: 'none',
        cursor: sharing ? 'wait' : 'pointer',
        opacity: sharing ? 0.7 : 1,
        transition: 'opacity 0.2s',
      }}
    >
      {sharing ? 'Preparing...' : 'Share Your Wrapped'}
    </button>
  );
}
