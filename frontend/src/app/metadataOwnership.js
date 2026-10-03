import { createContext } from 'react';
// The Vite host owns its head imperatively; migrated Next routes own it on the server.
export const MetadataOwnership = createContext(false);
