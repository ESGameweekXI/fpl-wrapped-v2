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

  const { data: existing } = await db
    .from('managers')
    .select('updated_at')
    .eq('id', teamId)
    .maybeSingle(); // use maybeSingle() not single() — returns null instead of error when no row found

  const ageMs = existing?.updated_at
    ? Date.now() - new Date(existing.updated_at).getTime()
    : Infinity;

  const STALE_MS = 0; // force re-sync until kit URLs are confirmed correct — restore to 12 * 60 * 60 * 1000
  console.log('[sync] manager', teamId, '| age hours:', Math.round(ageMs / 3600000), '| stale:', ageMs >= STALE_MS);

  if (ageMs < STALE_MS) {
    log('Data is fresh, skipping sync.');
    return;
  }

  log('Fetching manager info...');
  const [entryData, historyData, transfersData, bootstrapData] =
    await Promise.all([
      fplFetch(`entry/${teamId}/`),
      fplFetch(`entry/${teamId}/history/`),
      fplFetch(`entry/${teamId}/transfers/`),
      fplFetch('bootstrap-static/'),
    ]);

  // Upsert manager — matches: id, entry_name, player_name, started_event, updated_at
  log('Syncing manager...');
  await db.from('managers').upsert({
    id: teamId,
    entry_name: entryData.name,
    player_name: `${entryData.player_first_name} ${entryData.player_last_name}`.trim(),
    started_event: entryData.started_event,
    updated_at: new Date().toISOString(),
  });

  // Sync players — matches: id, web_name, code
  log('Syncing players...');
  const playerUpserts = (bootstrapData.elements as {
    id: number;
    web_name: string;
    first_name: string;
    second_name: string;
    element_type: number;
    team: number;
    now_cost: number;
    total_points: number;
    status: string;
    code: number;
  }[]).map((el) => ({
    id: el.id,
    web_name: el.web_name,
    first_name: el.first_name,
    second_name: el.second_name,
    element_type: el.element_type,
    team_id: el.team,
    now_cost: el.now_cost,
    total_points: el.total_points,
    status: el.status,
    code: el.code,
    updated_at: new Date().toISOString(),
  }));
  console.log('[sync] first player code sample:', playerUpserts[0]);
  if (playerUpserts.length > 0) {
    await db.from('players').upsert(playerUpserts, { onConflict: 'id' });
  }

  // Sync teams — matches: id, name, short_name, code
  log('Syncing teams...');
  const teamUpserts = bootstrapData.teams.map((t: { id: number; name: string; short_name: string; code: number }) => ({
    id: t.id,
    name: t.name,
    short_name: t.short_name,
    code: t.code,
    updated_at: new Date().toISOString(),
  }));
  if (teamUpserts.length > 0) {
    await db.from('teams').upsert(teamUpserts, { onConflict: 'id' });
  }

  // Sync gameweek averages — matches: id, name, deadline_time, finished, is_current, is_next, average_entry_score, updated_at
  log('Syncing gameweek averages...');
  const gameweekUpserts = bootstrapData.events
    .filter((gw: { finished: boolean }) => gw.finished)
    .map((gw: {
      id: number;
      name: string;
      deadline_time: string;
      finished: boolean;
      is_current: boolean;
      is_next: boolean;
      average_entry_score: number;
    }) => ({
      id: gw.id,
      name: gw.name,
      deadline_time: gw.deadline_time,
      finished: gw.finished,
      is_current: gw.is_current,
      is_next: gw.is_next,
      average_entry_score: gw.average_entry_score,
      updated_at: new Date().toISOString(),
    }));
  if (gameweekUpserts.length > 0) {
    await db.from('gameweeks').upsert(gameweekUpserts, { onConflict: 'id' });
  }

  // Sync manager history — matches: manager_id, event, points, total_points, rank, overall_rank
  log('Syncing manager history...');
  const historyUpserts = historyData.current.map(
    (gw: {
      event: number;
      points: number;
      total_points: number;
      rank: number;
      overall_rank: number;
      event_transfers: number;
      event_transfers_cost: number;
      points_on_bench: number;
    }) => ({
      manager_id: teamId,
      event: gw.event,
      points: gw.points,
      total_points: gw.total_points,
      rank: gw.rank,
      overall_rank: gw.overall_rank,
      event_transfers: gw.event_transfers,
      event_transfers_cost: gw.event_transfers_cost,
      points_on_bench: gw.points_on_bench,
    })
  );
  if (historyUpserts.length > 0) {
    await db
      .from('manager_history')
      .upsert(historyUpserts, { onConflict: 'manager_id,event' });
  }

  // Sync picks in batches — matches: manager_id, event, element, position, multiplier, is_captain, is_vice_captain
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
              event: gw,
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
        .upsert(picksToUpsert, { onConflict: 'manager_id,event,element' });
    }
  }

  // Sync player gameweek stats — matches: player_id, event, total_points, minutes
  log('Syncing player gameweek stats...');
  for (let i = 0; i < finishedGws.length; i += BATCH_SIZE) {
    const batch = finishedGws.slice(i, i + BATCH_SIZE);
    const liveResults = await Promise.allSettled(
      batch.map((gw) => fplFetch(`event/${gw}/live/`))
    );

    const statsToUpsert: object[] = [];
    liveResults.forEach((result, idx) => {
      if (result.status === 'fulfilled') {
        const gw = batch[idx];
        const elements: { id: number; stats: { total_points: number; minutes: number } }[] =
          result.value.elements ?? [];
        elements.forEach((el) => {
          statsToUpsert.push({
            player_id: el.id,
            event: gw,
            total_points: el.stats.total_points ?? 0,
            minutes: el.stats.minutes ?? 0,
          });
        });
      }
    });

    if (statsToUpsert.length > 0) {
      await db
        .from('player_gameweek_stats')
        .upsert(statsToUpsert, { onConflict: 'player_id,event' });
    }
  }

  // Sync transfers — matches: manager_id, event, element_in, element_in_cost, element_out, element_out_cost, time
  log('Syncing manager transfers...');
  const transferUpserts = transfersData.map(
    (t: {
      element_in: number;
      element_out: number;
      event: number;
      time: string;
      element_in_cost: number;
      element_out_cost: number;
    }) => ({
      manager_id: teamId,
      event: t.event,
      element_in: t.element_in,
      element_in_cost: t.element_in_cost,
      element_out: t.element_out,
      element_out_cost: t.element_out_cost,
      time: t.time,
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
