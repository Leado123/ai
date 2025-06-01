import { useCallback } from 'react';

// Remove all tRPC/react-query logic, keep only stubs for compatibility

// Empty stubs for compatibility
export const trpc = {} as any;
export const queryClient = {} as any;
export const trpcClient = {} as any;

export function useTrpcManager(
    onMessagesUpdate: (updater: (prevMessages: any[]) => any[]) => void,
    setIsLoading: React.Dispatch<React.SetStateAction<boolean>>,
    setError: React.Dispatch<React.SetStateAction<string | null>>,
) {
    // Always connected for HTTP requests
    const isConnected = true;

    // Empty sendMessage function
    const sendMessage = () => {
        // No-op
        return false;
    };

    return { isConnected, sendMessage };
}
