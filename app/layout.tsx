import type { Metadata, Viewport } from 'next';
import './globals.css';
import './site.css';
import './replay.css';
import './davos.css';
import './mobile-pages.css';
export const metadata: Metadata = { title: 'Spengler Picks', description: 'Player and team predictions, match statistics and results for the Spengler Cup.' };
export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#041a32' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
