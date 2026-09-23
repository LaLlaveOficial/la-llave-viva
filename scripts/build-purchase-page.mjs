import { readFile, writeFile } from 'node:fs/promises';

// Reuse the built application and tracking scripts, changing only route metadata.
const source = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8');
const canonical = /<link\b[^>]*rel="canonical"[^>]*>/g;
const matches = source.match(canonical) || [];
if (matches.length !== 1) throw new Error('Expected exactly one canonical in built index.html');
const purchase = source
  .replace(canonical, '<link rel="canonical" href="https://www.lallaveoficial.com/comprar" />')
  .replace(/(<meta\b[^>]*property="og:url"[^>]*content=")[^"]*(")/, '$1https://www.lallaveoficial.com/comprar$2');
await writeFile(new URL('../dist/comprar.html', import.meta.url), purchase);
