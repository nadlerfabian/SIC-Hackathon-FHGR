import { notFound } from 'next/navigation';
import PicksApp from '@/components/PicksApp';
import { getMatchView } from '@/lib/match-data';
export const dynamic = 'force-dynamic';
export default async function Page({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  if (section !== 'picks' && section !== 'stats' && section !== 'progress') notFound();
  return <PicksApp key={section} initialView={getMatchView(0)} section={section}/>;
}
