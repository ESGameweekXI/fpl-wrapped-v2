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
  earnedStat?: string;
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

interface PersonalityParams {
  captainNames: Record<number, string>;
  mostCaptainedId: number;
  mostCaptainedCount: number;
  captainGwCount: number;
  totalTransfers: number;
  totalHits: number;
  totalBenchPoints: number;
  overallRank: number;
  totalPoints: number;
  historyLength: number;
}

interface PersonalityResult {
  personality: string;
  description: string;
  emoji: string;
  earnedStat: string;
}

function derivePersonality(p: PersonalityParams): PersonalityResult {
  const {
    totalTransfers,
    totalHits,
    totalBenchPoints,
    overallRank,
    totalPoints,
  } = p;

  // 1. Panic Buyer — most distinctive, check first
  if (totalHits > 5) {
    return {
      personality: 'The Panic Buyer',
      description:
        "The transfer window was your happy place. While others held firm, you were never more than one bad week away from a knee-jerk reaction.",
      emoji: '🛒',
      earnedStat: `${totalHits} hits taken this season`,
    };
  }

  // 2. Loyalist
  if (totalTransfers <= 20) {
    return {
      personality: 'The Loyalist',
      description:
        "You picked your squad and stuck with it. While others were panic buying, you trusted the process all season long.",
      emoji: '🛡️',
      earnedStat: `Just ${totalTransfers} transfers all season`,
    };
  }

  // 3. Unlucky One — big bench haul but bad rank
  if (totalBenchPoints > 120 && overallRank > 2_000_000) {
    return {
      personality: 'The Unlucky One',
      description:
        "The numbers don't lie — your bench cost you this season. You made good calls, they just didn't land.",
      emoji: '😤',
      earnedStat: `${fmt(totalBenchPoints)} pts rotting on your bench all season`,
    };
  }

  // 5. Entertainer — chaotic all-round
  if (totalHits > 2 && totalTransfers > 40 && totalBenchPoints > 80) {
    return {
      personality: 'The Entertainer',
      description:
        "Every week was an adventure. Your FPL season was chaotic, expensive, and honestly — kind of fun to watch.",
      emoji: '🎪',
      earnedStat: `${totalTransfers} transfers, ${totalHits} hits, ${fmt(totalBenchPoints)} bench pts — never a dull week`,
    };
  }

  // 6. Optimizer — disciplined and ranked well
  if (totalHits <= 2 && totalTransfers <= 25 && overallRank > 0 && overallRank < 1_000_000) {
    return {
      personality: 'The Optimizer',
      description:
        "Calm, calculated, consistent. You didn't chase the game — you let it come to you.",
      emoji: '📈',
      earnedStat: `${topPercent(overallRank)} globally with just ${totalTransfers} transfers`,
    };
  }

  // 7. Steady Hand — default
  return {
    personality: 'The Steady Hand',
    description:
      "Solid, sensible, reliable. You won't win the league on style points — but you're still standing at the end of a long season.",
    emoji: '⚖️',
    earnedStat: `${fmt(totalPoints)} pts · Rank ${overallRank > 0 ? overallRank.toLocaleString() : '—'}`,
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
    benchStats,
    benchPlayerNames,
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

  // --- Slide 3: Rank Rollercoaster (omitted if < 2 GWs of history) ---
  // history is already sorted ascending by event from the query
  let slideRank: WrappedSlide | null = null;

  if (history.length >= 2) {
    let biggestClimb = 0;
    let biggestClimbGw = 0;
    let biggestClimbBefore = 0;
    let biggestClimbAfter = 0;

    let biggestFall = 0;
    let biggestFallGw = 0;
    let biggestFallBefore = 0;
    let biggestFallAfter = 0;

    for (let i = 1; i < history.length; i++) {
      const prev = history[i - 1];
      const curr = history[i];
      // positive rankChange = rank number fell = climbed in standings
      const rankChange = (prev.overall_rank ?? 0) - (curr.overall_rank ?? 0);

      if (rankChange > biggestClimb) {
        biggestClimb = rankChange;
        biggestClimbGw = curr.event;
        biggestClimbBefore = prev.overall_rank ?? 0;
        biggestClimbAfter = curr.overall_rank ?? 0;
      }
      if (-rankChange > biggestFall) {
        biggestFall = -rankChange;
        biggestFallGw = curr.event;
        biggestFallBefore = prev.overall_rank ?? 0;
        biggestFallAfter = curr.overall_rank ?? 0;
      }
    }

    slideRank = {
      id: 'rank-rollercoaster',
      type: 'split',
      headline: 'Your Rank Rollercoaster',
      emoji: '📈',
      topStat: `▲ ${biggestClimb.toLocaleString()} places`,
      topSubstat: `Biggest climb — Gameweek ${biggestClimbGw}`,
      topComparison: biggestClimb > 0
        ? `From ${biggestClimbBefore.toLocaleString()} to ${biggestClimbAfter.toLocaleString()}`
        : undefined,
      bottomStat: `▼ ${biggestFall.toLocaleString()} places`,
      bottomSubstat: `Biggest fall — Gameweek ${biggestFallGw}`,
      bottomComparison: biggestFall > 0
        ? `From ${biggestFallBefore.toLocaleString()} to ${biggestFallAfter.toLocaleString()}`
        : undefined,
    };
  }

  // --- Slide 4: Captain's Log ---
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
  // Build a lookup: player_id:event → total_points from benchStats
  const benchStatsByKey = new Map(
    benchStats.map((s) => [`${s.player_id}:${s.event}`, s.total_points])
  );

  // Bench picks = positions 12-15
  const benchPicks = picks.filter((p) => p.position >= 12 && p.position <= 15);

  // Total bench points and hit count (scored ≥ 4)
  let totalBenchPoints = 0;
  let benchHits = 0;
  const benchTotalByPlayer = new Map<number, number>();

  for (const pick of benchPicks) {
    const pts = benchStatsByKey.get(`${pick.element}:${pick.event}`) ?? 0;
    totalBenchPoints += pts;
    if (pts >= 4) benchHits++;
    benchTotalByPlayer.set(pick.element, (benchTotalByPlayer.get(pick.element) ?? 0) + pts);
  }

  // Most costly bench player
  let biggestWasteId = 0;
  let biggestWastePts = 0;
  for (const [playerId, pts] of benchTotalByPlayer.entries()) {
    if (pts > biggestWastePts) {
      biggestWastePts = pts;
      biggestWasteId = playerId;
    }
  }

  const hasBenchWaste = biggestWasteId > 0 && biggestWastePts > 0;
  const biggestWasteName = hasBenchWaste
    ? (benchPlayerNames[biggestWasteId] ?? `Player #${biggestWasteId}`)
    : null;

  const slide5: WrappedSlide = {
    id: 'bench-heartbreak',
    type: 'split',
    headline: 'Bench Heartbreak',
    emoji: '😢',
    topStat: `${fmt(totalBenchPoints)} pts left on bench all season`,
    topSubstat: `${benchHits} times a benched player scored 4+`,
    topComparison: 'Points you\'ll never get back',
    bottomStat: hasBenchWaste ? `${fmt(biggestWastePts)} pts` : 'No regrets',
    bottomSubstat: hasBenchWaste && biggestWasteName
      ? `Biggest waste: ${biggestWasteName}`
      : undefined,
    bottomComparison: hasBenchWaste
      ? `Scored ${fmt(biggestWastePts)} pts while sitting on your bench`
      : undefined,
  };

  // --- Slide 6: FPL Personality ---
  const mostCaptainedCount = captainFreq.get(mostCaptainedId) ?? 0;
  const { personality, description, emoji, earnedStat } = derivePersonality({
    captainNames,
    mostCaptainedId,
    mostCaptainedCount,
    captainGwCount,
    totalTransfers,
    totalHits,
    totalBenchPoints,
    overallRank,
    totalPoints,
    historyLength: history.length,
  });

  const slide6: WrappedSlide = {
    id: 'fpl-personality',
    type: 'personality',
    headline: 'Your FPL Personality',
    personality,
    description,
    earnedStat,
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

  return [
    slide1,
    slide2,
    ...(slideRank ? [slideRank] : []),
    slide3,
    slide4,
    slide5,
    slide6,
    slide7,
  ];
}
