import {test,expect} from '@playwright/test';
import {connectionFixture,connectionAccount} from '../src/services/__fixtures__/connections';
test.use({trace:'off',screenshot:'off',video:'off'});
const profile = { id:7,name:'Synthetic workspace',company:'Fixture business',email:'team@example.test',phone:'',whatsapp_number:'',website:'',gmb_url:'',business_category:'Technology',brand_description:'Fixture brand',usp:'Fixture strengths',brand_tone:'professional',target_audience:'Fixture audience',gender:'all',business_location:'Fixture city',business_subcategories:[],target_locations:['India'],competitors:[],brand_assets:{logo:'/existing.png',palette:{primary:'#123456',secondary:'#abcdef'}},profile_image:null,product_images:['/product.png'],onboarding_complete:false };
for(const ready of [false,true]) test(`existing onboarding counts only ready accounts ${ready}`,async({page},info)=>{
 const origin=new URL(info.project.use.baseURL).origin;await page.context().addCookies([{name:'socialstats.language',value:'en',url:origin}]);
 await page.addInitScript(()=>{sessionStorage.setItem('onboarding_step_7','5');localStorage.setItem('socialstats_cookie_choice',JSON.stringify({version:'2024-11-01',choices:{essential:true,functional:true}}));});
 const wire=connectionFixture();wire.providers[0].accounts=[connectionAccount(10,'expired'),connectionAccount(11,ready?'ready':'revoked')];let writes=0;
 await page.routeWebSocket('**/ws/**',s=>s.close());await page.route('**/api/**',async route=>{const request=route.request(),path=new URL(request.url()).pathname;
 if(path.endsWith('/auth/session/'))return route.fulfill({json:{authenticated:true,csrfToken:'public-fixture'}});
 if(path.endsWith('/auth/me/'))return route.fulfill({json:{id:1,role:'client',account_type:'legacy',client_id:7,workspace_id:7,permissions:{}}});
 if(path.includes('/connections/'))return route.fulfill({json:wire});
 if(path==='/api/workspaces/7/'){if(request.method()==='PATCH'){writes++;return route.fulfill({json:{...profile,brand_assets:{palette:{secondary:'#abcdef',primary:'#123456'},logo:'/existing.png'},onboarding_complete:true}});}return route.fulfill({json:profile});}
 if(path==='/api/workspaces/')return route.fulfill({json:[{id:7,name:'Public workspace',company:'Fixture'}]});
 if(path==='/api/public/lookups/')return route.fulfill({json:{}});
 return route.fulfill({json:[]});});await page.goto('/dashboard/onboarding');await expect(page.getByRole('button',{name:'Complete Setup',exact:true})).toBeVisible();await expect(page.getByRole('combobox',{name:'Account / destination'})).toBeVisible();await expect(page.locator('option[value="11"]')).toHaveText('Second account · destination-11');await page.getByRole('button',{name:'Complete Setup',exact:true}).click();
 if(ready){await expect(page).toHaveURL(/\/dashboard$/);expect(writes).toBe(1);await expect(page.getByText('Connect at least one social media account before completing setup.')).toHaveCount(0);}else{await expect(page.getByText('Connect at least one social media account before completing setup.')).toBeVisible();expect(writes).toBe(0);}
});
