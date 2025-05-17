import React, { useState } from 'react';
import { Message } from '../types';
import ReactMarkdown from 'react-markdown';
import Marquee from "react-fast-marquee";

interface MessageListProps {
    messages: Message[];
    messagesEndRef: React.RefObject<HTMLDivElement | null>;
    isLoading: boolean;
    isConnected: boolean;
    conversationType: string;
}

const MessageList: React.FC<MessageListProps> = ({
    messages,
    messagesEndRef,
    isLoading,
    isConnected,
    conversationType,
}) => {
    const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

    const toggleSection = (id: string) => {
        setExpandedSections(prev => ({
            ...prev,
            [id]: !prev[id]
        }));
    };

    return (
        <div
            className="flex-1 flex flex-col pt-20 place-items-center overflow-y-auto h-full w-full"
        >
            <div className="flex-1 h-full md:w-3/4 lg:w-1/2 pb-4">
                {messages.map((message, index) => {
                    if (message.role === 'system') return null;

                    const isUser = message.role === 'user';
                    const messageId = `message-${index}`;

                    // Special handling for the first user message in flashcard conversations
                    if (conversationType === 'flashcard' && isUser && index === 0) {
                        return (
                            <div
                                key={messageId}
                                className="flex justify-end mb-4"
                            >
                                <div className="p-3 text-lg border-gray-200 rounded-3xl bg-yellow-50 text-black border">
                                    <div className="font-bold mb-2">file(s) data for creating flashcard:</div>
                                    <div className="bg-blue-700 font-bold rounded-full text-white flex w-full">
                                        <Marquee speed={5}>{message.content}</Marquee>
                                    </div>
                                </div>
                            </div>
                        );
                    }

                    return (
                        <div key={messageId} className="justify-items-end mb-4">
                            <div
                                className={`p-3 border-gray-200 rounded-3xl ${isUser
                                    ? 'bg-gray-100 max-w-3/4 text-end justify-end text-black text-bold'
                                    : 'dark:bg-gray-700 dark:text-white'
                                    }`}
                            >
                                {message.role === 'assistant' ? (
                                    <div className="whitespace-pre-wrap text-black text-lg">
                                        {typeof message.content === 'string' ? (
                                            <ReactMarkdown
                                                components={{
                                                    ol: ({ children, ...props }) => (
                                                        <ol
                                                            {...props}
                                                            className=""
                                                        >
                                                            {children}
                                                        </ol>
                                                    ),
                                                    ul: ({ children, ...props }) => (
                                                        <ul
                                                            {...props}
                                                            className=""
                                                        >
                                                            {children}
                                                        </ul>
                                                    ),
                                                }}
                                            >
                                                {message.content}
                                            </ReactMarkdown>
                                        ) : (
                                            <div className="text-red-500">
                                                Error: Invalid message content
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="whitespace-pre-wrap flex justify-end text-end flex-col max-w-max ml-auto">
                                        {typeof message.content === 'string'
                                            ? message.content.split(/({.*?})/).map((part, i) => {
                                                const partId = `${messageId}-part-${i}`;

                                                if (part.startsWith('{') && part.endsWith('}')) {
                                                    const isExpanded = expandedSections[partId] || false;

                                                    return (
                                                        <div
                                                            key={i}
                                                            className="flex-col gap-2 bg-blue-500 rounded-md p-2 shadow-md text-white flex my-2"
                                                        >
                                                            <div
                                                                className="flex gap-2 cursor-pointer"
                                                                onClick={() => toggleSection(partId)}
                                                            >
                                                                <span className="material-symbols-rounded">
                                                                    {isExpanded ? 'expand_less' : 'expand_more'}
                                                                </span>
                                                                <div className="flex-1 font-bold">
                                                                    File content (click to {isExpanded ? 'collapse' : 'expand'})
                                                                </div>
                                                            </div>

                                                            {isExpanded && (
                                                                <div className="overflow-y-auto max-h-64 bg-blue-600 p-2 rounded mt-1">
                                                                    {part.slice(1, -1)}
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                } else {
                                                    return <div key={i}>{part}</div>;
                                                }
                                            })
                                            : 'No content'}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}

                {isLoading && isConnected && (
                    <div className="p-2 text-center text-sm text-gray-500 dark:text-gray-400">
                        Assistant is thinking...
                    </div>
                )}

                <div className="h-50" ref={messagesEndRef}></div>
            </div>
        </div>
    );
};

export default MessageList;