import { test, expect } from '@playwright/test';
import { enMessages as en, faMessages as fa } from '../src/i18n/messages';
test.use({ trace:'off', screenshot:'off', video:'off' });
const base=process.env.E2E_BASE_URL || 'http://127.0.0.1:3000';
const oauth=Object.fromEntries(['facebook','instagram','youtube','linkedin','google_my_business'].map(key=>[key,{status:'not_connected',last_successful_sync:null,accounts:[]}]));
const post={id:1,platform:'facebook',caption:'Synthetic post',likes:0,comments:0,impressions:0,video_views:0};
async function fixture(page, family, staff=false, locale='en', theme='light') {
 const state={status:0,malformed:false,background:false,role:staff?'staff':'client',requests:0,delay:0};
 await page.context().addCookies([{name:'socialstats.language',value:locale,url:base},{name:'theme',value:theme,url:base}]);
 await page.addInitScript(language=>{localStorage.setItem('socialstats.language',language);localStorage.setItem('socialstats_cookie_choice',JSON.stringify({version:'2024-11-01',choices:{essential:true,functional:true}}));},locale);
 await page.routeWebSocket('**/ws/**',socket=>socket.close());
 await page.route('**/api/**',async route=>{
  const path=new URL(route.request().url()).pathname;
  if(path==='/api/auth/session/')return route.fulfill({json:{authenticated:true,csrfToken:'fixture'}});
  if(path==='/api/auth/me/')return route.fulfill({json:{id:1,role:state.role,account_type:'legacy',client_id:staff?null:7,workspace_id:staff?null:7,permissions:{}}});
  const matched=family==='posts'?/\/workspaces\/\d+\/posts\/$/.test(path):family==='oauth'?/\/oauth\/status\/\d+\/$/.test(path):path==='/api/public/lookups/';
  if(matched){state.requests++;if(state.delay)await new Promise(resolve=>setTimeout(resolve,state.delay));if(state.status)return route.fulfill({status:state.status,json:{}});if(state.malformed)return route.fulfill({json:family==='lookups'?[]:{}});}
  if(/\/workspaces\/\d+\/posts\/$/.test(path))return route.fulfill({json:{results:[{...post,id:path.includes('/8/')?8:1,caption:path.includes('/8/')?'New workspace post':post.caption}],total:1,dataset_count:1,has_more:false}});
  if(/\/oauth\/status\/\d+\/$/.test(path))return route.fulfill({json:{...oauth,facebook:{...oauth.facebook,status:'active',connected_at:'2026-10-07T10:00:00Z',expires_at:null,account_name:'Fixture'}}});
  if(path==='/api/public/lookups/')return route.fulfill({json:{platforms:[]}});
  if(path==='/api/workspaces/')return route.fulfill({json:[{id:7,name:'Synthetic workspace'},{id:8,name:'Second workspace'}]});
  return route.fulfill({json:[]});
 });return state;
}
const regions={posts:'posts.reader',oauth:'posts.connections',lookups:'lookup.title'};
for(const family of ['posts','oauth','lookups'])for(const status of [403,404,429,503,'malformed'])test(`${family} initial ${status} is local and cannot become an empty success`,async({page})=>{
 const state=await fixture(page,family);if(status==='malformed')state.malformed=true;else state.status=status;
 await page.goto('/dashboard/analytics/posts');const area=page.getByRole('region',{name:en[regions[family]],exact:true});await expect(area.getByRole('button',{name:en['recovery.retry'],exact:true})).toBeVisible();
 if(family==='posts')await expect(page.getByText(en['posts.empty'],{exact:true})).toHaveCount(0);else await expect(page.getByText('Synthetic post',{exact:true})).toBeVisible();
 state.status=0;state.malformed=false;await area.getByRole('button',{name:en['recovery.retry'],exact:true}).click();await expect(area.getByRole('button',{name:en['recovery.retry'],exact:true})).toHaveCount(0);await expect(area).toBeFocused();await expect(page.getByText('Synthetic post',{exact:true})).toBeVisible();
});
test('posts refresh failure retains rows, filters and independent connection status',async({page})=>{
 const state=await fixture(page,'posts');await page.goto('/dashboard/analytics/posts');await expect(page.getByText('Synthetic post',{exact:true})).toBeVisible();state.status=503;
 await page.getByRole('tab',{name:/Facebook/}).click();const area=page.getByRole('region',{name:en['posts.reader']});await expect(area.getByRole('button',{name:en['recovery.retry']})).toBeVisible();state.status=0;await area.getByRole('button',{name:en['recovery.retry']}).click();await expect(page.getByText('Synthetic post',{exact:true})).toBeVisible();
 state.status=503;const count=state.requests;await page.getByRole('button',{name:en['recovery.refresh'],exact:true}).click();await expect(area.getByText(en['recovery.stale'],{exact:true})).toBeVisible();expect(state.requests).toBeGreaterThan(count);await expect(page.getByText('Synthetic post',{exact:true})).toBeVisible();
});
test('staff chooses a permitted workspace and fast selection cannot show the old result',async({page})=>{
 const state=await fixture(page,'posts',true);await page.goto('/admin/analytics/posts');await expect(page.getByRole('status').getByText(en['posts.chooseWorkspace'],{exact:true})).toBeVisible();const select=page.locator('#main-content').getByRole('combobox',{name:en['posts.workspace']});state.delay=600;await select.selectOption('7');await select.selectOption('8');await expect(page.getByText('New workspace post',{exact:true})).toBeVisible();await expect(page.getByText('Synthetic post',{exact:true})).toHaveCount(0);
});
test('offline initial filtered read recovers without reporting an empty collection',async({page,context})=>{
 await fixture(page,'posts');await page.goto('/dashboard/analytics/posts');await expect(page.getByText('Synthetic post',{exact:true})).toBeVisible();await context.setOffline(true);await page.getByRole('tab',{name:/Facebook/}).click();await expect(page.getByText(en['posts.empty'],{exact:true})).toHaveCount(0);await context.setOffline(false);await expect(page.getByText('Synthetic post',{exact:true})).toBeVisible();
});

for (const [locale,theme,width] of [['fa','dark',360],['en','light',1440]]) test(`safe auxiliary evidence ${locale}`,async({page})=>{
 const state=await fixture(page,'posts',false,locale,theme);state.status=503;await page.setViewportSize({width,height:900});await page.goto('/dashboard/analytics/posts');
 if(!process.env.E2E_UI_BASELINE)await expect(page.getByRole('region',{name:(locale==='fa'?fa:en)['posts.reader']}).getByRole('button',{name:(locale==='fa'?fa:en)['recovery.retry'],exact:true})).toBeVisible();else await page.waitForTimeout(1200);
 await page.screenshot({path:`e2e/evidence/auxiliary/posts-${process.env.E2E_UI_BASELINE?'before':'after'}-${locale}-${theme}-${width}.png`,fullPage:true});
});
