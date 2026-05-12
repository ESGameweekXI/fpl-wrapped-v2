import { createServerClient } from './server-client';

export interface ManagerRow {
  id: number;
  entry_name: string;
  player_name: string;
  // Derived from the last manager_history row (not stored on managers table)
  summary_overall_points: number;
  summary_overall_rank: number;
}

export interface HistoryRow {
  manager_id: number;
  event: number;
  points: number;
  total_points: number;
  rank: number;
  overall_rank: number;
  // These columns may not exist in the schema; will normalise to 0 if absent
  event_transfers_cost: number;
  points_on_bench: number;
}

export interface PickRow {
  manager_id: number;
  event: number;
  element: number;
  position: number;
  multiplier: number;
  is_captain: boolean;
  is_vice_captain: boolean;
}

export interface TransferRow {
  manager_id: number;
  element_in: number;
  element_out: number;
  event: number;
  time: string;
  element_in_cost: number;
  element_out_cost: number;
}

export interface GameweekRow {
  id: number;
  name: string;
  average_entry_score: number;
}

export interface CaptainStatRow {
  player_id: number;
  event: number;
  total_points: number;
  minutes: number;
}

export interface ManagerData {
  manager: ManagerRow;
  history: HistoryRow[];
  picks: PickRow[];
  transfers: TransferRow[];
  gameweeks: GameweekRow[];
  captainStats: CaptainStatRow[];
  captainNames: Record<number, string>;
  transferStats: CaptainStatRow[];
  transferPlayerNames: Record<number, string>;
}

// Supabase returns null for any column that has no value, even when our
// TypeScript types say number. These helpers coerce at the boundary.
function n(val: unknown): number {
  return typeof val === 'number' ? val : 0;
}

function s(val: unknown, fallback = ''): string {
  return typeof val === 'string' ? val : fallback;
}

export async function getManagerData(teamId: number): Promise<ManagerData | null> {
  const db = createServerClient();

  const [managerRes, historyRes, picksRes, transfersRes, gameweeksRes] =
    await Promise.all([
      db.from('managers').select('*').eq('id', teamId).single(),
      db
        .from('manager_history')
        .select('*')
        .eq('manager_id', teamId)
        .order('event', { ascending: true }),
      db
        .from('manager_picks')
        .select('*')
        .eq('manager_id', teamId)
        .order('event', { ascending: true }),
      db
        .from('manager_transfers')
        .select('*')
        .eq('manager_id', teamId)
        .order('event', { ascending: true }),
      db
        .from('gameweeks')
        .select('id, name, average_entry_score')
        .eq('finished', true)
        .order('id', { ascending: true }),
    ]);

  if (managerRes.error || !managerRes.data) return null;

  // Normalise history rows first so we can derive season totals for the manager row
  const history: HistoryRow[] = ((historyRes.data ?? []) as Record<string, unknown>[]).map(
    (row) => ({
      manager_id: n(row.manager_id) || teamId,
      event: n(row.event),
      points: n(row.points),
      total_points: n(row.total_points),
      rank: n(row.rank),
      overall_rank: n(row.overall_rank),
      // Columns absent from the schema will come back as undefined → 0
      event_transfers_cost: n(row.event_transfers_cost),
      points_on_bench: n(row.points_on_bench),
    })
  );

  // Derive overall season figures from the last (most recent) history entry
  const lastHistory = history[history.length - 1];

  const raw = managerRes.data as Record<string, unknown>;
  const manager: ManagerRow = {
    id: n(raw.id) || teamId,
    entry_name: s(raw.entry_name, 'Unknown Team'),
    player_name: s(raw.player_name),
    summary_overall_points: lastHistory?.total_points ?? 0,
    summary_overall_rank: lastHistory?.overall_rank ?? 0,
  };

  // Normalise picks
  const picks: PickRow[] = ((picksRes.data ?? []) as Record<string, unknown>[]).map((row) => ({
    manager_id: n(row.manager_id) || teamId,
    event: n(row.event),
    element: n(row.element),
    position: n(row.position),
    multiplier: n(row.multiplier),
    is_captain: Boolean(row.is_captain),
    is_vice_captain: Boolean(row.is_vice_captain),
  }));

  // Derive IDs needed for secondary queries from raw transfer data
  const rawTransferData = (transfersRes.data ?? []) as Record<string, unknown>[];
  const transferOutIds = [
    ...new Set(rawTransferData.map((r) => n(r.element_out)).filter((id) => id > 0)),
  ];
  const transferAllIds = [
    ...new Set(
      [
        ...rawTransferData.map((r) => n(r.element_out)),
        ...rawTransferData.map((r) => n(r.element_in)),
      ].filter((id) => id > 0)
    ),
  ];

  const captainIds = [
    ...new Set(
      picks.filter((p) => p.is_captain && p.element > 0).map((p) => p.element)
    ),
  ];

  // All four secondary queries run in parallel
  const noRows = { data: [], error: null };
  const [captainStatsRes, captainNamesRes, transferStatsRes, transferPlayerNamesRes] =
    await Promise.all([
      captainIds.length > 0
        ? db
            .from('player_gameweek_stats')
            .select('player_id, event, total_points, minutes')
            .in('player_id', captainIds)
        : noRows,
      captainIds.length > 0
        ? db.from('players').select('id, web_name').in('id', captainIds)
        : noRows,
      transferOutIds.length > 0
        ? db
            .from('player_gameweek_stats')
            .select('player_id, event, total_points, minutes')
            .in('player_id', transferOutIds)
        : noRows,
      transferAllIds.length > 0
        ? db.from('players').select('id, web_name').in('id', transferAllIds)
        : noRows,
    ]);

  const captainStats: CaptainStatRow[] = (
    (captainStatsRes.data ?? []) as Record<string, unknown>[]
  ).map((row) => ({
    player_id: n(row.player_id),
    event: n(row.event),
    total_points: n(row.total_points),
    minutes: n(row.minutes),
  }));

  const captainNames: Record<number, string> = Object.fromEntries(
    ((captainNamesRes.data ?? []) as Record<string, unknown>[]).map((row) => [
      n(row.id),
      s(row.web_name),
    ])
  );

  const transferStats: CaptainStatRow[] = (
    (transferStatsRes.data ?? []) as Record<string, unknown>[]
  ).map((row) => ({
    player_id: n(row.player_id),
    event: n(row.event),
    total_points: n(row.total_points),
    minutes: n(row.minutes),
  }));

  const transferPlayerNames: Record<number, string> = Object.fromEntries(
    ((transferPlayerNamesRes.data ?? []) as Record<string, unknown>[]).map((row) => [
      n(row.id),
      s(row.web_name),
    ])
  );

  const transfers: TransferRow[] = ((transfersRes.data ?? []) as Record<string, unknown>[]).map(
    (row) => ({
      manager_id: n(row.manager_id) || teamId,
      element_in: n(row.element_in),
      element_out: n(row.element_out),
      event: n(row.event),
      time: s(row.time),
      element_in_cost: n(row.element_in_cost),
      element_out_cost: n(row.element_out_cost),
    })
  );

  const gameweeks: GameweekRow[] = ((gameweeksRes.data ?? []) as Record<string, unknown>[]).map(
    (row) => ({
      id: n(row.id),
      name: s(row.name),
      average_entry_score: n(row.average_entry_score),
    })
  );

  return {
    manager,
    history,
    picks,
    transfers,
    gameweeks,
    captainStats,
    captainNames,
    transferStats,
    transferPlayerNames,
  };
}
