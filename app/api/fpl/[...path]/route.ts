import { NextRequest } from 'next/server';

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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const fplPath = path.join('/');
  const { searchParams } = new URL(request.url);
  const queryString = searchParams.toString();
  const url = `${FPL_BASE}/${fplPath}/${queryString ? `?${queryString}` : ''}`;

  try {
    const res = await fetch(url, { headers: CHROME_HEADERS });
    const data = await res.json();
    return Response.json(data, { status: res.status });
  } catch {
    return Response.json({ error: 'FPL API request failed' }, { status: 502 });
  }
}
