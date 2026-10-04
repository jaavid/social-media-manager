import * as mockReact from 'react';
// Shared Jest setup.
import '@testing-library/jest-dom';
import 'whatwg-fetch';

// Quiet the React 18 act() warnings that fire from zustand's external store
// notifications when our tests assert state that was set outside a render.
// We assert on the store directly via `useAppStore.getState()` rather than
// rendering components, so the warnings are noise.
const originalError = console.error;
beforeAll(() => {
  console.error = (...args) => {
    if (typeof args[0] === 'string' && args[0].includes('not wrapped in act')) {
      return;
    }
    originalError.call(console, ...args);
  };
});
afterAll(() => {
  console.error = originalError;
});

// Shared features use the native Next navigation adapter in all environments.
jest.mock('next/navigation', () => {
  const router = { push: jest.fn(), replace: jest.fn(), back: jest.fn(), refresh: jest.fn(), prefetch: jest.fn() };
  return {
    useRouter: jest.fn(() => router),
    usePathname: jest.fn(() => '/'),
    useParams: jest.fn(() => ({})),
    useSearchParams: jest.fn(() => new URLSearchParams()),
  };
});
jest.mock('next/link', () => {
  return mockReact.forwardRef(function MockLink({ href, children, replace, prefetch, scroll, ...props }, ref) { return mockReact.createElement('a', { ...props, href, ref }, children); });
});

// Browser API tests use a non-secret CSRF fixture.
document.cookie = "csrftoken=test-csrf; Path=/";
