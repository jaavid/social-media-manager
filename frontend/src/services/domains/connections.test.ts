import { connectionFixture } from '@/services/__fixtures__/connections';
import { parseConnections } from './connections';
test('wire validation rejects wrong workspace, malformed data, duplicate account and false healthy result', () => {
  expect(parseConnections(connectionFixture(), 7).providers[0].key).toBe('contract_example');
  expect(() => parseConnections(connectionFixture(), 8)).toThrow();
  expect(() => parseConnections({ providers: [] }, 7)).toThrow();
  const wire = connectionFixture(); wire.providers[0].accounts[0].health.state = 'unknown';
  expect(() => parseConnections(wire, 7)).toThrow();
  const falseReady = connectionFixture(); falseReady.providers[0].accounts[0].health.ready = false;
  expect(() => parseConnections(falseReady, 7)).toThrow();
  const duplicate = connectionFixture(); duplicate.providers[0].accounts.push(duplicate.providers[0].accounts[0]);
  expect(() => parseConnections(duplicate, 7)).toThrow();
});
test('unknown auth schemas and invalid dates cannot become a successful collection', () => {
  const wire = connectionFixture(); wire.providers[0].contract.auth.fields[0].secret = 'secret value';
  expect(() => parseConnections(wire, 7)).toThrow();
  const wrongDate = connectionFixture(); wrongDate.providers[0].accounts[0].expires_at = 'not-a-date';
  expect(() => parseConnections(wrongDate, 7)).toThrow();
});
