import type { Metadata, Viewport } from 'next';
import './globals.css';
import './site.css';
import './replay.css';
import './davos.css';
import './mobile-pages.css';
export const metadata: Metadata = { title: 'Spengler Picks — Read the game', description: 'Make your picks. Follow every period. Discover the performances behind the game.' };
export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#041a32' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
