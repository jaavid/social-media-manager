import { test, expect } from '@playwright/test';
import { mockComposerConnections } from './composer-fixture';
import { enMessages as en } from '../src/i18n/messages';
test.use({trace:'off',screenshot:'off',video:'off'});
const base=process.env.E2E_BASE_URL||'http://127.0.0.1:3000';
async function fixture(page){
 const state={postStatus:0,postReads:0,status:0,malformed:false,rows:[{id:11,client:7,name:'Synthetic queue',platforms:['facebook'],is_active:true}],reads:0,writes:0};
 await page.context().addCookies([{name:'socialstats.language',value:'en',url:base}]);
 await page.addInitScript(()=>{localStorage.setItem('socialstats.language','en');localStorage.setItem('socialstats_cookie_choice',JSON.stringify({version:'2024-11-01',choices:{essential:true,functional:true}}));});
 await page.routeWebSocket('**/ws/**',s=>s.close());
 await page.route('**/api/**',route=>{const req=route.request(),p=new URL(req.url()).pathname;if(p.startsWith('/api/composer/')&&!['GET','HEAD'].includes(req.method()))state.writes++;
  if(p.endsWith('/auth/session/'))return route.fulfill({json:{authenticated:true,csrfToken:'fixture'}});
  if(p.endsWith('/auth/me/'))return route.fulfill({json:{id:1,role:'client',account_type:'legacy',client_id:7,workspace_id:7,permissions:{}}});
  if(p==='/api/composer/posts/900/'){state.postReads++;return route.fulfill({status:state.postStatus||200,json:{id:900,client:7,title:'',content:'Synthetic saved post',media_type:'text',media_urls:[],target_platforms:['facebook'],platform_overrides:{},status:'draft',scheduled_at:null}});}
  if(p==='/api/composer/queues/'){state.reads++;return route.fulfill({status:state.status||200,json:state.malformed?{}:state.rows});}
  return route.fulfill({json:[]});
 });await mockComposerConnections(page);return state;
}
async function open(page){await page.goto('/dashboard/analytics/composer');await page.getByRole('button',{name:'Facebook',exact:true}).first().click();await page.getByLabel('Content',{exact:true}).fill('Synthetic preserved draft');await page.getByRole('button',{name:'Add to Queue',exact:true}).click();return page.getByRole('region',{name:en['composer.queue.region'],exact:true});}
for(const status of [401,403,404,429,503,'malformed'])test(`composer queue initial ${status} has no false empty or write`,async({page})=>{const s=await fixture(page);if(status==='malformed')s.malformed=true;else s.status=status;if(status===401){await page.goto('/dashboard/analytics/composer');await expect(page).toHaveURL(/\/login/);return;}const area=await open(page);await expect(area.getByRole('button',{name:en['composer.editor.retry'],exact:true})).toBeVisible();await expect(page.getByLabel('Content',{exact:true})).toHaveValue('Synthetic preserved draft');await expect(page.getByText(en['composer.queue.none'],{exact:true})).toHaveCount(0);await expect(page.getByText(en['composer.queue.empty'],{exact:true})).toHaveCount(0);s.status=0;s.malformed=false;await area.getByRole('button',{name:en['composer.editor.retry'],exact:true}).click();await expect(area.getByRole('option',{name:'Synthetic queue'})).toHaveCount(1);await expect(area).toBeFocused();expect(s.writes).toBe(0);});
for(const status of [403,404,503])test(`composer queue background ${status} retains draft and hides revoked metadata`,async({page,context})=>{const s=await fixture(page),area=await open(page);await area.getByLabel(en['composer.queue.destination']).selectOption('11');await page.clock.install();await page.clock.fastForward(31000);s.status=status;const count=s.reads;await context.setOffline(true);await context.setOffline(false);await expect.poll(()=>s.reads).toBeGreaterThan(count);await expect(area.getByRole('button',{name:en['composer.editor.retry'],exact:true})).toBeVisible();await expect(page.getByLabel('Content',{exact:true})).toHaveValue('Synthetic preserved draft');await expect(area.getByRole('option',{name:'Synthetic queue'})).toHaveCount(status===503?1:0);await expect(area.getByLabel(en['composer.queue.destination'])).toBeDisabled();expect(s.writes).toBe(0);});
for(const matching of [false,true])test(`composer queue distinguishes ${matching?'no-results':'empty dataset'}`,async({page})=>{const s=await fixture(page);s.rows=matching?[{...s.rows[0],platforms:['instagram']}]:[];const area=await open(page);await expect(area.getByText(en[matching?'composer.queue.empty':'composer.queue.none'],{exact:true})).toBeVisible();expect(s.writes).toBe(0);});
test('safe queue metadata denial evidence',async({page,context})=>{const s=await fixture(page);await page.setViewportSize({width:1440,height:1100});await open(page);await page.getByLabel(en['composer.queue.destination']).selectOption('11');await page.clock.install();await page.clock.fastForward(31000);s.status=403;await context.setOffline(true);await context.setOffline(false);if(!process.env.E2E_UI_BASELINE)await expect(page.getByRole('option',{name:'Synthetic queue'})).toHaveCount(0);else await page.waitForTimeout(300);await page.screenshot({path:`e2e/evidence/composer-reader/denial-${process.env.E2E_UI_BASELINE?'before':'after'}-en-light-1440.png`,fullPage:true});});

for(const status of [403,404,503])test(`composer existing post background ${status} hides denied snapshots or retains outage drafts`,async({page,context})=>{const s=await fixture(page);await page.goto('/dashboard/analytics/composer/900');const input=page.getByLabel('Content',{exact:true});await expect(input).toHaveValue('Synthetic saved post');await input.fill('Synthetic edited post');await page.clock.install();await page.clock.fastForward(31000);s.postStatus=status;const response=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/composer/posts/900/'&&r.status()===status);await context.setOffline(true);await context.setOffline(false);await response;if(status===503)await expect(input).toHaveValue('Synthetic edited post');else await expect(input).toHaveCount(0);if(status===404)await expect(page.getByText(en['recovery.notFound'],{exact:true})).toBeVisible();expect(s.writes).toBe(0);});

test('save navigation and immediate reload never persist an empty post recovery draft',async({page})=>{
 await fixture(page);
 await page.addInitScript(()=>{
  const original=Storage.prototype.setItem;window.__emptyComposerDraftWrites=0;
  Storage.prototype.setItem=function(key,value){
   // An incomplete new draft is valid; only the existing post must avoid a temporary empty snapshot.
   if(key.startsWith('composer-draft:')&&key.endsWith(':900')){try{if(JSON.parse(value).content==='')window.__emptyComposerDraftWrites++;}catch{}}
   return original.call(this,key,value);
  };
 });
 await page.route(/\/api\/composer\/posts\/(?:\?.*)?$/,route=>route.fulfill({json:{id:900,client:7,title:'',content:'Synthetic saved post',media_type:'text',media_urls:[],target_platforms:['facebook'],platform_overrides:{},status:'draft',scheduled_at:null}}));
 await page.goto('/dashboard/analytics/composer');
 await page.getByRole('button',{name:'Facebook',exact:true}).first().click();
 await page.getByLabel('Content',{exact:true}).fill('Synthetic saved post');
 await page.getByRole('button',{name:'Save Draft',exact:true}).click();
 await expect(page).toHaveURL(/\/dashboard\/composer\/900$/);
 await expect(page.getByLabel('Content',{exact:true})).toHaveValue('Synthetic saved post');
 expect(await page.evaluate(()=>window.__emptyComposerDraftWrites)).toBe(0);
 await page.reload();
 await expect(page.getByLabel('Content',{exact:true})).toHaveValue('Synthetic saved post');
 expect(await page.evaluate(()=>window.__emptyComposerDraftWrites)).toBe(0);
});
