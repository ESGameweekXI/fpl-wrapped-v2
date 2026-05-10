import type { ShareData } from './ShareButton';

interface ShareCardProps {
  shareData: ShareData;
  personality: string;
}

export default function ShareCard({ shareData }: ShareCardProps) {
  const rankDisplay =
    shareData.overallRank < 1_000_000
      ? shareData.overallRank.toLocaleString()
      : `${(shareData.overallRank / 1_000_000).toFixed(1)}M`;

  return (
    <div id="share-card" className="share-card">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/gameweek-logo.png"
        alt="Gameweek XI"
        className="share-card__logo"
      />
      <div className="share-card__team">{shareData.teamName}</div>
      <div className="share-card__rank">{rankDisplay}</div>
      <div className="share-card__points">
        {shareData.totalPoints.toLocaleString()} pts
      </div>
      <div className="share-card__personality">{shareData.personality}</div>
      <div className="share-card__url">fpl-wrapped.vercel.app</div>
    </div>
  );
}
