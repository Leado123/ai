import { io } from 'socket.io-client';
import { createServer } from 'http';
import { Server } from 'socket.io';

// Create a simple HTTP server
const httpServer = createServer();
const ioServer = new Server(httpServer, {
    cors: {
        origin: "*"
    }
});

// Setup server
ioServer.on('connection', (socket) => {
    console.log(`[Server] New connection with id ${socket.id}`);
    
    socket.on('available', () => {
        console.log(`[Server] Client ${socket.id} sent 'available' event`);
        
        // Send a test request after 1 second
        setTimeout(() => {
            console.log(`[Server] Sending 'request' event to ${socket.id}`);
            socket.emit('request', { 
                id: 'test-id', 
                payload: [{ role: "user", content: "Test message" }]
            });
        }, 1000);
    });
    
    socket.on('response_chunk_test-id', (data) => {
        console.log(`[Server] Received response chunk:`, data);
    });
    
    socket.on('response_end_test-id', () => {
        console.log(`[Server] Response ended`);
        process.exit(0);
    });
});

// Start the server
const PORT = 3003;
httpServer.listen(PORT, () => {
    console.log(`[Server] Listening on port ${PORT}`);
    
    // Create a client that connects to this server
    const socket = io(`http://localhost:${PORT}`, {
        transports: ['websocket']
    });
    
    socket.on('connect', () => {
        console.log(`[Client] Connected with id ${socket.id}`);
        socket.emit('available');
    });
    
    socket.on('request', (data) => {
        console.log(`[Client] Received request:`, data);
        
        // Send a response
        socket.emit(`response_chunk_${data.id}`, "This is a test response");
        setTimeout(() => {
            socket.emit(`response_end_${data.id}`);
            console.log(`[Client] Response sent`);
        }, 500);
    });
    
    socket.on('disconnect', () => {
        console.log(`[Client] Disconnected`);
    });
});
