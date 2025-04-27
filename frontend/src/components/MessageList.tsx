import React from 'react';
import { Message } from '../types';
import { motion } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { splitText } from "motion-plus";

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
            <div className="flex-1 w-4/5 pb-4">
                {messages.map((message, index) => {
                    if (message.role === 'system') return null;

                    const isUser = message.role === 'user';

                    return (
                        <motion.div
                            key={index}
                            layout
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}
                        >
                            <div
                                className={`max-w-3/4 p-4 border border-gray-200 rounded-3xl ${isUser
                                    ? 'bg-blue-50 text-black text-bold border'
                                    : 'bg-gray-100 dark:bg-gray-700 dark:text-white'
                                    }`}
                            >
                                {message.role === 'assistant' ? (
                                    <div className="whitespace-pre-wrap">
                                        <ReactMarkdown>{message.content}</ReactMarkdown>
                                    </div>
                                ) : (
                                    <div className="whitespace-pre-wrap flex flex-col">
                                        {message.content.split(/({.*?})/).map((part, i) =>
                                            part.startsWith('{') && part.endsWith('}') ? (
                                                <div className="flex-col gap-2 bg-blue-500 rounded-md p-2 shadow-md text-white flex">
                                                    <div className="flex gap-2">
                                                        <div key={i} className=" flex-1 font-black">
                                                            {"a whooolee lot of file data".split('').map((char, j) => (
                                                                <motion.span
                                                                    key={j}
                                                                    initial={{ y: 0 }}
                                                                    animate={{ y: [6, -6, 6] }}
                                                                    transition={{
                                                                        duration: 4, // Slowed down the animation
                                                                        repeat: Infinity,
                                                                        delay: j * 0.2, // Increased delay for a slower effect
                                                                    }}
                                                                    className="inline-block"
                                                                >
                                                                    {char}
                                                                </motion.span>
                                                            ))}
                                                        </div>

                                                    </div>
                                                    <div className="overflow-y-auto max-h-64">
                                                        {part.slice(1, -1)}
                                                    </div>
                                                </div>
                                            ) : (
                                                part
                                            )
                                        )}
                                    </div>
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

                {/* Add a spacer that's tall enough to prevent the ChatInput from covering content */}
                <div className="h-32" ref={messagesEndRef}></div>
            </div>
        </div>
    );
};

export default MessageList;