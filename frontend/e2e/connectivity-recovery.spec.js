import {test,expect} from '@playwright/test';
import {connectionFixture} from '../src/services/__fixtures__/connections';
import {enMessages,faMessages} from '../src/i18n/messages';
test.use({trace:'off',screenshot:'off',video:'off'});
for(const language of ['fa','en']) for(const theme of ['light','dark']) for(const width of [360,768,1440]) test(`connectivity recovery ${language}/${theme}/${width}`,async({page},info)=>{
 await page.setViewportSize({width,height:1000});await page.emulateMedia({reducedMotion:'reduce',colorScheme:theme});
 const origin=new URL(info.project.use.baseURL).origin;await page.context().addCookies([{name:'socialstats.language',value:language,url:origin},{name:'theme',value:theme,url:origin}]);
 await page.addInitScript(()=>localStorage.setItem('socialstats_cookie_choice',JSON.stringify({version:'2024-11-01',choices:{essential:true,functional:true}})));
 let calls=0;let release;const pending=new Promise(r=>{release=r;});const wire={checked_at:'2026-10-08T10:00:00Z',gateway:{reachable:false},services:[{id:'telegram',name:'Public service',mode:'direct',active_route:'direct',recommended_route:'direct',direct:{reachable:true},gateway:{reachable:false}}]};
 await page.routeWebSocket('**/ws/**',s=>s.close());await page.route('**/api/**',async route=>{const path=new URL(route.request().url()).pathname;
 if(path.endsWith('/auth/session/'))return route.fulfill({json:{authenticated:true,csrfToken:'public-fixture'}});
 if(path.endsWith('/auth/me/'))return route.fulfill({json:{id:1,role:'staff',account_type:'legacy',client_id:7,workspace_id:7,email:'fixture@example.test',permissions:{}}});
 if(path.endsWith('/end-user/me/'))return route.fulfill({json:{workspace:{id:7}}});
 if(path.includes('/connections/'))return route.fulfill({json:connectionFixture()});
 if(path.includes('/egress/connectivity/')){calls++;if(calls===2){await pending;return route.fulfill({status:503,json:{detail:'Private fixture body must remain hidden'}});}return route.fulfill({json:wire});}
 return route.fulfill({json:[]});});await page.goto('/admin/workspace/7/settings');
 await page.getByRole('button',{name:'Run connectivity test'}).click();await expect(page.getByText('Public service')).toBeVisible();
 const retest=page.getByRole('row').filter({hasText:'Public service'}).getByRole('button');await expect(retest).toHaveText('Retest');await retest.focus();await page.keyboard.press('Enter');await expect(page.getByRole('button',{name:'Test all again'})).toBeDisabled();await expect(retest).toBeDisabled();release();
 const copy=language==='fa'?faMessages:enMessages;const alert=page.getByRole('alert').filter({hasText:copy['connections.failed']});await expect(alert).toBeVisible();await expect(alert).toBeFocused();await expect(page.getByText('Public service')).toBeVisible();expect(calls).toBe(2);await expect(page.getByText('Private fixture body must remain hidden')).toHaveCount(0);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await expect(page.locator('html')).toHaveAttribute('dir',language==='fa'?'rtl':'ltr');
});
