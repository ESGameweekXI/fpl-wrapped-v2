import { NextRequest } from 'next/server';
import { syncManager } from '@/lib/supabase/sync';
import { getManagerData } from '@/lib/supabase/queries';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const teamIdStr = searchParams.get('teamId');

  if (!teamIdStr || isNaN(Number(teamIdStr))) {
    return Response.json({ error: 'Invalid teamId' }, { status: 400 });
  }

  const teamId = Number(teamIdStr);

  try {
    await syncManager(teamId);
    const data = await getManagerData(teamId);

    if (!data) {
      return Response.json({ error: 'Manager not found' }, { status: 404 });
    }

    return Response.json(data);
  } catch (err) {
    console.error('wrapped-data error:', err);
    return Response.json({ error: 'Failed to fetch wrapped data' }, { status: 500 });
  }
}
