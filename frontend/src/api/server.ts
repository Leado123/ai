import { initTRPC } from '@trpc/server';
import { applyWSSHandler } from '@trpc/server/adapters/ws';
import express from "express";
import cors from "cors";
import { Server } from "@grpc/grpc-js"
import ollama from "ollama";
import { createExpressMiddleware } from '@trpc/server/adapters/express';
import { WebSocketServer } from "ws"
import { createOllama } from "ollama-ai-provider";
import { generateText, streamText } from 'ai';
import { observable } from '@trpc/server/observable';
import z from "zod";
import { LanguageModelV1 } from '@ai-sdk/provider';

export const t = initTRPC.create();
const app = express();


export const wss = new WebSocketServer({
    port: 3001,
});

export const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
    // Define your procedures here
    sendChatMessage: publicProcedure
        .input(z.array(z.object({
            role: z.string(),
            content: z.string(),
        })))
        .subscription(async ({ input }) => {
            // Load environment variables

            return observable<string>((emit) => {
                let cancelled = false;
                (async () => {
                    try {
                        console.log('[tRPC] Subscription started. Input:', input);
                        // Use google from AI SDK to query Gemini API
                        const textStream = await ollama.chat({ model: 'gemma3:1b', messages: input, stream: true })
       
                        if (!textStream) {
                            console.error('[tRPC] No textStream returned from streamText!');
                        } else {
                            let chunkCount = 0;
                            for await (const textPart of textStream) {
                                if (cancelled) break;
                                if (textPart) {
                                    chunkCount++;
                                    console.log(`[tRPC] Emitting chunk #${chunkCount}:`, textPart);
                                    emit.next(textPart.message.content);
                                }
                            }
                            if (!cancelled) {
                                console.log('[tRPC] Stream complete.');
                                emit.complete();
                            }
                        }
                    } catch (err) {
                        console.error('[tRPC] Stream error:', err);
                        if (!cancelled) {
                            emit.error(err);
                        }
                    }
                })();

                return () => {
                    cancelled = true;
                    console.log('[tRPC] Subscription cancelled by client.');
                };
            });
        }),
    // provider init
    providerInit: publicProcedure
        .input(z.object({
            models: z.array(z.string()),
        }))
        .subscription(async ({ input }) => {
            console.log('[tRPC] Provider init subscription started with models:', input.models);
            const ollamaProvider = createOllama({
                models: input.models,
                baseUrl: 'http://localhost:11434',
            });

            return observable<string>((emit) => {
                let cancelled = false;
                (async () => {
                    try {
                        console.log('[tRPC] Ollama provider initialized successfully.');
                        emit.next('Ollama provider initialized successfully.');
                    } catch (err) {
                        console.error('[tRPC] Error initializing Ollama provider:', err);
                        if (!cancelled) {
                            emit.error(err);
                        }
                    }
                })();

                return () => {
                    cancelled = true;
                    console.log('[tRPC] Provider init subscription cancelled by client.');
                };
            });
        }
    ),
});

export type AppRouter = typeof appRouter;

// GRPC


app.use(cors({ origin: "*" }));

app.use(
    '/trpc',
    createExpressMiddleware({
        router: appRouter,
        createContext: () => ({}),
    }),
);

const server = app.listen(3000)

applyWSSHandler({
    wss,
    router: appRouter,
    createContext: () => ({}),
});

