import React from 'react';
import { Message } from '../types';
import { motion } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import ChatInput from './ChatInput';

interface MessageListProps {
    messages: Message[];
    messagesEndRef: React.RefObject<HTMLDivElement | null>;
    input: string;
    setInput: (input: string) => void;
    handleSendMessage: (e: React.FormEvent<HTMLFormElement>) => void;
    isLoading: boolean;
    isConnected: boolean;

}

const MessageList: React.FC<MessageListProps> = ({ 
    messages, 
    messagesEndRef, 

    isLoading,
    isConnected,

}) => {
    return (
        <div className="flex-1 flex flex-col place-items-center overflow-y-auto h-full w-full">
            {/* Scrollable message area that takes all available space except for the input */}
            <div className="flex-1  w-4/5">
                {messages.map((message, index) => {
                    if (message.role === 'system') return null;
                    
                    const isUser = message.role === 'user';
                    
                    return (
                        <motion.div
                            key={index}
                            layout
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}
                        >
                            <div 
                                className={`max-w-3/4 p-4 border border-gray-200 rounded-3xl ${
                                    isUser 
                                        ? 'bg-blue-50 text-black text-bold border' 
                                        : 'bg-gray-100 dark:bg-gray-700 dark:text-white'
                                }`}
                            >
                                {message.role === 'assistant' ? (
                                    <div className="whitespace-pre-wrap">
                                        <ReactMarkdown>{message.content}</ReactMarkdown>
                                    </div>
                                ) : (
                                    <div className="whitespace-pre-wrap">{message.content}</div>
                                )}
                            </div>
                        </motion.div>
                    );
                })}
                
                {/* Thinking indicator */}
                {isLoading && isConnected && (
                    <div className="p-2 text-center text-sm text-gray-500 dark:text-gray-400">
                        Assistant is thinking...
                    </div>
                )}
                
                <div ref={messagesEndRef} />
            </div>
            
            {/* Input area fixed at the bottom */}
            
        </div>
    );
};

export default MessageList;