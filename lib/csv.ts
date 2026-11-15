// RFC 4180-style parsing, including quoted coordinate pairs and CRLF files.
export function parseCsv(input: string): Record<string, string>[] {
  const lines: string[][] = []; let row: string[] = []; let field = ''; let quoted = false;
  const source = input.replace(/^\uFEFF/, '');
  for (let i = 0; i < source.length; i++) {
    const char = source[i];
    if (char === '"') {
      if (quoted && source[i + 1] === '"') { field += '"'; i++; } else quoted = !quoted;
    } else if (char === ',' && !quoted) { row.push(field); field = ''; }
    else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && source[i + 1] === '\n') i++;
      row.push(field); if (row.some(Boolean)) lines.push(row); row = []; field = '';
    } else field += char;
  }
  if (quoted) throw new Error('Unclosed CSV quote');
  if (field || row.length) { row.push(field); lines.push(row); }
  const headers = lines.shift() || [];
  return lines.map((values, index) => {
    if (values.length !== headers.length) throw new Error('CSV row ' + (index + 2) + ' has an unexpected number of fields');
    return Object.fromEntries(headers.map((header, i) => [header, values[i]]));
  });
}
