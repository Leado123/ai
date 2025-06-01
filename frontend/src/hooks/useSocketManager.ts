/**
 * This file is deprecated. Please use useTrpcManager.ts instead.
 * 
 * This file re-exports the tRPC client functionality from useTrpcManager.ts
 * to ensure backward compatibility.
 */

import { trpc, queryClient, trpcClient, useTrpcManager } from './useTrpcManager';

export { trpc, queryClient, trpcClient, useTrpcManager };