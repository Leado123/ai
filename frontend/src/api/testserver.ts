// /config/ai-1/frontend/src/api/server/serverWs.test.ts

import { createServer, Server as HTTPServer } from 'http';
import { ServerSocket, requestResponse } from './serverWs'; // Assuming serverWs.ts is in the same directory

const TEST_PORT = 3002; // Use a different port for testing


async function runTest() {
    console.log('[Test] Starting test environment...');

    // 1. Create HTTP Server
    const httpServer: HTTPServer = createServer((req, res) => {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('Test WebSocket Server OK\n');
    });

    // 2. Initialize ServerSocket (WebSocket server)
    new ServerSocket(httpServer);
    console.log('[Test] ServerSocket initialized.');

    httpServer.listen(TEST_PORT, async () => {
        console.log(`[Test] HTTP and WebSocket server listening on port ${TEST_PORT}`);
        // Wait a bit for provider to connect
        setTimeout(async () => {
            const conversation = [
                { role: "user", content: "Write a 4 page essay about the effects of Ai on learning" }
            ];
            try {
                const response = await requestResponse(conversation);
                logReadableString(response).then(() => {
                console.log('\n[Test] Stream ended.');
                });
            } catch (err) {
                console.error('[Test] Error:', err);
            }
        }, 2000);
    });

    // Graceful shutdown for the server
    process.on('SIGINT', () => {
        console.log('\n[TestServer] SIGINT received. Shutting down HTTP server...');
        httpServer.close(() => {
            console.log('[TestServer] HTTP server closed.');
            process.exit(0);
        });
    });
}

// Run the test
runTest().catch(err => {
    console.error("[Test] Unhandled error in test execution:", err);
    process.exit(1);
});

async function logReadableString(readableString: ReadableStream<string>) {
    let fullContent = '';
    try {
        // @ts-expect-error
        for await (const chunk of readableString) {
            try {
                const parsed = typeof chunk === 'string' ? JSON.parse(chunk) : chunk;
                if (parsed?.message?.content) {
                    process.stdout.write(parsed.message.content);
                    fullContent += parsed.message.content;
                }
            } catch (e) {
                // Optionally log error, but skip verbose output
            }
        }
        // Optionally print a newline after all content
        console.log();
    } catch (error) {
        console.error("Error consuming ReadableString:", error);
    }
}
