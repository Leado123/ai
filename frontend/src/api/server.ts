import { initTRPC } from '@trpc/server';
import { applyWSSHandler } from '@trpc/server/adapters/ws';
import { WebSocketServer } from 'ws';
import { Server } from 'http';
import { ServerSocket, requestResponse } from './serverWs';
import { observable } from '@trpc/server/observable';
import z from 'zod';

// --- tRPC setup ---
const t = initTRPC.create();
const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
    sendChatMessage: publicProcedure
        .input(z.array(z.object({
            role: z.string(),
            content: z.string(),
        })))
        .subscription(({ input }) => {
            return observable<string>((emit) => {
                let cancelled = false;
                let reader: ReadableStreamDefaultReader<string> | undefined;

                (async () => {
                    try {
                        const stream = await requestResponse(input);
                        reader = stream.getReader();
                        while (!cancelled) {
                            const { value, done } = await reader.read();
                            if (done) break;
                            emit.next(value);
                        }
                        emit.complete();
                    } catch (err) {
                        emit.error(err);
                    }
                })();

                return () => {
                    cancelled = true;
                    if (reader) reader.cancel();
                };
            });
        }),
});

export type AppRouter = typeof appRouter;

// --- HTTP & WebSocket server for tRPC ---
const trpcHttpServer = new Server();
const trpcWss = new WebSocketServer({ server: trpcHttpServer });

applyWSSHandler({
    wss: trpcWss,
    router: appRouter,
    createContext: () => ({}),
});

trpcHttpServer.listen(3000, () => {
    console.log('tRPC WebSocket server running on ws://localhost:3000');
});

// --- HTTP & WebSocket server for Providers ---
const providerHttpServer = new Server();
// Initialize your ServerSocket with the new HTTP server for providers
new ServerSocket(providerHttpServer); // ServerSocket will create its own WebSocketServer

providerHttpServer.listen(3001, () => {
    console.log('Provider WebSocket server running on ws://localhost:3001');
});

