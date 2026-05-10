import { createServerClient } from './server-client';

const FPL_BASE = 'https://fantasy.premierleague.com/api';

const CHROME_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Accept: 'application/json, text/plain, */*',
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept-Encoding': 'gzip, deflate, br',
  Origin: 'https://fantasy.premierleague.com',
  Referer: 'https://fantasy.premierleague.com/',
};

async function fplFetch(path: string) {
  const res = await fetch(`${FPL_BASE}/${path}`, { headers: CHROME_HEADERS });
  if (!res.ok) throw new Error(`FPL API error ${res.status}: ${path}`);
  return res.json();
}

export async function syncManager(
  teamId: number,
  onProgress?: (msg: string) => void
) {
  const db = createServerClient();
  const log = (msg: string) => onProgress?.(msg);

  log('Fetching manager info...');
  const [entryData, historyData, transfersData, bootstrapData] =
    await Promise.all([
      fplFetch(`entry/${teamId}/`),
      fplFetch(`entry/${teamId}/history/`),
      fplFetch(`entry/${teamId}/transfers/`),
      fplFetch('bootstrap-static/'),
    ]);

  // Upsert manager
  log('Syncing manager...');
  await db.from('managers').upsert({
    id: teamId,
    team_name: entryData.name,
    player_first_name: entryData.player_first_name,
    player_last_name: entryData.player_last_name,
    summary_overall_points: entryData.summary_overall_points,
    summary_overall_rank: entryData.summary_overall_rank,
  });

  // Sync gameweek averages from bootstrap-static
  log('Syncing gameweek averages...');
  const gameweekUpserts = bootstrapData.events
    .filter((gw: { finished: boolean }) => gw.finished)
    .map((gw: { id: number; name: string; average_entry_score: number; deadline_time: string }) => ({
      id: gw.id,
      name: gw.name,
      average_entry_score: gw.average_entry_score,
      deadline_time: gw.deadline_time,
      finished: true,
    }));
  if (gameweekUpserts.length > 0) {
    await db.from('gameweeks').upsert(gameweekUpserts, { onConflict: 'id' });
  }

  // Sync manager history (current season)
  log('Syncing manager history...');
  const historyUpserts = historyData.current.map(
    (gw: {
      event: number;
      points: number;
      total_points: number;
      rank: number;
      overall_rank: number;
      bank: number;
      value: number;
      event_transfers: number;
      event_transfers_cost: number;
      points_on_bench: number;
    }) => ({
      manager_id: teamId,
      gameweek: gw.event,
      points: gw.points,
      total_points: gw.total_points,
      rank: gw.rank,
      overall_rank: gw.overall_rank,
      bank: gw.bank,
      value: gw.value,
      event_transfers: gw.event_transfers,
      event_transfers_cost: gw.event_transfers_cost,
      points_on_bench: gw.points_on_bench,
    })
  );
  if (historyUpserts.length > 0) {
    await db
      .from('manager_history')
      .upsert(historyUpserts, { onConflict: 'manager_id,gameweek' });
  }

  // Sync picks in batches
  log('Syncing manager picks...');
  const finishedGws: number[] = bootstrapData.events
    .filter((gw: { finished: boolean }) => gw.finished)
    .map((gw: { id: number }) => gw.id);

  const BATCH_SIZE = 5;
  for (let i = 0; i < finishedGws.length; i += BATCH_SIZE) {
    const batch = finishedGws.slice(i, i + BATCH_SIZE);
    const pickResults = await Promise.allSettled(
      batch.map((gw) => fplFetch(`entry/${teamId}/event/${gw}/picks/`))
    );

    const picksToUpsert: object[] = [];
    pickResults.forEach((result, idx) => {
      if (result.status === 'fulfilled') {
        const gw = batch[idx];
        const data = result.value;
        data.picks.forEach(
          (pick: {
            element: number;
            position: number;
            multiplier: number;
            is_captain: boolean;
            is_vice_captain: boolean;
          }) => {
            picksToUpsert.push({
              manager_id: teamId,
              gameweek: gw,
              element: pick.element,
              position: pick.position,
              multiplier: pick.multiplier,
              is_captain: pick.is_captain,
              is_vice_captain: pick.is_vice_captain,
            });
          }
        );
      }
    });

    if (picksToUpsert.length > 0) {
      await db
        .from('manager_picks')
        .upsert(picksToUpsert, { onConflict: 'manager_id,gameweek,element' });
    }
  }

  // Sync transfers
  log('Syncing manager transfers...');
  const transferUpserts = transfersData.map(
    (t: {
      element_in: number;
      element_out: number;
      entry: number;
      event: number;
      time: string;
      element_in_cost: number;
      element_out_cost: number;
    }) => ({
      manager_id: teamId,
      element_in: t.element_in,
      element_out: t.element_out,
      event: t.event,
      time: t.time,
      element_in_cost: t.element_in_cost,
      element_out_cost: t.element_out_cost,
    })
  );
  if (transferUpserts.length > 0) {
    await db
      .from('manager_transfers')
      .upsert(transferUpserts, {
        onConflict: 'manager_id,element_in,element_out,event',
      });
  }

  log('Sync complete.');
  return { entryData, historyData, bootstrapData };
}
