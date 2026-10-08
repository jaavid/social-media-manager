import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import PostFormDrawer from './PostFormDrawer';
let mockConnection={status:{},loaded:false,error:null};
let mockCompatible=[];
jest.mock('../../hooks/usePlatformConnections', () => ({__esModule:true,default:()=>mockConnection}));
jest.mock('../../hooks/useCalendar', () => ({useSuggestedTimes:()=>({suggestions:[],source:'fixture'})}));
jest.mock('../../services/platforms', () => ({connectedPlatforms:()=>mockCompatible, PLATFORMS:{telegram:{label:'Telegram'},instagram:{label:'Instagram'}}, usePlatformUiRegistry:()=>({platforms:[{key:'telegram',label:'Telegram',labels:{short:'Telegram'},color:'#0088cc'},{key:'instagram',label:'Instagram',labels:{short:'Instagram'},color:'#c13584'}]})}));
jest.mock('../../i18n', () => ({useLanguage:()=>({isPersian:false,tr:value=>value,formatDate:()=> 'Public fixture date',formatNumber:value=>String(value)})}));
test('opening and reopening a draft never mutates the calendar-owned Date', () => {
  const date = new Date('2026-11-08T17:23:45Z'); const original = date.getTime();
  const props = {date,isOpen:true,clientId:7,onClose:jest.fn(),onSave:jest.fn()};
  const view = render(<PostFormDrawer {...props}/>);
  expect(date.getTime()).toBe(original);
  view.rerender(<PostFormDrawer {...props} isOpen={false}/>);
  view.rerender(<PostFormDrawer {...props}/>);
  expect(date.getTime()).toBe(original);
});

test('editing retains the saved platform across slow, incompatible and failed connection reads',async()=>{
 const post={id:17,platform:'telegram',post_type:'text',title:'Public fixture post',caption:'Public fixture caption'};
 const props={post,date:new Date('2026-11-08T17:00:00Z'),isOpen:true,clientId:7,onClose:jest.fn(),onSave:jest.fn()};
 mockConnection={status:{},loaded:false,error:null};mockCompatible=[];
 const view=render(<PostFormDrawer {...props}/>);expect(screen.getByRole('button',{name:/Telegram$/})).toHaveStyle({background:'#0088cc'});
 mockConnection={status:{instagram:true},loaded:true,error:null};mockCompatible=[{key:'instagram',label:'Instagram',labels:{short:'Instagram'},color:'#c13584'}];view.rerender(<PostFormDrawer {...props}/>);expect(screen.getByRole('button',{name:/Telegram$/})).toHaveStyle({background:'#0088cc'});
 mockConnection={status:{},loaded:true,error:new Error('Public unavailable fixture')};mockCompatible=[];view.rerender(<PostFormDrawer {...props}/>);expect(screen.getByRole('button',{name:/Telegram$/})).toHaveStyle({background:'#0088cc'});expect(props.onSave).not.toHaveBeenCalled();fireEvent.click(screen.getByRole('button',{name:'Save as Draft'}));await waitFor(()=>expect(props.onSave).toHaveBeenCalledWith(expect.objectContaining({platform:'telegram'}),17));
});
