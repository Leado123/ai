// the client that connects to the server ws, and allows the server to send requests to the client to compute ai requests

import { WebSocket } from 'ws';
import ollama from "ollama";

// Define the Message interface
interface Message {
    role: string;
    content: string;
}

interface RequestPayload {
    id: string;
    payload: Message[];
}

const ws = new WebSocket('ws://localhost:3001');

ws.on('open', () => {
    console.log('[Provider] Connected to server ws://localhost:3001');
    // Optionally, send an available message
    ws.send(JSON.stringify({ type: 'available' }));
});

ws.on('close', (code, reason) => {
    console.log('[Provider] Disconnected from server:', code, reason.toString());
});

ws.on('error', (error) => {
    console.error('[Provider] Connection error:', error);
});

ws.on('message', async (data) => {
    let msg: any;
    try {
        msg = JSON.parse(data.toString());
    } catch (e) {
        console.error('[Provider] Received invalid JSON:', data);
        return;
    }
    if (msg.type === 'request') {
        const { id: requestId, payload: conversation } = msg;
        console.log(`[Provider] Received request ${requestId} with conversation:`, conversation);
        if (!conversation || !Array.isArray(conversation) || conversation.length === 0) {
            ws.send(JSON.stringify({ type: 'response_error', id: requestId, message: 'Invalid conversation payload' }));
            return;
        }
        try {
            // Simulate a response (replace with ollama.chat if needed)
            // const stream = await ollama.chat({ ... });
            // For now, just send a single response
            const response = await ollama.chat({
                model: "gemma3:1b",
                messages: conversation,
                stream: true
            })
            for await (const part of response) {
                ws.send(JSON.stringify({ type: 'response_chunk', id: requestId, content: part }));
                console.log(`[Provider] Sent chunk for request ${requestId}:`, part);
            }
            // Send end of response
            ws.send(JSON.stringify({ type: 'response_end', id: requestId }));
            console.log(`[Provider] Sent response for request ${requestId}`);
        } catch (error: any) {
            console.error(`[Provider] Error processing request ${requestId} with Ollama:`, error);
            ws.send(JSON.stringify({ type: 'response_error', id: requestId, message: error.message || 'Ollama processing error' }));
        }
    }
});

console.log('[Provider] Attempting to connect to server...');