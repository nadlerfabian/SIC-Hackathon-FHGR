import { getMatchView } from '@/lib/match-data';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  const stage = Number(new URL(request.url).searchParams.get('stage') || 0);
  if (!Number.isInteger(stage) || stage < 0 || stage > 6) return Response.json({ error: 'Invalid demo stage' }, { status: 400 });
  return Response.json(getMatchView(stage), { headers: { 'Cache-Control': 'no-store' } });
}
