/* ==========================================================================
   vite-seo.js — small Vite plugin used by vite.config.js
   Set SITE_URL (e.g. in .env or your host's environment) to your public URL:
     SITE_URL=https://pankajsahu.dev
   and the build will:
     • add <link rel="canonical"> and og:url
     • make og:image / twitter:image absolute (LinkedIn & X require it)
     • write sitemap.xml and a robots.txt that points to it
   Without SITE_URL it only writes a plain robots.txt.
   ========================================================================== */
export function seoTags(html, site) {
  if (!site) return html;
  const url = site.replace(/\/+$/, '') + '/';
  return html
    .replace(/(<meta (?:property|name)="(?:og|twitter):image" content=")og\.png(")/g, `$1${url}og.png$2`)
    .replace('</head>', `  <link rel="canonical" href="${url}" />\n  <meta property="og:url" content="${url}" />\n</head>`);
}

export function robotsTxt(site) {
  const url = site ? site.replace(/\/+$/, '') + '/' : '';
  return `User-agent: *\nAllow: /\n${url ? `Sitemap: ${url}sitemap.xml\n` : ''}`;
}

export function sitemapXml(site, date = new Date()) {
  const url = site.replace(/\/+$/, '') + '/';
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>${url}</loc><lastmod>${date.toISOString().slice(0, 10)}</lastmod><changefreq>monthly</changefreq><priority>1.0</priority></url>\n</urlset>\n`;
}

export default function seo(siteUrl = '') {
  const site = (siteUrl || '').trim();
  return {
    name: 'pks-seo',
    transformIndexHtml: (html) => seoTags(html, site),
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'robots.txt', source: robotsTxt(site) });
      if (site) this.emitFile({ type: 'asset', fileName: 'sitemap.xml', source: sitemapXml(site) });
    },
  };
}
