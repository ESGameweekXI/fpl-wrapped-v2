import type { ManagerData } from '@/lib/supabase/queries';

export interface WrappedSlide {
  id: string;
  type: 'stat' | 'split' | 'personality' | 'cta';
  headline: string;
  stat?: string;
  substat?: string;
  comparison?: string;
  description?: string;
  personality?: string;
  emoji?: string;
  // split type fields
  topStat?: string;
  topSubstat?: string;
  topComparison?: string;
  bottomStat?: string;
  bottomSubstat?: string;
  bottomComparison?: string;
}

function fmt(val: number | null | undefined): string {
  return (val ?? 0).toLocaleString();
}

function ordinalSuffix(n: number | null | undefined): string {
  const safe = n ?? 0;
  const s = ['th', 'st', 'nd', 'rd'];
  const v = safe % 100;
  return safe.toLocaleString() + (s[(v - 20) % 10] || s[v] || s[0]);
}

function topPercent(rank: number | null | undefined, total = 10_000_000): string {
  const safe = rank ?? 0;
  if (safe <= 0) return '';
  const pct = (safe / total) * 100;
  if (pct < 1) return 'Top 1%';
  return `Top ${Math.ceil(pct)}%`;
}

const FALLBACK_SLIDES: WrappedSlide[] = [
  {
    id: 'loading',
    type: 'stat',
    headline: 'No data yet',
    description: 'Your season data is still syncing. Try again in a moment.',
    emoji: '⏳',
  },
  {
    id: 'thats-a-wrap',
    type: 'cta',
    headline: "That's a Wrap!",
    emoji: '🎁',
  },
];

function derivePersonality(data: ManagerData): {
  personality: string;
  description: string;
  emoji: string;
} {
  const totalTransfers = data.transfers.length;
  const totalHits = data.history.reduce(
    (sum, gw) => sum + ((gw.event_transfers_cost ?? 0) > 0 ? (gw.event_transfers_cost ?? 0) / 4 : 0),
    0
  );
  const totalBenchPoints = data.history.reduce(
    (sum, gw) => sum + (gw.points_on_bench ?? 0),
    0
  );

  const captainGws = data.picks.filter((p) => p.is_captain);
  const uniqueCaptainGws = new Set(captainGws.map((p) => p.event)).size;
  const captainHitRate =
    data.history.length > 0 ? uniqueCaptainGws / data.history.length : 0;

  const usedTripleCaptain = data.picks.some((p) => (p.multiplier ?? 0) === 3);

  if (totalTransfers <= 5) {
    return {
      personality: 'The Loyalist',
      description: "You barely touched your squad all season. Set and forget — that's your motto.",
      emoji: '🛡️',
    };
  }
  if (totalHits > 8) {
    return {
      personality: 'The Panic Buyer',
      description: "When things went wrong, you hit the transfer button — hard. No ragrets.",
      emoji: '🛒',
    };
  }
  if (totalBenchPoints > 200) {
    return {
      personality: 'The Optimist',
      description: "Your bench was stacked. Somehow your best players were always on the pitch… on the bench.",
      emoji: '🌟',
    };
  }
  if (captainHitRate > 0.7) {
    return {
      personality: 'The Captain Faithful',
      description: "You trusted your captain week in, week out. Loyalty is a virtue.",
      emoji: '©️',
    };
  }
  if (usedTripleCaptain) {
    return {
      personality: 'The Gambler',
      description: "Triple captain? You came to play. High risk, high reward — that's the FPL way.",
      emoji: '🎲',
    };
  }
  return {
    personality: 'The Steady Hand',
    description: "Consistent, calculated, composed. You played the long game and stuck to the plan.",
    emoji: '⚖️',
  };
}

export function computeSlides(data: ManagerData): WrappedSlide[] {
  const { manager, history, picks, transfers, gameweeks } = data;

  // Guard: if we have no history at all, return a minimal fallback set
  if (!history || history.length === 0) {
    return FALLBACK_SLIDES;
  }

  const totalPoints = manager.summary_overall_points ?? 0;
  const overallRank = manager.summary_overall_rank ?? 0;

  const avgScoreByGw = new Map(gameweeks.map((gw) => [gw.id, gw.average_entry_score ?? 0]));

  // --- Slide 1: Your Season ---
  const totalAvgPoints = history.reduce(
    (sum, gw) => sum + (avgScoreByGw.get(gw.event) ?? 0),
    0
  );
  const pointsDiff = totalPoints - totalAvgPoints;
  const percentStr = topPercent(overallRank);

  const slide1: WrappedSlide = {
    id: 'your-season',
    type: 'stat',
    headline: 'Your Season in Numbers',
    stat: overallRank > 0 ? ordinalSuffix(overallRank) : '—',
    substat: `${fmt(totalPoints)} points`,
    comparison: [
      pointsDiff !== 0 ? `${pointsDiff >= 0 ? '+' : ''}${Math.round(pointsDiff)} pts vs global average` : null,
      percentStr ? `${percentStr} of all managers` : null,
    ]
      .filter(Boolean)
      .join(' · ') || undefined,
    emoji: '🏆',
  };

  // --- Slide 2: Best & Worst (split) ---
  const bestGw = history.reduce(
    (best, gw) => ((gw.points ?? 0) > (best.points ?? 0) ? gw : best),
    history[0]
  );
  const bestGwAvg = avgScoreByGw.get(bestGw.event) ?? 0;
  const bestDiff = (bestGw.points ?? 0) - bestGwAvg;

  const worstGw = history.reduce(
    (worst, gw) => ((gw.points ?? Infinity) < (worst.points ?? Infinity) ? gw : worst),
    history[0]
  );
  const worstGwAvg = avgScoreByGw.get(worstGw.event) ?? 0;
  const worstDiff = (worstGw.points ?? 0) - worstGwAvg;

  const slide2: WrappedSlide = {
    id: 'best-worst',
    type: 'split',
    headline: 'Your Season in Two Moments',
    emoji: '📊',
    topStat: `${fmt(bestGw.points)} pts`,
    topSubstat: `Your Best — Gameweek ${bestGw.event}`,
    topComparison: bestGwAvg > 0
      ? `${bestDiff >= 0 ? '+' : ''}${bestDiff} vs GW average`
      : undefined,
    bottomStat: `${fmt(worstGw.points)} pts`,
    bottomSubstat: `Your Worst — Gameweek ${worstGw.event}`,
    bottomComparison: worstGwAvg > 0
      ? `${worstDiff >= 0 ? '+' : ''}${worstDiff} vs GW average`
      : undefined,
  };

  // --- Slide 3: Captain's Log ---
  const captainPicks = picks.filter((p) => p.is_captain);
  const uniqueCaptainGws = Array.from(new Set(captainPicks.map((p) => p.event)));
  const captainGwCount = uniqueCaptainGws.length;
  const captainRate =
    history.length > 0 ? Math.round((captainGwCount / history.length) * 100) : 0;

  const slide3: WrappedSlide = {
    id: 'captains-log',
    type: 'stat',
    headline: "Captain's Log",
    stat: `${captainGwCount} GWs captained`,
    substat: `${captainRate}% captain consistency`,
    emoji: '🅲',
  };

  // --- Slide 4: Transfer Window ---
  const totalTransfers = transfers.length;
  const totalHitGws = history.filter((gw) => (gw.event_transfers_cost ?? 0) > 0);
  const totalHits = totalHitGws.reduce(
    (sum, gw) => sum + (gw.event_transfers_cost ?? 0) / 4,
    0
  );
  const totalHitPoints = totalHitGws.reduce(
    (sum, gw) => sum + (gw.event_transfers_cost ?? 0),
    0
  );

  const slide4: WrappedSlide = {
    id: 'transfer-window',
    type: 'stat',
    headline: 'Transfer Window',
    stat: `${totalTransfers} transfers`,
    substat: `${totalHits} hits · −${totalHitPoints} pts`,
    comparison:
      totalHits === 0
        ? 'Clean sheet — no points deductions all season'
        : `${totalHitPoints} points lost to transfer hits`,
    emoji: '🔄',
  };

  // --- Slide 5: Bench Heartbreak ---
  const totalBenchPoints = history.reduce(
    (sum, gw) => sum + (gw.points_on_bench ?? 0),
    0
  );
  const worstBenchGw = history.reduce(
    (worst, gw) => ((gw.points_on_bench ?? 0) > (worst.points_on_bench ?? 0) ? gw : worst),
    history[0]
  );
  const avgBenchPerGw = history.length > 0 ? Math.round(totalBenchPoints / history.length) : 0;

  const slide5: WrappedSlide = {
    id: 'bench-heartbreak',
    type: 'stat',
    headline: 'Bench Heartbreak',
    stat: `${fmt(totalBenchPoints)} pts on bench`,
    substat: `Worst GW: ${fmt(worstBenchGw.points_on_bench)} pts (GW${worstBenchGw.event})`,
    comparison: totalBenchPoints > 0 ? `${avgBenchPerGw} extra pts per GW left unrealised` : undefined,
    emoji: '😢',
  };

  // --- Slide 6: FPL Personality ---
  const { personality, description, emoji } = derivePersonality(data);

  const slide6: WrappedSlide = {
    id: 'fpl-personality',
    type: 'personality',
    headline: 'Your FPL Personality',
    personality,
    description,
    emoji,
  };

  // --- Slide 7: That's a Wrap ---
  const slide7: WrappedSlide = {
    id: 'thats-a-wrap',
    type: 'cta',
    headline: "That's a Wrap!",
    substat: manager.entry_name,
    description: `${fmt(overallRank)} overall rank · ${fmt(totalPoints)} pts`,
    emoji: '🎁',
  };

  return [slide1, slide2, slide3, slide4, slide5, slide6, slide7];
}
