import { AxiosError, AxiosHeaders } from 'axios';
import { apiError } from './errors';
function error(reference: string) { return new AxiosError('failed','ERR_BAD_RESPONSE',undefined,undefined,{status:503,statusText:'Unavailable',headers:{'x-request-id':reference},config:{headers:new AxiosHeaders()},data:{detail:'private provider message'}}); }
test('exposes only a bounded safe correlation ID',()=>{
  expect(apiError(error('0123456789abcdef0123456789abcdef')).referenceId).toBe('0123456789abcdef0123456789abcdef');
  for(const value of ['https://secret/token','private message','a'.repeat(1000),'abc\nAuthorization:secret']) expect(apiError(error(value)).referenceId).toBeUndefined();
});
