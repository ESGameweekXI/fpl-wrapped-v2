import { createServerClient } from './server-client';

export interface ManagerRow {
  id: number;
  team_name: string;
  player_first_name: string;
  player_last_name: string;
  summary_overall_points: number;
  summary_overall_rank: number;
}

export interface HistoryRow {
  manager_id: number;
  gameweek: number;
  points: number;
  total_points: number;
  rank: number;
  overall_rank: number;
  event_transfers: number;
  event_transfers_cost: number;
  points_on_bench: number;
}

export interface PickRow {
  manager_id: number;
  gameweek: number;
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

export interface ManagerData {
  manager: ManagerRow;
  history: HistoryRow[];
  picks: PickRow[];
  transfers: TransferRow[];
  gameweeks: GameweekRow[];
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
        .order('gameweek', { ascending: true }),
      db
        .from('manager_picks')
        .select('*')
        .eq('manager_id', teamId)
        .order('gameweek', { ascending: true }),
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

  // Normalise manager — numeric fields from Supabase may be null
  const raw = managerRes.data as Record<string, unknown>;
  const manager: ManagerRow = {
    id: n(raw.id) || teamId,
    team_name: s(raw.team_name, 'Unknown Team'),
    player_first_name: s(raw.player_first_name),
    player_last_name: s(raw.player_last_name),
    summary_overall_points: n(raw.summary_overall_points),
    summary_overall_rank: n(raw.summary_overall_rank),
  };

  // Normalise history rows — all numeric fields default to 0
  const history: HistoryRow[] = ((historyRes.data ?? []) as Record<string, unknown>[]).map(
    (row) => ({
      manager_id: n(row.manager_id) || teamId,
      gameweek: n(row.gameweek),
      points: n(row.points),
      total_points: n(row.total_points),
      rank: n(row.rank),
      overall_rank: n(row.overall_rank),
      event_transfers: n(row.event_transfers),
      event_transfers_cost: n(row.event_transfers_cost),
      points_on_bench: n(row.points_on_bench),
    })
  );

  // Normalise picks
  const picks: PickRow[] = ((picksRes.data ?? []) as Record<string, unknown>[]).map((row) => ({
    manager_id: n(row.manager_id) || teamId,
    gameweek: n(row.gameweek),
    element: n(row.element),
    position: n(row.position),
    multiplier: n(row.multiplier),
    is_captain: Boolean(row.is_captain),
    is_vice_captain: Boolean(row.is_vice_captain),
  }));

  // Normalise transfers
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

  // Normalise gameweeks
  const gameweeks: GameweekRow[] = ((gameweeksRes.data ?? []) as Record<string, unknown>[]).map(
    (row) => ({
      id: n(row.id),
      name: s(row.name),
      average_entry_score: n(row.average_entry_score),
    })
  );

  return { manager, history, picks, transfers, gameweeks };
}
