import React from 'react';
import { Message } from '../types';
import { Markdown } from './Markdown';


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
    

    console.log(conversationType)

    

    return (
        <div
            className="flex-1 flex flex-col pt-20 place-items-center h-full w-full"
        >
            <div className="flex-1 h-full md:w-3/4 lg:w-1/2 pb-4">
                {messages.map((message, index) => {
                    if (message.role === 'system') return null;

                    const isUser = message.role === 'user';
                    const messageId = `message-${index}`;

                    // Special handling for the first user message in flashcard conversations
                    
                    

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
                                            <Markdown
                                                
                                            >
                                                {message.content}
                                            </Markdown>
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

                                                
                                                    return <div key={i}>{part}</div>;
                                                
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