import {act, fireEvent, render, screen} from '@testing-library/react';
import ApiConnectivityPanel from './ApiConnectivityPanel';
import {egressAPI} from '../services/egress';
let mockUser;
jest.mock('../core/session',()=>({useSession:()=>({user:mockUser})}));
jest.mock('../services/egress',()=>({egressAPI:{connectivity:jest.fn()}}));
const wire={checked_at:'2026-10-08T10:00:00Z',gateway:{reachable:true},services:[{id:'telegram',name:'Public fixture service',mode:'direct',active_route:'direct',recommended_route:'direct',direct:{reachable:true},gateway:{reachable:false}}]};
const deferred=()=>{let resolve;const promise=new Promise(r=>{resolve=r;});return{resolve,promise};};
beforeEach(()=>{jest.resetAllMocks();mockUser={id:1,role:'staff'};egressAPI.connectivity.mockResolvedValue({data:wire});});
test('all and service probes mutually disable controls while either request is active',async()=>{
 render(<ApiConnectivityPanel/>);fireEvent.click(screen.getByRole('button',{name:'Run connectivity test'}));
 await screen.findByText('Public fixture service');const pending=deferred();egressAPI.connectivity.mockImplementationOnce(()=>pending.promise);
 fireEvent.click(screen.getByRole('button',{name:'Retest'}));
 expect(screen.getByRole('button',{name:'Test all again'})).toBeDisabled();
 await act(async()=>pending.resolve({data:wire}));
 const all=deferred();egressAPI.connectivity.mockImplementationOnce(()=>all.promise);fireEvent.click(screen.getByRole('button',{name:'Test all again'}));
 expect(screen.getByRole('button',{name:'Retest'})).toBeDisabled();
 await act(async()=>all.resolve({data:wire}));
});
test('same-turn double probe does not consume two requests',()=>{
 egressAPI.connectivity.mockReturnValue(new Promise(()=>{}));render(<ApiConnectivityPanel/>);
 const button=screen.getByRole('button',{name:'Run connectivity test'});
 act(()=>{fireEvent.click(button);fireEvent.click(button);});expect(egressAPI.connectivity).toHaveBeenCalledTimes(1);
});
test('operator identity switch suppresses old rows and a late old response',async()=>{
 const old=deferred();egressAPI.connectivity.mockReturnValueOnce(old.promise);const view=render(<ApiConnectivityPanel/>);
 fireEvent.click(screen.getByRole('button',{name:'Run connectivity test'}));mockUser={id:2,role:'staff'};view.rerender(<ApiConnectivityPanel/>);
 await act(async()=>old.resolve({data:wire}));expect(screen.queryByText('Public fixture service')).not.toBeInTheDocument();
});
test('failed or malformed probes retain valid rows and never expose a private error body',async()=>{
 render(<ApiConnectivityPanel/>);fireEvent.click(screen.getByRole('button',{name:'Run connectivity test'}));await screen.findByText('Public fixture service');
 egressAPI.connectivity.mockResolvedValueOnce({data:{}});fireEvent.click(screen.getByRole('button',{name:'Test all again'}));
 await screen.findByRole('alert');expect(screen.getByText('Public fixture service')).toBeInTheDocument();
 egressAPI.connectivity.mockRejectedValueOnce({response:{status:503,data:{detail:'private fixture body'}}});fireEvent.click(screen.getByRole('button',{name:'Retest'}));
 await screen.findByRole('alert');expect(screen.queryByText('private fixture body')).not.toBeInTheDocument();
});
