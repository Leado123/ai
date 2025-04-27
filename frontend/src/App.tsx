import React, { useRef, FormEvent, useState } from 'react';
import { AnimatePresence, motion } from "motion/react";
import { useMessages } from './assets/prompts';
import "./index.css";
import { Button, Menu, MenuItem, MenuTrigger, Popover } from 'react-aria-components';
import FlashCardCreator from './components/FlashCardCreator';
import ChatInput from './components/ChatInput';
import MessageList from './components/MessageList';

// --- App Component ---
function App() {
    const initialSystemMessage = "You are a helpful assistant. Your name is sharesyllabus.me ai...";
    const messagesEndRef = useRef<null | HTMLDivElement>(null);
    const [input, setInput] = useState('');
    const [sidebarOpen, setSideBarOpen] = useState(true);
    const [flashcardModalOpen, setFlashcardModalOpen] = useState(false);

    // Function to scroll to bottom of message container
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    // Use our centralized messages management hook
    const {
        messages,
        isLoading,
        error,
        isConnected,
        sendMessage,
        addSystemMessageToConversation
    } = useMessages(initialSystemMessage, scrollToBottom);

    // Handle form submission
    const handleSendMessage = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const trimmedInput = input.trim();

        if (sendMessage(trimmedInput)) {
            setInput(''); // Clear input only if message was sent successfully
        }
    };

    // Flash card creation callback
    const handleFlashcardCreation = (fileTexts: { fileName: string; text: string | any }[]) => {
        // First add a system message
        addSystemMessageToConversation(
            `Flashcard creation initiated for the following files: ${fileTexts
                .map((file) => file.fileName)
                .join(", ")}`
        );

        // Then send a user message to prompt the AI to create flashcards
        const prompt = `Please create flashcards from these files: ${fileTexts.map(file => {
            // Make sure text is a string before calling substring
            const textStr = typeof file.text === 'string' ? file.text :
                (file.text ? JSON.stringify(file.text) : 'No text extracted');

            // Now safely use substring on our guaranteed string
            return `\n\nFile: ${file.fileName}\n${textStr.substring(0, 30000)}${textStr.length > 30000 ? '...' : ''}`;
        }).join('')}\n\nGenerate flashcards in the format: tab between term and definition, and new line between rows. DO NOT make gaps between lines`;

        // Send the prompt to the AI
        sendMessage(prompt);
    };

    // --- Render JSX ---
    return (
        <div className="flex w-screen h-screen">
            {/* Sidebar */}
            <motion.div
                initial={{ width: sidebarOpen ? 200 : 50 }}
                animate={{ width: sidebarOpen ? 200 : 50 }}
                transition={{ duration: 0.5, type: "spring" }}
                className="flex flex-col border-gray-200 bg-gray-100 border-r overflow-hidden"
            >
                <div className="w-full text-4xl p-2 rounded-md flex items-center">
                    <button
                        onClick={() => setSideBarOpen(!sidebarOpen)}
                        className="text-gray-700 font-bold w-min flex items-center justify-center pl-1.5 pt-1 rounded-md material-symbols-rounded"
                    >
                        keyboard_command_key
                    </button>
                </div>
            </motion.div>

            {/* Main Chat Area */}
            <div className="flex flex-1 relative p-2 flex-col h-screen">
                {/* Top Bar */}
                <motion.div
                    layout
                    className="flex sticky top-0 items-center backdrop-blur-md "
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                >
                    
                    <motion.select
                        layout
                        className="text-xl text-gray-700 h-8 font-semibold  bg-transparent border-none focus:outline-none"
                    >
                        <option>deepseek-r1</option>
                        {/* Add other model options if needed */}
                    </motion.select>
                </motion.div>

                {/* Message Display Area - Conditionally show initial cards or message list */}
                {messages.length === 1 && messages[0].role === 'system' ? (
                    <div className="flex-1 overflow-y-auto">
                        <div className="flex place-items-center w-full h-full justify-center">
                            <motion.div
                                className="grid grid-cols-2 w-full md:w-3/4 lg:w-1/2 gap-4"
                                initial="hidden"
                                animate="visible"
                                variants={{
                                    hidden: { opacity: 0, scale: 0.8 },
                                    visible: {
                                        opacity: 1,
                                        scale: 1,
                                        transition: {
                                            staggerChildren: 0.1,
                                        },
                                    },
                                }}
                            >
                                {[
                                    { title: "Flashcards Maker", description: "Create flashcards for studying.", icon: "cards_star", hoverColor: "hover:bg-blue-600" },
                                    { title: "Deep Research", description: "Conduct in-depth research.", icon: "history_edu", hoverColor: "hover:bg-green-600" },
                                    { title: "Writing Helper", description: "Get assistance with writing tasks.", icon: "stylus_note", hoverColor: "hover:bg-orange-600" },
                                    { title: "Custom Tool", description: "Explore custom functionalities.", icon: "star", hoverColor: "hover:bg-purple-600" },
                                ].map((card, index) => (
                                    <motion.div
                                        key={index}
                                        className={`p-4 rounded-lg shadow-inner bg-gray-50 cursor-pointer aspect-square flex flex-col justify-center items-center text-center`}
                                        variants={{
                                            hidden: { opacity: 0, y: 20 },
                                            visible: { opacity: 1, y: 0 },
                                        }}
                                        whileHover={{ scale: 1.05, backgroundColor: "rgb(250, 250, 200)", transition: { duration: 0.3 } }}
                                    >
                                        <span className="material-symbols-rounded text-4xl mb-2">{card.icon}</span>
                                        <h3 className="text-lg font-bold">{card.title}</h3>
                                        <p className="text-sm text-gray-600">{card.description}</p>
                                    </motion.div>
                                ))}
                            </motion.div>
                        </div>
                    </div>
                ) : (
                    // Use the MessageList component when there are messages to display
                    <MessageList
                        messages={messages}
                        messagesEndRef={messagesEndRef}
                        input={input}
                        setInput={setInput}
                        handleSendMessage={handleSendMessage}
                        isLoading={isLoading}
                        isConnected={isConnected}
                    />
                )}

                {/* Thinking Indicator */}
                {isLoading && isConnected && (
                    <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                        Assistant is thinking...
                    </div>
                )}

                {/* Input Area */}
                <div className="absolute bottom-0 left-0 w-full p-4 bg-gradient-to-t from-gray-100 dark:from-gray-900 to-transparent">
                    <ChatInput
                        input={input}
                        setInput={setInput}
                        handleSendMessage={handleSendMessage}
                        isLoading={isLoading}
                        isConnected={isConnected}
                        error={error}
                        flashcardModalOpen={flashcardModalOpen}
                        setFlashcardModalOpen={setFlashcardModalOpen}
                    />
                </div>
            </div>

            {/* Flashcard Creator Modal */}
            <AnimatePresence>
                {flashcardModalOpen && (
                    <FlashCardCreator
                        setModalOpen={setFlashcardModalOpen}
                        onFlashcardCreation={handleFlashcardCreation}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}

export default App;
