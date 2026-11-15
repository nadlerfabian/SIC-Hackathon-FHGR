// Optional inbound downloads from verified public roster/profile sources.
// No confidential match data is read or transmitted.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
await mkdir('public/players', { recursive: true });
const roster = JSON.parse(await readFile('lib/roster.json', 'utf8'));
const portraits = [
  ['davos-19', 'https://assets.leaguestat.com/hockeycanada/375x500/15475.jpg'],
  ['us-13', 'https://dxbhsrqyrr690.cloudfront.net/sidearm.nextgen.sites/mgoblue.com/images/2025/8/30/Hughes_TJ.jpg'],
];
const collegeProfiles = [
  ['us-18', 'aiden-fink'], ['us-5', 'mac-gadowsky'], ['us-14', 'matt-dimarsico'], ['us-15', 'charlie-cerrato'], ['us-86', 'jj-wiebusch'],
];
for (const [id, slug] of collegeProfiles) {
  try {
    const page = await fetch('https://gopsusports.com/sports/mens-ice-hockey/roster/season/2025-26/player/' + slug);
    if (!page.ok) continue;
    const html = await page.text();
    // The university marks the player headshot explicitly as roster-bio-photo.
    const imageTag = html.match(/<img[^>]+class="[^"]*roster-bio-photo__image[^>]*>/)?.[0];
    const url = imageTag?.match(/\burl="([^"]+)"/)?.[1];
    if (url) portraits.push([id, url.replaceAll('&amp;', '&')]);
  } catch { console.warn('Profile unavailable:', id); }
}
for (const [id, url] of portraits) {
  try {
    const response = await fetch(url);
    if (!response.ok || !response.headers.get('content-type')?.startsWith('image/')) throw new Error(String(response.status));
    await writeFile('public/players/' + id + '.jpg', Buffer.from(await response.arrayBuffer()));
    const player = roster.find(p => p.team + '-' + p.jersey === id);
    if (player) { player.photo = '/players/' + id + '.jpg'; player.photoSource = url; }
    console.log('Portrait saved:', id);
  } catch { console.warn('Portrait unavailable; keeping jersey fallback:', id); }
}
await writeFile('lib/roster.json', JSON.stringify(roster, null, 2) + '\n');
