import { useState, useEffect, useRef, useCallback } from 'react';
import io, { Socket } from 'socket.io-client';
import { Message } from '../types';

const SOCKET_URL = 'https://api.sharesyllabus.me'; // Your backend URL

// New signature: Takes an 'onMessagesUpdate' callback
export function useSocketManager(
    onMessagesUpdate: (updater: (prevMessages: Message[]) => Message[]) => void,
    setIsLoading: React.Dispatch<React.SetStateAction<boolean>>,
    setError: React.Dispatch<React.SetStateAction<string | null>>,
    scrollToBottom: () => void
) {
    const [isConnected, setIsConnected] = useState(false);
    const socketRef = useRef<Socket | null>(null);
    // No internal message state or messagesRef needed here

    // --- Event Handlers ---
    const handleConnect = useCallback(() => {
        console.log(">>> SOCKET: Connected successfully!");
        setIsConnected(true);
        setError(null);
    }, [setIsConnected, setError]);

    const handleDisconnect = useCallback((reason: Socket.DisconnectReason) => {
        console.log(`>>> SOCKET: Disconnected. Reason: ${reason}`);
        setIsConnected(false);
        if (reason === "io server disconnect") {
            socketRef.current?.connect();
        } else if (reason === "io client disconnect") {
             setError("Disconnected from server.");
        } else {
             setError("Connection lost. Attempting to reconnect...");
        }
    }, [setIsConnected, setError]);

    const handleConnectError = useCallback((err: Error) => {
        console.error(`>>> SOCKET: Connection Error: ${err.message}`);
        setIsConnected(false);
        setError(`Connection failed: ${err.message}`);
        setIsLoading(false);
    }, [setIsConnected, setError, setIsLoading]);

    const handleError = useCallback((data: { message: string }) => {
        console.error(`>>> SOCKET: Server Error: ${data.message}`);
        setError(`Server error: ${data.message}`);
        setIsLoading(false);
    }, [setError, setIsLoading]);

    // Modified handleMessageChunk to use the callback
    const handleMessageChunk = useCallback((data: { chunk: string }) => {
        if (!data || typeof data.chunk !== 'string' || data.chunk.length === 0) {
            console.log(">>> SOCKET: Received empty or invalid chunk, skipping.");
            return;
        }
        // Call the provided callback with an updater function
        onMessagesUpdate(prevMessages => {
            const currentMessages = Array.isArray(prevMessages) ? [...prevMessages] : [];
            const lastMessageIndex = currentMessages.length - 1;

            if (lastMessageIndex >= 0 && currentMessages[lastMessageIndex].role === 'assistant') {
                const updatedLastMessage = {
                    ...currentMessages[lastMessageIndex],
                    content: (currentMessages[lastMessageIndex].content || '') + data.chunk
                };
                return [
                    ...currentMessages.slice(0, lastMessageIndex),
                    updatedLastMessage
                ];
            } else {
                const newMessage: Message = { role: 'assistant', content: data.chunk };
                return [...currentMessages, newMessage];
            }
        });
        requestAnimationFrame(scrollToBottom);
    }, [onMessagesUpdate, scrollToBottom]);

    // Modified handleStreamEnd
    const handleStreamEnd = useCallback(() => {
        console.log('>>> STREAM END.');
        setIsLoading(false);
        scrollToBottom();
    }, [setIsLoading, scrollToBottom]);

    useEffect(() => {
        if (!socketRef.current) {
            console.log(">>> SOCKET: Initializing connection...");
            socketRef.current = io(SOCKET_URL, {
                transports: ["websocket"],
                reconnectionAttempts: 5,
                reconnectionDelayMax: 5000,
                timeout: 20000
            });
        }
        const currentSocketInstance = socketRef.current;

        // --- Register Event Listeners ---
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
        };
    }, [handleConnect, handleDisconnect, handleConnectError, handleMessageChunk, handleStreamEnd, handleError]);

    // sendMessage now just sends the payload
    const sendMessage = useCallback((historyPayload: Message[]) => {
        const currentSocket = socketRef.current;
        if (currentSocket && isConnected) {
            console.log('>>> SOCKET: Emitting send_message.');
            setIsLoading(true);
            setError(null);
            currentSocket.emit('send_message', { history: historyPayload });
            return true;
        } else {
            console.error(">>> SOCKET: Cannot send message, socket not ready or not connected.");
            setError("Cannot send message: Not connected.");
            setIsLoading(false);
            return false;
        }
    }, [isConnected, setIsLoading, setError]);

    // Return only connection status and the raw send function
    return { isConnected, sendMessage };
}