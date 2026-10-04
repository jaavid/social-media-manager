'use client';
import { createContext } from 'react';
// Presence is only a hint for best-effort consent writes, never authentication.
export const SessionHint = createContext(false);
