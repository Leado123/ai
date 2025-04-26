import { useState, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from "socket.io-client";

// Define the WebSocket server URL
const SOCKET_SERVER_URL = "http://localhost:5001";

// Define the Message type
export interface Message {
    role: "system" | "user" | "assistant";
    content: string;
}

/**
 * Adds a system message to the messages array.
 * @param messages The current array of messages.
 * @param content The content of the system message.
 * @returns A new array of messages with the system message added.
 */
export const addSystemMessage = (messages: Message[], content: string): Message[] => {
    return [...messages, { role: "system", content }];
};

/**
 * Adds a user message to the messages array.
 * @param messages The current array of messages.
 * @param content The content of the user message.
 * @returns A new array of messages with the user message added.
 */
export const addUserMessage = (messages: Message[], content: string): Message[] => {
    return [...messages, { role: "user", content }];
};

/**
 * Adds an assistant message to the messages array.
 * @param messages The current array of messages.
 * @param content The content of the assistant message.
 * @returns A new array of messages with the assistant message added.
 */
export const addAssistantMessage = (messages: Message[], content: string): Message[] => {
    return [...messages, { role: "assistant", content }];
};

/**
 * Clears all messages and resets to the initial system message.
 * @param initialSystemMessage The initial system message to reset to.
 * @returns A new array containing only the initial system message.
 */
export const resetMessages = (initialSystemMessage: string): Message[] => {
    return [{ role: "system", content: initialSystemMessage }];
};

/**
 * Sends a file to the server for text extraction via HTTP.
 * @param file The file to upload.
 * @returns A promise that resolves with the extracted text.
 */
export const sendFileToServer = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(`${SOCKET_SERVER_URL}/extract_text`, {
        method: "POST",
        body: formData,
    });

    if (!response.ok) {
        throw new Error(`Failed to extract text for ${file.name}: ${response.statusText}`);
    }

    const data = await response.json();
    return data.text;
};

/**
 * Custom hook for managing messages and socket communication.
 * Provides state and functions for handling conversation with AI.
 * 
 * @param initialSystemMessage Initial system message to start the conversation
 * @param onScrollToBottom Callback to scroll to bottom when new messages arrive
 * @returns Object with message state and related functions
 */
export function useMessages(initialSystemMessage: string, onScrollToBottom?: () => void) {
    // State for conversation management
    const [messages, setMessages] = useState<Message[]>(resetMessages(initialSystemMessage));
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    
    // Socket reference
    const socketRef = useRef<Socket | null>(null);
    
    // Initialize socket connection
    useEffect(() => {
        if (!socketRef.current) {
            console.log(">>> SOCKET: Initializing connection from prompts.ts...");
            socketRef.current = io(SOCKET_SERVER_URL, {
                transports: ["websocket"],
                reconnectionAttempts: 5,
                reconnectionDelayMax: 5000,
                reconnection: true,
                timeout: 20000
            });
        }

        const socket = socketRef.current;

        // --- Socket Event Handlers ---
        socket.on('connect', () => {
            console.log('>>> SOCKET: Connected, ID:', socket.id);
            setIsConnected(true);
            setError(null);
        });

        socket.on('disconnect', (reason) => {
            console.log('>>> SOCKET: Disconnected, reason:', reason);
            setIsConnected(false);
            if (reason !== 'io client disconnect') {
                setError('Disconnected. Trying to reconnect...');
            }
        });

        socket.on('connect_error', (err) => {
            console.error('>>> SOCKET: Connection Error:', err);
            setError(`Connection failed: ${err.message}`);
            setIsConnected(false);
            setIsLoading(false);
        });

        socket.on('message_chunk', (data: { chunk: string }) => {
            setIsLoading(true);
            setMessages((prevMessages) => {
                const lastMessage = prevMessages[prevMessages.length - 1];
                if (lastMessage && lastMessage.role === 'assistant') {
                    return [
                        ...prevMessages.slice(0, -1),
                        { ...lastMessage, content: lastMessage.content + data.chunk },
                    ];
                } else {
                    return [...prevMessages, { role: 'assistant', content: data.chunk }];
                }
            });
        });

        socket.on('stream_end', () => {
            console.log('>>> SOCKET: Received stream_end.');
            setIsLoading(false);
            if (onScrollToBottom) {
                // Use requestAnimationFrame to ensure DOM updates before scrolling
                requestAnimationFrame(onScrollToBottom);
            }
        });

        socket.on('error', (data: { message: string }) => {
            console.error('>>> SOCKET: Received error event:', data.message);
            setError(`Server error: ${data.message}`);
            setIsLoading(false);
        });

        // Cleanup function
        return () => {
            console.log(">>> SOCKET: Cleaning up listeners from prompts.ts.");
            socket.off('connect');
            socket.off('disconnect');
            socket.off('connect_error');
            socket.off('message_chunk');
            socket.off('stream_end');
            socket.off('error');
            // We don't disconnect here to maintain connection across component changes
        };
    }, [onScrollToBottom]);

    /**
     * Sends a message to the server for AI processing
     * @param userMessage The user's message text
     */
    const sendMessage = useCallback((userMessage: string) => {
        const socket = socketRef.current;
        
        if (!userMessage.trim() || isLoading || !socket || !isConnected) {
            if (!socket || !isConnected) {
                setError("Cannot send message: Not connected.");
            }
            return false;
        }

        setError(null);
        // Add user message to state
        const updatedMessages = addUserMessage(messages, userMessage);
        setMessages(updatedMessages);
        setIsLoading(true);

        // Send message to server
        console.log('>>> SOCKET: Emitting send_message to server.');
        socket.emit('send_message', { history: updatedMessages });
        
        return true;
    }, [messages, isLoading, isConnected]);

    /**
     * Adds a system message directly to the conversation
     * @param content Message content
     */
    const addSystemMessageToConversation = useCallback((content: string) => {
        setMessages(prev => addSystemMessage(prev, content));
    }, []);

    /**
     * Reset the conversation to just the initial system message
     */
    const resetConversation = useCallback(() => {
        setMessages(resetMessages(initialSystemMessage));
    }, [initialSystemMessage]);

    return {
        messages,
        setMessages,
        isLoading,
        error,
        isConnected,
        socketRef,
        sendMessage,
        addSystemMessageToConversation,
        resetConversation
    };
}

/**
 * Process files for flashcard creation through the server
 * @param files Array of files to process
 * @param customPrompt Optional custom prompt for flashcard generation
 * @returns The extracted text results
 */
export const processFilesForFlashcards = async (
    files: File[],
    customPrompt?: string
): Promise<{ fileName: string; text: string }[]> => {
    try {
        const results = await Promise.all(
            files.map(async (file) => {
                const text = await sendFileToServer(file);
                return { fileName: file.name, text };
            })
        );
        
        // If we have a custom prompt, we could send it along with the extracted text
        // to generate flashcards - not implementing this part yet
        
        return results;
    } catch (error) {
        console.error("Error processing files:", error);
        throw error;
    }
};