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
function withPageMetadata({ path, title, description }) {
  const url = `https://www.lallaveoficial.com${path}`;
  return source
    .replace(canonical, `<link rel="canonical" href="${url}" />`)
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${title}</title>`)
    .replace(/(<meta\b[^>]*(?:name="description"|property="og:description"|name="twitter:description")[^>]*content=")[^"]*(")/g, (_, prefix, suffix) => prefix + description + suffix)
    .replace(/(<meta\b[^>]*(?:property="og:title"|name="twitter:title")[^>]*content=")[^"]*(")/g, (_, prefix, suffix) => prefix + title + suffix)
    .replace(/(<meta\b[^>]*property="og:url"[^>]*content=")[^"]*(")/, (_, prefix, suffix) => prefix + url + suffix);
}

const purchase = withPageMetadata({ path: '/comprar', title, description })
  .replace('<html lang="es">', '<html lang="es" class="llave-dedicated-purchase">')
  .replace('</head>', `<link rel="preload" as="image" href="/assets/la-llave-edicion-fisica.png" fetchpriority="high" /><style id="purchase-initial-style">body{margin:0;background:#020303}${css}</style></head>`)
  .replace('<div id="root"></div>', `<div id="root">${initialContent}</div>`);
if (!purchase.includes(initialContent)) throw new Error('Initial purchase content was not inserted');
await writeFile(new URL('../dist/comprar.html', import.meta.url), purchase);

const homepage = `<main id="homepage-initial-content" style="max-width:48rem;margin:3rem auto;padding:0 1rem;color:#f3efe4">
  <h1>La Llave I: Ciudad Central</h1>
  <p>Una novela chilena de suspenso y distopía de Enrique G. Santibañez.</p>
  <p>Cuando Paula Garrido desaparece tras filtrar un video prohibido, su hermano Issei y la detective Karen Ajraz investigan en una ciudad que vigila, castiga y borra.</p>
  <p>La primera edición impresa se vende directamente en Chile. La novela también está disponible en Kindle.</p>
  <p><a style="color:#f1c15a" href="/comprar">Comprar el libro La Llave I: Ciudad Central</a></p>
  <p><a style="color:#f1c15a" href="/press-kit">Kit de prensa de La Llave</a></p>
</main>`;
const initialHomepage = source.replace('<div id="root"></div>', `<div id="root">${homepage}</div>`);
if (!initialHomepage.includes(homepage)) throw new Error('Initial homepage content was not inserted');

const pressContent = `<main id="press-kit-initial-content" style="max-width:48rem;margin:3rem auto;padding:0 1rem;color:#f3efe4">
  <h1>La Llave I: Ciudad Central</h1>
  <p>Kit de prensa oficial de la novela de Enrique G. Santibañez.</p>
  <p>Sinopsis, ficha del libro y materiales para entrevistas, reseñas y notas de prensa.</p>
  <p><a style="color:#f1c15a" href="mailto:contacto@lallaveoficial.com">Solicitar material de prensa o una copia de reseña</a></p>
  <p><a style="color:#f1c15a" href="/">Volver a la web oficial</a></p>
</main>`;
const pressKit = withPageMetadata({
  path: '/press-kit',
  title: 'Kit de prensa | La Llave I: Ciudad Central',
  description: 'Kit de prensa de La Llave I: Ciudad Central. Sinopsis, ficha del libro, materiales oficiales y contacto para entrevistas y reseñas.',
}).replace('<div id="root"></div>', `<div id="root">${pressContent}</div>`);
if (!pressKit.includes(pressContent)) throw new Error('Initial press kit content was not inserted');
await writeFile(new URL('../dist/press-kit.html', import.meta.url), pressKit);

// Payment status pages are user-specific and should stay out of search.
const appShell = source
  .replace(canonical, '')
  .replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/, '')
  .replace('</head>', '<meta name="robots" content="noindex" /></head>');
await writeFile(new URL('../dist/app-shell.html', import.meta.url), appShell);
await writeFile(new URL('../dist/index.html', import.meta.url), initialHomepage);
