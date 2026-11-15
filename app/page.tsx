import PicksApp from '@/components/PicksApp';
import { getMatchView } from '@/lib/match-data';
export const dynamic = 'force-dynamic';
export default function Page() { return <PicksApp initialView={getMatchView(0)} />; }
