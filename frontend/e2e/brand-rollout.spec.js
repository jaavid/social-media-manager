import { test, expect } from '@playwright/test';
test.use({ trace: 'off', screenshot: 'off', video: 'off' });
const base = process.env.E2E_BASE_URL || 'http://127.0.0.1:3000';
async function fixture(page, locale, preference) {
  await page.context().addCookies([{ name: 'socialstats.language', value: locale, url: base }, { name: 'theme', value: preference, url: base }]);
  await page.addInitScript(language => { localStorage.setItem('socialstats.language', language); localStorage.setItem('socialstats_cookie_choice', JSON.stringify({ version: '2024-11-01', choices: { essential: true, functional: true } })); }, locale);
  await page.routeWebSocket('**/ws/**', socket => socket.close());
  await page.route('**/api/**', route => {
    const path = new URL(route.request().url()).pathname;
    return route.fulfill({ json: path === '/api/auth/session/' ? { authenticated: true, csrfToken: 'fixture' } : path === '/api/auth/me/' ? { id: 1, role: 'staff', account_type: 'legacy', name: 'Fixture', permissions: {} } : path === '/api/profile/' ? { id: 1, first_name: 'Fixture', last_name: 'User', avatar: null, email: 'fixture@example.test' } : [] });
  });
}
function contrast(a, b) {
  const luminance = hex => { const rgb = hex.trim().replace('#', '').match(/../g).map(v => parseInt(v, 16) / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4); return rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722; };
  const first = luminance(a), second = luminance(b); return (Math.max(first, second) + .05) / (Math.min(first, second) + .05);
}
for (const locale of ['fa', 'en']) for (const theme of ['light', 'dark']) for (const width of [360, 768, 1440]) test(`brand ${locale} ${theme} ${width}`, async ({ page }) => {
  await fixture(page, locale, theme); await page.setViewportSize({ width, height: 900 }); await page.goto('/admin/account-settings');
  await expect(page.locator('html')).toHaveAttribute('lang', locale); await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
  await expect(page.locator('main').getByRole('heading', { name: locale === 'fa' ? 'تنظیمات' : 'Settings', exact: true })).toBeVisible();
  if (process.env.E2E_UI_BASELINE) { await page.screenshot({path:`e2e/evidence/brand/before-${locale}-${theme}-${width}.png`,fullPage:true}); return; }
  expect(await page.locator('body').innerText()).not.toMatch(/Social\s?Stats/i);
  const tokens = await page.evaluate(() => Object.fromEntries(['--text-primary','--text-secondary','--surface-card','--brand-primary','--text-on-brand','--border-focus','--surface-page','--brand-primary-hover','--brand-primary-active'].map(key => [key, getComputedStyle(document.documentElement).getPropertyValue(key).trim()])));
  expect(contrast(tokens['--text-primary'], tokens['--surface-card'])).toBeGreaterThanOrEqual(4.5);
  expect(contrast(tokens['--text-secondary'], tokens['--surface-card'])).toBeGreaterThanOrEqual(4.5);
  expect(contrast(tokens['--brand-primary'], tokens['--text-on-brand'])).toBeGreaterThanOrEqual(4.5);
  expect(contrast(tokens['--border-focus'], tokens['--surface-card'])).toBeGreaterThanOrEqual(3);
  for (const state of ['--brand-primary-hover','--brand-primary-active']) expect(contrast(tokens[state], tokens['--text-on-brand'])).toBeGreaterThanOrEqual(4.5);
  for (const meta of await page.locator('meta[name=theme-color]').all()) await expect(meta).toHaveAttribute('content', tokens['--surface-page']);
  for (const logo of await page.locator('svg[viewBox="0 0 96 96"]').all()) expect(await logo.evaluate(el => getComputedStyle(el).transform)).toBe('none');
  await page.screenshot({ path: `e2e/evidence/brand/after-${locale}-${theme}-${width}.png`, fullPage: true });
  await page.evaluate(()=>{document.documentElement.style.zoom='2';});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:`e2e/evidence/brand/after-${locale}-${theme}-${width}-200.png`,fullPage:true});
});
test('system theme resolves before hydration and reacts to OS changes', async ({ page }) => {
  await fixture(page, 'fa', 'system'); await page.emulateMedia({ colorScheme: 'dark' }); await page.goto('/admin/account-settings');
  await expect(page.locator('html')).toHaveAttribute('data-theme','dark'); await page.emulateMedia({ colorScheme:'light' }); await expect(page.locator('html')).toHaveAttribute('data-theme','light');
});
test('install metadata and assets are served with the declared dimensions', async ({ request, page }) => {
  const response = await request.get('/manifest.json'); expect(response.ok()).toBe(true); const manifest = await response.json(); expect(manifest.name).toContain('Ravinta'); expect(manifest.id).toBe('/');
  await page.goto('/login'); expect(await page.title()).toContain('Ravinta');
  for (const icon of manifest.icons) { const dimensions = await page.evaluate(src => new Promise(resolve => { const image = new Image(); image.onload = () => resolve(`${image.naturalWidth}x${image.naturalHeight}`); image.onerror = () => resolve('failed'); image.src = src; }), icon.src); expect(dimensions).toBe(icon.sizes); }
  for (const asset of ['/favicon.ico','/apple-touch-icon.png','/og-image.png']) expect((await request.get(asset)).ok()).toBe(true);
});

test('explicit theme color matches the saved preference before hydration',async({browser})=>{
 const context=await browser.newContext({javaScriptEnabled:false,colorScheme:'light'});await context.addCookies([{name:'theme',value:'dark',url:base}]);const page=await context.newPage();await page.goto('/login');await expect(page.locator('html')).toHaveAttribute('data-theme','dark');await expect(page.locator('meta[name=theme-color]')).toHaveAttribute('content','#102B29');await context.close();
});

for (const theme of ['light','dark']) test(`canonical contrast matrix ${theme}`,async({page})=>{
 await fixture(page,'en',theme);await page.goto('/admin/account-settings');
 const surfaces=['--surface-page','--surface-card','--surface-elevated','--surface-sunken','--surface-hover'];
 const text=['--text-primary','--text-secondary','--text-tertiary','--text-link'];
 const states=['--success','--warning','--danger','--info'];
 const keys=[...surfaces,...text,...states,...states.map(k=>`${k}-bg`),'--border-focus','--brand-primary','--brand-primary-hover','--brand-primary-active','--text-on-brand'];
 const tokens=await page.evaluate(keys=>Object.fromEntries(keys.map(k=>[k,getComputedStyle(document.documentElement).getPropertyValue(k).trim()])),keys);
 const rgb=value=>value.startsWith('#')?value.slice(1).match(/../g).map(v=>parseInt(v,16)):value.match(/[\d.]+/g).map(Number);
 const blend=(foreground,background)=>{const a=rgb(foreground),b=rgb(background),opacity=a[3]??1;return '#'+a.slice(0,3).map((v,i)=>Math.round(v*opacity+b[i]*(1-opacity)).toString(16).padStart(2,'0')).join('');};
 const rows=[];for(const bg of surfaces){for(const fg of text)rows.push({foreground:fg,background:bg,minimum:4.5,ratio:contrast(tokens[fg],tokens[bg])});for(const fg of states)rows.push({foreground:fg,background:`${fg}-bg over ${bg}`,minimum:4.5,ratio:contrast(tokens[fg],blend(tokens[`${fg}-bg`],tokens[bg]))});rows.push({foreground:'--border-focus',background:bg,minimum:3,ratio:contrast(tokens['--border-focus'],tokens[bg])});}
 for(const bg of ['--brand-primary','--brand-primary-hover','--brand-primary-active'])rows.push({foreground:'--text-on-brand',background:bg,minimum:4.5,ratio:contrast(tokens['--text-on-brand'],tokens[bg])});
 const fs=await import('node:fs/promises');await fs.writeFile(`e2e/evidence/brand/contrast-${theme}.json`,JSON.stringify({theme,scope:'canonical token combinations; excludes disabled text, legacy raw colors and native installation',rows},null,2)+'\n');
 for(const row of rows)expect(row.ratio,`${row.foreground} over ${row.background}`).toBeGreaterThanOrEqual(row.minimum);
});
