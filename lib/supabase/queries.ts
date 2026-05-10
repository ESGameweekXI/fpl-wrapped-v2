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

  return {
    manager: managerRes.data as ManagerRow,
    history: (historyRes.data ?? []) as HistoryRow[],
    picks: (picksRes.data ?? []) as PickRow[],
    transfers: (transfersRes.data ?? []) as TransferRow[],
    gameweeks: (gameweeksRes.data ?? []) as GameweekRow[],
  };
}
