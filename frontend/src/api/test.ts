// Simple tRPC client test for the aiChat (sendChatMessage) subscription
import { createTRPCProxyClient, createWSClient, wsLink } from '@trpc/client';
import type { AppRouter } from './server';

// Create a WebSocket client for tRPC
const wsClient = createWSClient({
  url: 'ws://localhost:3001',
});

// @ts-expect-error
const trpc = createTRPCProxyClient<AppRouter>({
  links: [
    wsLink({
      client: wsClient,
    }),
  ],
});

async function main() {
  // Example fake message
  const fakeMessages = [
    { role: 'user', content: 'Hello, AI! Can you summarize the theory of relativity?' },
  ];

  // Subscribe to the aiChat (sendChatMessage) subscription
  const sub = trpc.sendChatMessage.subscribe(fakeMessages, {
    onData(data: string) {
      console.log('AI chunk:', data);
    },
    onError(err) {
      console.error('Subscription error:', err);
    },
    onComplete() {
      console.log('Subscription complete');
      wsClient.close();
    },
  });
}

main();
