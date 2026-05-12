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
  const {
    manager,
    history,
    picks,
    transfers,
    gameweeks,
    captainStats,
    captainNames,
    transferStats,
    transferPlayerNames,
  } = data;

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
  const captainGwCount = new Set(captainPicks.map((p) => p.event)).size;

  // Most captained player by count
  const captainFreq = new Map<number, number>();
  captainPicks.forEach((p) => captainFreq.set(p.element, (captainFreq.get(p.element) ?? 0) + 1));
  const mostCaptainedId = [...captainFreq.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 0;

  // Captain hits: GWs where the captain scored ≥ 4 points
  const captainStatsByEvent = new Map(
    captainStats.map((s) => [`${s.player_id}:${s.event}`, s.total_points])
  );
  const captainHits = captainPicks.filter((p) => {
    const pts = captainStatsByEvent.get(`${p.element}:${p.event}`) ?? 0;
    return pts >= 4;
  }).length;

  const captainHitRate =
    captainGwCount > 0 ? Math.round((captainHits / captainGwCount) * 100) : 0;

  const slide3: WrappedSlide = {
    id: 'captains-log',
    type: 'stat',
    headline: "Captain's Log",
    stat: `${captainHits} of ${captainGwCount} captains hit`,
    substat: mostCaptainedId > 0
      ? `Most captained: ${captainNames[mostCaptainedId] ?? `Player #${mostCaptainedId}`}`
      : undefined,
    comparison: `${captainHitRate}% hit rate`,
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

  // Biggest regret: sold player who scored the most after being permanently sold
  // Build a map of player_id → all their stats by event for quick lookup
  const transferStatsByPlayer = new Map<number, Map<number, number>>();
  for (const stat of transferStats) {
    if (!transferStatsByPlayer.has(stat.player_id)) {
      transferStatsByPlayer.set(stat.player_id, new Map());
    }
    transferStatsByPlayer.get(stat.player_id)!.set(stat.event, stat.total_points);
  }

  // For each unique sold player, find the last GW they were sold
  const lastSaleGw = new Map<number, number>();
  for (const t of transfers) {
    const current = lastSaleGw.get(t.element_out) ?? 0;
    if (t.event > current) lastSaleGw.set(t.element_out, t.event);
  }

  // Build set of (player_id, min_event) pairs where player was re-bought after last sale
  const reBoughtAfter = new Map<number, number>(); // player_id → earliest re-buy event
  for (const t of transfers) {
    const lastSold = lastSaleGw.get(t.element_in);
    if (lastSold !== undefined && t.event > lastSold) {
      const current = reBoughtAfter.get(t.element_in) ?? Infinity;
      if (t.event < current) reBoughtAfter.set(t.element_in, t.event);
    }
  }

  // Sum points after last sale for permanently sold players
  let regretPlayerId = 0;
  let regretPoints = 0;
  let regretSaleGw = 0;

  for (const [playerId, saleGw] of lastSaleGw.entries()) {
    if (reBoughtAfter.has(playerId)) continue; // re-bought — skip

    const statsByEvent = transferStatsByPlayer.get(playerId);
    if (!statsByEvent) continue;

    let ptsAfterSale = 0;
    for (const [event, pts] of statsByEvent.entries()) {
      if (event > saleGw) ptsAfterSale += pts;
    }

    if (ptsAfterSale > regretPoints) {
      regretPoints = ptsAfterSale;
      regretPlayerId = playerId;
      regretSaleGw = saleGw;
    }
  }

  const hasRegret = regretPlayerId > 0 && regretPoints > 0;
  const regretName = hasRegret
    ? (transferPlayerNames[regretPlayerId] ?? `Player #${regretPlayerId}`)
    : null;

  const slide4: WrappedSlide = {
    id: 'transfer-window',
    type: 'split',
    headline: 'Transfer Window',
    emoji: '🔄',
    topStat: `${totalTransfers} transfers`,
    topSubstat: totalHits > 0 ? `${totalHits} hits — −${totalHitPoints} pts` : 'No hits taken',
    topComparison: totalHits > 0 ? 'Each hit cost 4 pts' : 'Clean sheet all season',
    bottomStat: hasRegret ? `${fmt(regretPoints)} pts after you sold them` : 'No regrets',
    bottomSubstat: hasRegret && regretName ? `Biggest Regret: ${regretName}` : undefined,
    bottomComparison: hasRegret ? `Sold in GW${regretSaleGw} and never bought back` : undefined,
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
