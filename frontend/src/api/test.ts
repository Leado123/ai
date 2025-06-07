import { createWSClient, wsLink, createTRPCClient } from '@trpc/client';
import type { AppRouter } from './server';

async function main() {
    // Connect to the tRPC WebSocket server
    const wsClient = createWSClient({
        url: 'ws://localhost:3000',
    });

    const trpc = createTRPCClient<AppRouter>({
        links: [
            wsLink({
                client: wsClient,
            }),
        ],
    });

    // Example input message array
    const input = [
        { role: 'user', content: 'Hello, AI! Can you summarize the theory of relativity?' }
    ];

    // Subscribe to the sendChatMessage stream
    const sub = trpc.sendChatMessage.subscribe(input, {
        onData(data) {
            console.log('Received chunk:', data);
        },
        onError(err) {
            console.error('Subscription error:', err);
        },
        onComplete() {
            console.log('Subscription complete.');
            wsClient.close();
        },
    });
}

main();