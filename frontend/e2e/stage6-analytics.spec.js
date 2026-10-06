import { test, expect } from '@playwright/test';
import { connectionFixture } from '../src/services/__fixtures__/connections';
async function setup(page, language='en', theme='light') {
  const wire=connectionFixture(); const provider=wire.providers[0]; provider.capabilities.analytics='supported';
  const metrics=[{key:'views',title_en:'Fixture views',title_fa:'بازدید آزمایشی',unit:'count',period:'snapshot'}];
  provider.contract.analytics={sync_available:true,metrics};
  const state={failure:null,syncFailure:false,slow:false,wire};
  const baseURL=process.env.E2E_BASE_URL||'http://127.0.0.1:3000';
  await page.context().addCookies([{name:'socialstats.language',value:language,url:baseURL},{name:'theme',value:theme,url:baseURL}]);
  await page.addInitScript(()=>localStorage.setItem('socialstats_cookie_choice',JSON.stringify({version:'2024-11-01',choices:{essential:true,functional:true}})));
  await page.route('**/api/**',async route=>{
    const url=new URL(route.request().url()),path=url.pathname;
    if(path.endsWith('/auth/session/'))return route.fulfill({json:{authenticated:true,csrfToken:'fixture-csrf'}});
    if(path.endsWith('/auth/me/'))return route.fulfill({json:{id:1,role:'client',account_type:'legacy',client_id:7,workspace_id:7,email:'fixture@example.test',permissions:{}}});
    if(path.includes('/connections/'))return route.fulfill({json:state.wire});
    if(path.includes('/trigger_sync/'))return route.fulfill({status:state.syncFailure?503:200,json:state.syncFailure?{code:'unavailable'}:{queued:[{social_account_id:10}]}});
    if(path.includes('/analytics_report/')){
      if(state.slow) await new Promise(resolve=>setTimeout(resolve,800));
      if(state.failure==='malformed')return route.fulfill({json:{rows:[]}});
      if(state.failure)return route.fulfill({status:state.failure,json:{code:'unavailable'}});
      const since=url.searchParams.get('since'),until=url.searchParams.get('until'),account=Number(url.searchParams.get('social_account'));
      return route.fulfill({json:{version:1,workspace_id:7,account_id:account,provider:provider.key,availability:'available',dataset_count:2,
        period:{since,until},metrics,sync:{...provider.accounts[0].sync,state:'stale'},
        rows:[{id:1,date:since,observed_at:'2026-10-01T10:00:00Z',state:'available',values:{views:0}},
          {id:2,date:until,observed_at:'2026-10-01T10:00:00Z',state:'partial',values:{views:null}}],
        pagination:{page:Number(url.searchParams.get('page')||1),page_size:100,count:2,has_next:false,has_previous:false}}});
    }
    return route.fulfill({json:[]});
  });
  await page.routeWebSocket('**/ws/**',socket=>socket.close());
  await page.goto('/dashboard/analytics/analytics');return state;
}
for(const language of ['fa','en'])for(const theme of ['light','dark','system'])for(const width of [360,768,1440])test(`${language}/${theme}/${width}: truthful metrics and sync recovery`,async({page})=>{
  await page.setViewportSize({width,height:950});await page.emulateMedia({colorScheme:theme==='system'?'dark':theme,reducedMotion:'reduce'});
  const state=await setup(page,language,theme);
  if(process.env.STAGE6_BASELINE){await page.screenshot({path:`e2e/evidence/stage6/analytics-before-${language}-${theme}-${width}.png`,fullPage:true});return;}
  await page.getByRole('combobox',{name:language==='fa'?'حساب / مقصد':'Account / destination'}).selectOption('10');
  await expect(page.getByText(language==='fa'?'بعضی شاخص‌ها در دسترس نیستند. فاصله‌ها با صفر پر نمی‌شوند.':'Some metrics are unavailable. Gaps are not filled with zero.',{exact:true}).first()).toBeVisible();
  state.syncFailure=true;await page.getByRole('button',{name:language==='fa'?'همگام‌سازی':'Sync',exact:true}).click();
  await expect(page.getByRole('alert').filter({hasText:language==='fa'?'اندازه‌گیری‌های قبلی':'Previous measurements'})).toBeFocused();
  await expect(page.getByRole('table')).toBeVisible();
  await page.screenshot({path:`e2e/evidence/stage6/analytics-after-${language}-${theme}-${width}.png`,fullPage:true});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
for(const failure of [403,404,429,500,503,'malformed'])test(`analytics ${failure}: background preservation and recovery`,async({page})=>{
  test.skip(!!process.env.STAGE6_BASELINE);const state=await setup(page);
  await page.getByRole('combobox',{name:'Account / destination'}).selectOption('10');await expect(page.getByRole('table')).toBeVisible();
  state.failure=failure;await page.getByRole('button',{name:'Refresh',exact:true}).click();
  await expect(page.locator('[data-data-state]').filter({hasText:/could not|restricted/})).toBeVisible();
  await expect(page.getByRole('table')).toHaveCount([403,404].includes(failure)?0:1);
  state.failure=null;await page.getByRole('button',{name:'Try again',exact:true}).click();await expect(page.getByRole('table')).toBeVisible();
});
test('missing capability has no active analytics or fake measurements',async({page})=>{
  test.skip(!!process.env.STAGE6_BASELINE);const state=await setup(page);state.wire.providers[0].capabilities.analytics='not_available';await page.reload();
  await expect(page.getByRole('table')).toHaveCount(0);await expect(page.getByRole('button',{name:'Sync',exact:true})).toHaveCount(0);
});
test('slow account switch ignores obsolete report and disables unhealthy sync',async({page})=>{
  test.skip(!!process.env.STAGE6_BASELINE);const state=await setup(page);state.slow=true;
  const account=page.getByRole('combobox',{name:'Account / destination'});
  await account.selectOption('10');await expect(page.locator('[data-data-state="loading"]')).toBeVisible();
  await account.selectOption('11');await expect(page.getByRole('table')).toBeVisible();
  await expect(page.getByRole('button',{name:'Sync',exact:true})).toBeDisabled();await expect(account).toHaveValue('11');
});
for(const failure of [403,404,429,500,503,'malformed'])test(`analytics initial ${failure} is not an empty success`,async({page})=>{
  test.skip(!!process.env.STAGE6_BASELINE);const state=await setup(page);state.failure=failure;
  await page.getByRole('combobox',{name:'Account / destination'}).selectOption('10');
  await expect(page.locator('[data-data-state]').filter({hasText:/could not|restricted/})).toBeVisible();await expect(page.getByRole('table')).toHaveCount(0);
  state.failure=null;await page.getByRole('button',{name:'Try again',exact:true}).click();await expect(page.getByRole('table')).toBeVisible();
});
