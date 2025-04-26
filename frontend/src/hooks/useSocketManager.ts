import { useState, useEffect, useRef } from 'react';
import io, { Socket } from 'socket.io-client';
import { Message } from '../types'; // Import Message type

const SOCKET_URL = 'http://localhost:5001'; // Your backend URL

export function useSocketManager(
    setMessages: React.Dispatch<React.SetStateAction<Message[]>>,
    setIsLoading: React.Dispatch<React.SetStateAction<boolean>>,
    setError: React.Dispatch<React.SetStateAction<string | null>>,
    scrollToBottom: () => void
) {
    const [isConnected, setIsConnected] = useState(false);
    const socketRef = useRef<Socket | null>(null);

    useEffect(() => {
        // Initialize socket connection if not already connected
        if (!socketRef.current) {
            console.log(">>> SOCKET: Initializing connection...");
            socketRef.current = io(SOCKET_URL, {
                transports: ["websocket"],
                reconnectionAttempts: 5,
                reconnectionDelayMax: 5000,
                reconnection: true,
                timeout: 20000
            });
        }

        const currentSocketInstance = socketRef.current;

        // --- Event Listeners ---
        const handleConnect = () => {
            console.log('>>> SOCKET: Connected, ID:', currentSocketInstance.id);
            setIsConnected(true);
            setError(null);
        };

        const handleDisconnect = (reason: Socket.DisconnectReason) => {
            console.log('>>> SOCKET: Disconnected, reason:', reason);
            setIsConnected(false);
            if (reason !== 'io client disconnect') {
                setError('Disconnected. Trying to reconnect...');
            }
        };

        const handleConnectError = (err: Error) => {
            console.error('>>> SOCKET: Connection Error:', err);
            setError(`Connection failed: ${err.message}`);
            setIsConnected(false);
            setIsLoading(false); // Ensure loading stops
        };

        const handleMessageChunk = (data: { chunk: string }) => {
            // Ensure loading is true when receiving chunks
            setIsLoading(true);
            setMessages((prevMessages) => {
                const lastMessage = prevMessages[prevMessages.length - 1];
                if (lastMessage && lastMessage.role === 'assistant') {
                    // Append chunk to the last assistant message
                    return [
                        ...prevMessages.slice(0, -1),
                        { ...lastMessage, content: lastMessage.content + data.chunk },
                    ];
                } else {
                    // Start a new assistant message
                    return [...prevMessages, { role: 'assistant', content: data.chunk }];
                }
            });
        };

        const handleStreamEnd = () => {
            console.log('>>> SOCKET: Received stream_end.');
            setIsLoading(false);
            // Ensure scroll happens after state update potentially finishes
            requestAnimationFrame(scrollToBottom);
        };

        const handleError = (data: { message: string }) => {
            console.error('>>> SOCKET: Received error event:', data.message);
            setError(`Server error: ${data.message}`);
            setIsLoading(false);
        };

        // Register listeners
        currentSocketInstance.on('connect', handleConnect);
        currentSocketInstance.on('disconnect', handleDisconnect);
        currentSocketInstance.on('connect_error', handleConnectError);
        currentSocketInstance.on('message_chunk', handleMessageChunk);
        currentSocketInstance.on('stream_end', handleStreamEnd);
        currentSocketInstance.on('error', handleError);

        // --- Cleanup ---
        return () => {
            console.log(">>> SOCKET: Cleaning up listeners.");
            currentSocketInstance.off('connect', handleConnect);
            currentSocketInstance.off('disconnect', handleDisconnect);
            currentSocketInstance.off('connect_error', handleConnectError);
            currentSocketInstance.off('message_chunk', handleMessageChunk);
            currentSocketInstance.off('stream_end', handleStreamEnd);
            currentSocketInstance.off('error', handleError);

            // Optional: Disconnect on final unmount if desired
            // if (socketRef.current) {
            //     console.log(">>> SOCKET: Disconnecting on unmount.");
            //     socketRef.current.disconnect();
            //     socketRef.current = null;
            // }
        };
        // Dependencies: Functions passed from App that might change if App re-renders unnecessarily
        // If they are stable (defined outside or wrapped in useCallback), this is fine.
    }, [setMessages, setIsLoading, setError, scrollToBottom]);

    // Function to send a message via the socket
    const sendMessage = (historyPayload: Message[]) => {
        const currentSocket = socketRef.current;
        if (currentSocket && isConnected) {
            console.log('>>> SOCKET: Emitting send_message.');
            currentSocket.emit('send_message', { history: historyPayload });
        } else {
            console.error(">>> SOCKET: Cannot send message, socket not ready or not connected.");
            setError("Cannot send message: Not connected.");
        }
    };

    return { isConnected, sendMessage };
}