import { createServer, Server as HTTPServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { v4 } from 'uuid';

export interface Message {
    role: string;
    content: string;
}

interface ProviderConnection {
    ws: WebSocket;
    uid: string;
}

export class ServerSocket {
    public static instance: ServerSocket;
    public wss: WebSocketServer;
    public connections: ProviderConnection[];

    constructor(server: HTTPServer) {
        ServerSocket.instance = this;
        this.connections = [];
        this.wss = new WebSocketServer({ server });
        this.wss.on('connection', this.StartListeners);
        console.info('WebSocket server started');
    }

    StartListeners = (ws: WebSocket) => {
        const connection: ProviderConnection = {
            ws,
            uid: v4(),
        };
        this.connections.push(connection);
        console.log(`[ServerSocket] New provider connected (${connection.uid})`);

        ws.on('message', (data) => {
            let msg: any;
            try {
                msg = JSON.parse(data.toString());
            } catch (e) {
                console.error('[ServerSocket] Received invalid JSON:', data);
                return;
            }
            
        });

        ws.on('close', () => {
            this.connections = this.connections.filter(c => c !== connection);
            console.log(`[ServerSocket] Provider ${connection.uid} disconnected.`);
        });

        const fakeConversation = [
            { role: "user", content: "Hello, this is a test message." }
        ];
        
    };
}

export function requestResponse(conversation: Message[]): Promise<ReadableStream<string>> {
    return new Promise((resolve, reject) => {
        const checkConnection = () => {
            const connection = ServerSocket.instance?.connections[0];
            if (!connection) {
                console.log('[requestResponse] No provider available, retrying in 1 second...');
                setTimeout(checkConnection, 1000); // Retry after 1 second
                return;
            }

            const ws = connection.ws;
            const requestId = v4();
            let controller: ReadableStreamDefaultController<any>;
            const stream = new ReadableStream({
                start(ctrl) {
                    controller = ctrl;
                },
                cancel() {
                    ws.off('message', onMessage);
                }
            });

            const onMessage = (data: any) => {
                let msg: any;
                try {
                    msg = JSON.parse(data.toString());
                } catch (e) {
                    return;
                }
                if (msg.type === 'response_chunk' && msg.id === requestId) {
                    controller.enqueue(msg.content.message.content);
                }
                if (msg.type === 'response_end' && msg.id === requestId) {
                    ws.off('message', onMessage);
                    controller.close();
                }
                if (msg.type === 'response' && msg.id === requestId) {
                    ws.off('message', onMessage);
                    controller.close();
                }
                if (msg.type === 'response_error' && msg.id === requestId) {
                    ws.off('message', onMessage);
                    controller.error(new Error(msg.message));
                }
            };

            ws.on('message', onMessage);
            ws.send(JSON.stringify({ type: 'request', id: requestId, payload: conversation }));
            resolve(stream);
        };

        checkConnection(); // Initial check
    });
}

