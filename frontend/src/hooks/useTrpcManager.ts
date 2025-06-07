import { useState, useEffect, useCallback, useRef } from 'react';
import {
    createTRPCProxyClient,
    createWSClient,
    wsLink,
    TRPCClientError,
} from '@trpc/client';
import { QueryClient } from '@tanstack/react-query';
import { createTRPCReact } from '@trpc/react-query';
import type { AppRouter } from '../api/server';
import type { Message } from '../types';

const wsClient = createWSClient({
    url: 'ws://localhost:3000',
});

const trpcRouter = createTRPCProxyClient<AppRouter>({
    links: [
        wsLink({
            client: wsClient,
        }),
    ],
});

export const trpc = createTRPCReact<AppRouter>();
export const queryClient = new QueryClient();
export const trpcClient = trpc.createClient({
  links: [
    wsLink({ client: wsClient }),
  ],
});

/**
 * A custom hook to manage tRPC WebSocket connections and message streaming
 */
export function useTrpcManager(
    onMessagesUpdate: (updater: (prevMessages: Message[]) => Message[]) => void,
    setIsLoading: React.Dispatch<React.SetStateAction<boolean>>,
    setError: React.Dispatch<React.SetStateAction<string | null>>,
) {
    // Connection state
    const [isConnected, setIsConnected] = useState(false);
    
    // References for managing subscription state
    const subscriptionRef = useRef<{ unsubscribe: () => void; } | null>(null);
    const assistantMessageIdRef = useRef<string | null>(null);
    const lastDataRef = useRef<string | null>(null); // To prevent duplicate chunks

    // Connect to WebSocket and listen for connection events
    useEffect(() => {
        // Access the underlying WebSocket to track connection state
        // @ts-ignore - WebSocket property not in official type definition
        const wsImpl = wsClient.ws as WebSocket | undefined;
        if (wsImpl) {
            const handleOpen = () => setIsConnected(true);
            const handleClose = () => setIsConnected(false);

            wsImpl.addEventListener('open', handleOpen);
            wsImpl.addEventListener('close', handleClose);

            // Set initial state based on current readyState
            setIsConnected(wsImpl.readyState === 1);

            return () => {
                // Clean up listeners when component unmounts
                wsImpl.removeEventListener('open', handleOpen);
                wsImpl.removeEventListener('close', handleClose);
                if (subscriptionRef.current) {
                    subscriptionRef.current.unsubscribe();
                    subscriptionRef.current = null;
                }
            };
        }
    }, []);

    /**
     * Generate a unique message ID
     */
    const generateMessageId = useCallback(() => {
        return Date.now().toString() + '-' + Math.random().toString(36).substring(2, 9);
    }, []);

    /**
     * Updates messages with a new assistant response chunk
     */
    const handleMessageChunk = useCallback((data: string) => {
        // Skip if this is a duplicate chunk
        if (lastDataRef.current === data) {
            return;
        }
        
        // Save this chunk to prevent duplicates
        lastDataRef.current = data;
        
        onMessagesUpdate((prevMessages) => {
            // If we haven't started receiving assistant message yet
            if (!assistantMessageIdRef.current) {
                // Create a new message with a unique ID
                const messageId = generateMessageId();
                assistantMessageIdRef.current = messageId;
                
                return [
                    ...prevMessages,
                    { role: 'assistant', content: data, id: messageId } as Message,
                ];
            } 
            
            // Otherwise, append to the existing message
            // Get last message in the array (should be the assistant message)
            const lastMessageIndex = prevMessages.length - 1;
            const lastMessage = prevMessages[lastMessageIndex];
            
            // Check if this is indeed our assistant message that we're updating
            if (lastMessage && lastMessage.role === 'assistant') {
                // Create a new array with all but the last message
                const updatedMessages = prevMessages.slice(0, lastMessageIndex);
                
                // Add the updated message
                updatedMessages.push({
                    ...lastMessage,
                    content: lastMessage.content + data
                });
                
                return updatedMessages;
            }
            
            // Fallback: create a new assistant message if something went wrong
            return [
                ...prevMessages,
                { role: 'assistant', content: data, id: assistantMessageIdRef.current } as Message
            ];
        });
    }, [onMessagesUpdate, generateMessageId]);

    /**
     * Sends a message and subscribes to the response stream
     */
    const sendMessage = useCallback((messages: Message[]) => {
        // Reset state for new message
        setIsLoading(true);
        setError(null);
        assistantMessageIdRef.current = null;
        lastDataRef.current = null;

        // Unsubscribe from any previous subscription
        if (subscriptionRef.current) {
            subscriptionRef.current.unsubscribe();
            subscriptionRef.current = null;
        }

        // Create new subscription
        const sub = trpcRouter.sendChatMessage.subscribe(messages, {
            onStarted: () => {
                setIsConnected(true);
            },
            onData: handleMessageChunk,
            onError: (err) => {
                console.error('[useTrpcManager] Subscription error:', err);
                if (err instanceof TRPCClientError) {
                    setError(err.message);
                } else {
                    setError('An unknown error occurred during the subscription.');
                }
                setIsLoading(false);
                setIsConnected(false);
                subscriptionRef.current = null;
                assistantMessageIdRef.current = null;
            },
            onComplete: () => {
                setIsLoading(false);
                subscriptionRef.current = null;
                assistantMessageIdRef.current = null;
            },
            onStopped: () => {
                // Connection remains open even if this subscription stops
            }
        });

        subscriptionRef.current = sub;
        return true;
    }, [onMessagesUpdate, setIsLoading, setError, handleMessageChunk]);

    return { isConnected, sendMessage };
}

// Ensure you have a Message type defined, for example in src/types.ts:
/*
export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  // any other properties your messages might have
}
*/
