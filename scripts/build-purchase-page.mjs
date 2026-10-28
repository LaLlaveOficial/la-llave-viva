import { readFile, writeFile } from 'node:fs/promises';

// Show the same offer in the initial response and in the interactive page.
// React replaces this initial content; the established payment flow is retained.
const source = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8');
const salesSource = await readFile(new URL('../public/purchase-trust.js', import.meta.url), 'utf8');
const canonical = /<link\b[^>]*rel="canonical"[^>]*>/g;
if ((source.match(canonical) || []).length !== 1) throw new Error('Expected one canonical');
const styleTemplate = salesSource.match(/style\.textContent = `([\s\S]*?)`;/)?.[1];
const salesTemplate = salesSource.match(/function createSalesLanding\(\)[\s\S]*?block\.innerHTML = `([\s\S]*?)`;/)?.[1];
if (!styleTemplate || !salesTemplate) throw new Error('Purchase sales template not found');
const ids = {
  SALES_ID: 'purchase-sales-066', TRUST_ID: 'purchase-trust-066',
  CHECKOUT_HEADING_ID: 'purchase-checkout-heading-066',
  INTERNATIONAL_DIALOG_ID: 'purchase-international-066',
  HOMEPAGE_INTERNATIONAL_ID: 'homepage-international-066',
};
const css = styleTemplate.replace(/\$\{(\w+)\}/g, (_, key) => {
  if (!(key in ids)) throw new Error(`Unknown style token: ${key}`);
  return ids[key];
});
if (salesTemplate.includes('${')) throw new Error('Sales template requires explicit rendering');
// Do not offer inert buttons or a form without payment and analytics handlers.
const initialSales = salesTemplate
  .replace(/<button\b[\s\S]*?<\/button>/g, '')
  .replace(/<div class="ps-international">[\s\S]*?<\/div>/, '');
const initialContent = `<main id="purchase-initial-content" style="max-width:1312px;margin:24px auto;padding:0 12px">
  <div id="purchase-sales-066">${initialSales}</div>
  <p role="status" style="color:#f3efe4;text-align:center">Preparando el formulario de compra segura…</p>
  <noscript><p style="color:#f3efe4;text-align:center">Activa JavaScript para comprar mediante Mercado Pago, o escríbenos a <a style="color:#f1c15a" href="mailto:contacto@lallaveoficial.com">contacto@lallaveoficial.com</a>.</p></noscript>
</main>`;
const description = 'Compra La Llave I: Ciudad Central, novela chilena de suspenso, misterio y distopía. Libro físico $15.990 + envío a todo Chile. Pago con Mercado Pago.';
const title = 'Comprar La Llave I: Ciudad Central | Suspenso chileno';
const purchase = source
  .replace('<html lang="es">', '<html lang="es" class="llave-dedicated-purchase">')
  .replace(canonical, '<link rel="canonical" href="https://www.lallaveoficial.com/comprar" />')
  .replace(/<title>[\s\S]*?<\/title>/, `<title>${title}</title>`)
  .replace(/(<meta\b[^>]*name="description"[^>]*content=")[^"]*(")/, (_, prefix, suffix) => prefix + description + suffix)
  .replace(/(<meta\b[^>]*(?:property="og:description"|name="twitter:description")[^>]*content=")[^"]*(")/g, (_, prefix, suffix) => prefix + description + suffix)
  .replace(/(<meta\b[^>]*(?:property="og:title"|name="twitter:title")[^>]*content=")[^"]*(")/g, (_, prefix, suffix) => prefix + title + suffix)
  .replace(/(<meta\b[^>]*property="og:url"[^>]*content=")[^"]*(")/, '$1https://www.lallaveoficial.com/comprar$2')
  .replace('</head>', `<link rel="preload" as="image" href="/assets/la-llave-edicion-fisica.png" fetchpriority="high" /><style id="purchase-initial-style">body{margin:0;background:#020303}${css}</style></head>`)
  .replace('<div id="root"></div>', `<div id="root">${initialContent}</div>`);
if (!purchase.includes(initialContent)) throw new Error('Initial purchase content was not inserted');
await writeFile(new URL('../dist/comprar.html', import.meta.url), purchase);
