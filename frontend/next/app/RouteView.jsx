'use client';
import { MetadataOwnership } from '../../src/app/metadataOwnership';
export default function RouteView({ children }) {
  return <MetadataOwnership.Provider value={true}>{children}</MetadataOwnership.Provider>;
}
