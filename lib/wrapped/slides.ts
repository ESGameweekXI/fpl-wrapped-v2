import type { ManagerData } from '@/lib/supabase/queries';

export interface WrappedSlide {
  id: string;
  type: 'stat' | 'personality' | 'cta';
  headline: string;
  stat?: string;
  substat?: string;
  comparison?: string;
  description?: string;
  personality?: string;
  emoji?: string;
}

function ordinalSuffix(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n.toLocaleString() + (s[(v - 20) % 10] || s[v] || s[0]);
}

function topPercent(rank: number, total = 10_000_000): string {
  const pct = (rank / total) * 100;
  if (pct < 1) return 'Top 1%';
  return `Top ${Math.ceil(pct)}%`;
}

function derivePersonality(data: ManagerData): {
  personality: string;
  description: string;
  emoji: string;
} {
  const totalTransfers = data.transfers.length;
  const totalHits = data.history.reduce(
    (sum, gw) => sum + (gw.event_transfers_cost > 0 ? gw.event_transfers_cost / 4 : 0),
    0
  );
  const totalBenchPoints = data.history.reduce(
    (sum, gw) => sum + (gw.points_on_bench ?? 0),
    0
  );

  // Captain hit rate: GWs where captain scored more than any other player
  // We approximate by checking if captain multiplier > 1 across all GWs
  const captainGws = data.picks.filter((p) => p.is_captain);
  const uniqueCaptainGws = new Set(captainGws.map((p) => p.gameweek)).size;
  const captainHitRate =
    data.history.length > 0 ? uniqueCaptainGws / data.history.length : 0;

  // Check for chip usage via multiplier > 2 (triple captain = 3x)
  const usedTripleCaptain = data.picks.some((p) => p.multiplier === 3);

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

  const avgScoreByGw = new Map(gameweeks.map((gw) => [gw.id, gw.average_entry_score]));

  // --- Slide 1: Your Season ---
  const totalPoints = manager.summary_overall_points;
  const overallRank = manager.summary_overall_rank;
  const totalAvgPoints = history.reduce((sum, gw) => {
    return sum + (avgScoreByGw.get(gw.gameweek) ?? 0);
  }, 0);
  const pointsDiff = totalPoints - totalAvgPoints;

  const slide1: WrappedSlide = {
    id: 'your-season',
    type: 'stat',
    headline: 'Your Season in Numbers',
    stat: ordinalSuffix(overallRank),
    substat: `${totalPoints.toLocaleString()} points`,
    comparison: `${pointsDiff >= 0 ? '+' : ''}${Math.round(pointsDiff)} pts vs global average · ${topPercent(overallRank)} of all managers`,
    emoji: '🏆',
  };

  // --- Slide 2: Best Moment ---
  const bestGw = history.reduce(
    (best, gw) => (gw.points > (best?.points ?? 0) ? gw : best),
    history[0]
  );

  const slide2: WrappedSlide = {
    id: 'best-moment',
    type: 'stat',
    headline: 'Your Best Moment',
    stat: `${bestGw?.points ?? 0} pts`,
    substat: `Gameweek ${bestGw?.gameweek ?? '?'}`,
    comparison: bestGw && avgScoreByGw.has(bestGw.gameweek)
      ? `${bestGw.points - (avgScoreByGw.get(bestGw.gameweek) ?? 0) >= 0 ? '+' : ''}${bestGw.points - (avgScoreByGw.get(bestGw.gameweek) ?? 0)} vs GW average`
      : undefined,
    emoji: '⭐',
  };

  // --- Slide 3: Worst Nightmare ---
  const worstGw = history.reduce(
    (worst, gw) => (gw.points < (worst?.points ?? Infinity) ? gw : worst),
    history[0]
  );

  const slide3: WrappedSlide = {
    id: 'worst-nightmare',
    type: 'stat',
    headline: 'Your Worst Nightmare',
    stat: `${worstGw?.points ?? 0} pts`,
    substat: `Gameweek ${worstGw?.gameweek ?? '?'}`,
    comparison: worstGw && avgScoreByGw.has(worstGw.gameweek)
      ? `GW average was ${avgScoreByGw.get(worstGw.gameweek)} pts`
      : undefined,
    emoji: '😱',
  };

  // --- Slide 4: Captain's Log ---
  const captainPicks = picks.filter((p) => p.is_captain);
  const uniqueCaptainGws = Array.from(new Set(captainPicks.map((p) => p.gameweek)));
  const totalCaptainPoints = history.reduce((sum, gw) => {
    const captainPick = captainPicks.find((p) => p.gameweek === gw.gameweek);
    if (!captainPick) return sum;
    // Approximate: captain points counted at 2x (or 3x for TC), so extract raw
    // We don't have individual player stats, so we track multiplier
    return sum + (captainPick.multiplier > 1 ? captainPick.multiplier : 2);
  }, 0);

  // Better captain points approximation: we can't get individual player points
  // without the player_stats table, so we just note the number of GWs captained
  const captainGwCount = uniqueCaptainGws.length;
  const captainRate =
    history.length > 0 ? Math.round((captainGwCount / history.length) * 100) : 0;

  const slide4: WrappedSlide = {
    id: 'captains-log',
    type: 'stat',
    headline: "Captain's Log",
    stat: `${captainGwCount} GWs captained`,
    substat: `${captainRate}% captain consistency`,
    comparison: totalCaptainPoints > 0 ? `Captaincy multiplier used ${captainGwCount} times` : undefined,
    emoji: '🅲',
  };

  // --- Slide 5: Transfer Window ---
  const totalTransfers = transfers.length;
  const totalHitGws = history.filter((gw) => gw.event_transfers_cost > 0);
  const totalHits = totalHitGws.reduce(
    (sum, gw) => sum + gw.event_transfers_cost / 4,
    0
  );
  const totalHitPoints = totalHitGws.reduce(
    (sum, gw) => sum + gw.event_transfers_cost,
    0
  );

  const slide5: WrappedSlide = {
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

  // --- Slide 6: Bench Heartbreak ---
  const totalBenchPoints = history.reduce(
    (sum, gw) => sum + (gw.points_on_bench ?? 0),
    0
  );
  const worstBenchGw = history.reduce(
    (worst, gw) =>
      (gw.points_on_bench ?? 0) > ((worst?.points_on_bench ?? 0))
        ? gw
        : worst,
    history[0]
  );

  const slide6: WrappedSlide = {
    id: 'bench-heartbreak',
    type: 'stat',
    headline: 'Bench Heartbreak',
    stat: `${totalBenchPoints} pts on bench`,
    substat: `Worst GW: ${worstBenchGw?.points_on_bench ?? 0} pts (GW${worstBenchGw?.gameweek ?? '?'})`,
    comparison: totalBenchPoints > 0 ? `That could have been ${Math.round(totalBenchPoints / (history.length || 1))} extra pts per GW` : undefined,
    emoji: '😢',
  };

  // --- Slide 7: FPL Personality ---
  const { personality, description, emoji } = derivePersonality(data);

  const slide7: WrappedSlide = {
    id: 'fpl-personality',
    type: 'personality',
    headline: 'Your FPL Personality',
    personality,
    description,
    emoji,
  };

  // --- Slide 8: That's a Wrap ---
  const slide8: WrappedSlide = {
    id: 'thats-a-wrap',
    type: 'cta',
    headline: "That's a Wrap!",
    substat: manager.team_name,
    description: `${overallRank.toLocaleString()} overall rank · ${totalPoints.toLocaleString()} pts`,
    emoji: '🎁',
  };

  return [slide1, slide2, slide3, slide4, slide5, slide6, slide7, slide8];
}
