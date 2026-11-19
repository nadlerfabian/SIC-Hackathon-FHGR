import { getMatchData } from '@/lib/match-data';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  try {
    const data = getMatchData();
    if (!data.players.length || !data.eventCount) throw new Error('No match data.');
    return Response.json({ status: 'ok' }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return Response.json({ status: 'unavailable' }, {
      status: 503, headers: { 'Cache-Control': 'no-store' },
    });
  }
}
