import { render, cleanup } from '@testing-library/react';
import Meta from './Meta';
import { MetadataOwnership } from '../app/metadataOwnership';
afterEach(cleanup);
test('Next-owned metadata survives reuse of a legacy feature', () => {
  document.title = 'Server route title';
  render(<MetadataOwnership.Provider value={true}><Meta title="Legacy title" /></MetadataOwnership.Provider>);
  expect(document.title).toBe('Server route title');
});
test('Vite keeps its existing head behavior', () => {
  render(<Meta title="Legacy title" />);
  expect(document.title).toBe('Legacy title · Social Stats');
});
