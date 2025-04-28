import React, { useRef, FormEvent, useState, useEffect, useCallback, MouseEvent } from 'react'; // Added MouseEvent
import { AnimatePresence, motion } from "framer-motion";
import { useSocketManager } from './hooks/useSocketManager';
import useConversations from './hooks/useConversations'; // Import useConversations
import { Message, ConversationType } from './types'; // Import ConversationType
import "./index.css";
import FlashCardCreator from './components/FlashCardCreator';
import ChatInput from './components/ChatInput';
import MessageList from './components/MessageList';
import { addSystemMessage, addUserMessage } from './assets/prompts'; // Import message helpers

function App() {
    const initialSystemMessage = "You are a helpful assistant. Your name is sharesyllabus.me ai...";
    const messagesEndRef = useRef<null | HTMLDivElement>(null);
    const [input, setInput] = useState('');
    const [sidebarOpen, setSideBarOpen] = useState(true);
    const [flashcardModalOpen, setFlashcardModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // --- Use Conversations Hook ---
    const {
        conversations,
        currentConversationId,
        currentConversation,
        setCurrentConversationId,
        createConversation,
        updateConversationMessages,
        removeConversation,
        updateConversationTitle // Added for potential use
    } = useConversations();

    const scrollToBottom = () => {
        requestAnimationFrame(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        });
    };

    // --- Define Callback for Socket Manager ---
    const handleMessagesUpdate = useCallback((updater: (prevMessages: Message[]) => Message[]) => {
        if (currentConversationId) {
            // Pass the updater function directly to the conversation hook's update function
            updateConversationMessages(currentConversationId, updater); // This line passes the updater function
        } else {
            console.warn("handleMessagesUpdate called but no currentConversationId is set.");
        }
    }, [currentConversationId, updateConversationMessages]); // Dependencies

    // --- Use Socket Manager with Callback ---
    const { isConnected, sendMessage: sendSocketMessage } = useSocketManager(
        handleMessagesUpdate, // Pass the callback
        setIsLoading,
        setError,
        scrollToBottom
    );

    // --- Handle Sending User Message ---
    const handleSendMessage = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const trimmedInput = input.trim();
        if (!trimmedInput) return;

        let targetConversationId = currentConversationId;
        let messagesForSocket: Message[];

        // If no conversation is active, create one first
        if (!targetConversationId) {
            console.log("No active conversation, creating new one...");
            const newId = createConversation('normal', trimmedInput.substring(0, 30), [ // Use first part of input as title
                { role: 'system', content: initialSystemMessage },
                { role: 'user', content: trimmedInput }
            ]);
            setCurrentConversationId(newId); // Set it as current
            targetConversationId = newId;
            // Messages are already set in createConversation, prepare for socket
            messagesForSocket = [
                { role: 'system', content: initialSystemMessage },
                { role: 'user', content: trimmedInput }
            ];
            console.log("New conversation created and set as current:", newId);
        } else if (currentConversation) {
            // Add message to existing conversation
            const userMessage: Message = { role: 'user', content: trimmedInput };
            // Use functional update for safety, though direct array might work here
            updateConversationMessages(targetConversationId, (prevMessages) => [...prevMessages, userMessage]);
            // Prepare messages for socket based on the *expected* next state
            messagesForSocket = [...currentConversation.messages, userMessage];
        } else {
            console.error("Current conversation ID set but conversation not found.");
            setError("Error sending message: Conversation context lost.");
            return; // Should not happen ideally
        }

        // Send the prepared history to the server
        if (sendSocketMessage(messagesForSocket)) {
            setInput(''); // Clear input on successful send attempt
        }
    };

    // --- Handle Flashcard Creation ---
    const handleFlashcardCreation = async (fileTexts: { fileName: string; text: string | any }[]) => {
        console.log("Starting flashcard creation with files:", fileTexts.map(f => f.fileName));

        // 1. Create a new conversation of type "flashcard"
        const title = `Flashcards: ${fileTexts.map(f => f.fileName).join(", ")}`;
        // Start with only the base system message
        const newConversationId = createConversation('flashcard', title, [
            { role: 'system', content: initialSystemMessage }
        ]);
        setCurrentConversationId(newConversationId); // Switch to the new conversation

        // 2. Prepare messages to send (system info + user prompt)
        let messagesToSend: Message[] = [{ role: 'system', content: initialSystemMessage }];

        const systemInfoMsg = `Flashcard creation initiated for: ${fileTexts.map((file) => file.fileName).join(", ")}`;
        messagesToSend = addSystemMessage(messagesToSend, systemInfoMsg);

        const prompt = `Please create flashcards from these files: ${fileTexts.map(file => {
            const textStr = typeof file.text === 'string' ? file.text :
                (file.text ? JSON.stringify(file.text) : 'No text extracted');
            // Limit text length per file if necessary
            return `\n\nFile: ${file.fileName}\n${textStr.substring(0, 10000)}${textStr.length > 10000 ? '...' : ''}`;
        }).join('')}\n\nGenerate flashcards in the format: [Term] tab [Definition], new line between rows.`;
        messagesToSend = addUserMessage(messagesToSend, prompt);

        // 3. Update the newly created conversation state with these initial messages
        updateConversationMessages(newConversationId, messagesToSend);

        // 4. Send the prepared messages to the server
        sendSocketMessage(messagesToSend);

        setFlashcardModalOpen(false); // Close modal
        console.log("Flashcard conversation created and initial prompt sent.");
    };

    // --- Handle Creating/Switching Conversations ---
    const createNewConversation = (type: ConversationType = 'normal') => {
        if (type === 'flashcard') {
            setFlashcardModalOpen(true); // Open modal to select files
        } else {
            // Create a standard new chat
            const newId = createConversation(type, 'New Chat', [
                { role: 'system', content: initialSystemMessage }
            ]);
            setCurrentConversationId(newId); // Switch to the new conversation
            setError(null); // Clear any previous errors
            setInput(''); // Clear input field
            console.log("Created new conversation, ID:", newId);
        }
    };

    // --- Handle Deleting Conversation ---
    const handleDeleteConversation = (e: MouseEvent<HTMLButtonElement>, idToDelete: string) => {
        e.stopPropagation(); // Prevent the click from selecting the conversation
        console.log("Deleting conversation:", idToDelete);
        removeConversation(idToDelete);
    };

    // Determine messages to display based on current conversation
    const displayMessages = currentConversation?.messages ?? [];

    // Determine if initial cards should be shown
    // Show cards if no conversation is selected OR if the current one is 'normal' and only has the system message
    const showInitialCards = !currentConversationId ||
                             (currentConversation?.type === 'normal' &&
                              currentConversation.messages.length <= 1 &&
                              (currentConversation.messages.length === 0 || currentConversation.messages[0].role === 'system'));


    // --- Render JSX ---
    return (
        <div className="flex w-screen h-screen bg-white dark:bg-gray-900"> {/* Added base background */}
            {/* Sidebar */}
            <motion.div
                initial={{ width: sidebarOpen ? "20em" : "3.25em" }}
                animate={{ width: sidebarOpen ? "20em" : "3.25em" }}
                transition={{ duration: 0.3, type: "spring", stiffness: 400, damping: 35 }}
                className="flex p-1 flex-col border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 border-r overflow-hidden h-full flex-shrink-0"
            >
                {/* Sidebar Header */}
                <div className="w-full text-xl p-1.5 rounded-md flex items-center justify-between flex-shrink-0">
                    <button
                        onClick={() => setSideBarOpen(!sidebarOpen)}
                        className="text-gray-700 dark:text-gray-300 font-bold flex items-center justify-center rounded-md material-symbols-rounded p-1 hover:bg-gray-200 dark:hover:bg-gray-700"
                    >
                        {sidebarOpen ? "menu_open" : "menu"}
                    </button>
                    {sidebarOpen && (
                        <button
                            onClick={() => createNewConversation('normal')}
                            className="flex gap-1 text-lg font-semibold bg-green-100 text-green-800 border rounded-full p-1 cursor-pointer items-center justify-center"
                        >
                            <span className="material-symbols-rounded flex flex-col items-center justify-center">add</span>
                        </button>
                    )}
                </div>
                {/* Conversation List */}
                {sidebarOpen && (
                    <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
                        {[...conversations]
                          .sort((a, b) => b.updatedAt - a.updatedAt)
                          .map(convo => (
                            <div
                                key={convo.id}
                                onClick={() => setCurrentConversationId(convo.id)}
                                className={`group flex items-center justify-between p-2 rounded cursor-pointer text-sm ${
                                    currentConversationId === convo.id
                                        ? 'bg-blue-200 dark:bg-blue-700 font-semibold'
                                        : 'hover:bg-gray-200 dark:hover:bg-gray-700'
                                } text-gray-800 dark:text-gray-200`}
                                title={convo.title}
                            >
                                <span className="truncate flex-1 mr-2">{convo.title || "Untitled Chat"}</span>
                                <button
                                    onClick={(e) => handleDeleteConversation(e, convo.id)}
                                    className="material-symbols-rounded text-base text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                                    title="Delete conversation"
                                >
                                    delete
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </motion.div>

            {/* Main Chat Area */}
            <div className="flex flex-1 relative p-2 flex-col h-screen overflow-hidden"> {/* Added overflow-hidden */}
                {/* Top Bar */}
                <motion.div
                    layout
                    className="grid grid-cols-3 sticky top-0 items-center justify-between backdrop-blur-md p-1 z-10 flex-shrink-0" // Changed to grid layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                >
                    {/* Left Section: AI Name */}
                    <div className="flex items-center justify-start text-lg text-gray-700 dark:text-gray-200 font-semibold">
                        sharesyllabus.me AI
                    </div>

                    {/* Middle Section: Conversation Title */}
                    <div className="flex items-center justify-center text-lg text-gray-700 dark:text-gray-200 font-semibold truncate">
                        {currentConversation?.title || "Untitled Conversation"}
                    </div>

                    {/* Right Section: Connection Status */}
                    <div className="flex items-center justify-end gap-2">
                        <div
                            className={`w-3 h-3 rounded-full self-center ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}
                            title={isConnected ? 'Connected' : 'Disconnected'}
                        ></div>
                    </div>
                </motion.div>

                {/* Message Display Area */}
                <div className="flex-1 overflow-y-auto pb-24"> {/* Ensure this scrolls */}
                    {showInitialCards ? (
                        <div className="flex-1 overflow-y-auto">
                            {/* ... Initial Cards View (as before) ... */}
                             <div className="flex place-items-center w-full h-full justify-center">
                                <motion.div
                                    className="grid grid-cols-2 w-full md:w-3/4 lg:w-1/2 gap-4"
                                    initial="hidden" animate="visible" variants={{ /* ... */ }}
                                >
                                    {[
                                        { title: "Flashcards Maker", description: "Create flashcards for studying.", icon: "cards_star", type: "flashcard" },
                                        { title: "Deep Research", description: "Conduct in-depth research.", icon: "history_edu", type: "research" },
                                        { title: "Writing Helper", description: "Get assistance with writing tasks.", icon: "stylus_note", type: "normal" },
                                        { title: "Custom Tool", description: "Explore custom functionalities.", icon: "star", type: "custom" },
                                    ].map((card, index) => (
                                        <motion.div
                                            key={index}
                                            onClick={() => createNewConversation(card.type as ConversationType)} // Use updated function
                                            className="p-4 rounded-lg shadow-inner bg-gray-50 dark:bg-gray-700 cursor-pointer aspect-square flex flex-col justify-center items-center text-center"
                                            variants={{ /* ... */ }} whileHover={{ /* ... */ }}
                                        >
                                            <span className="material-symbols-rounded text-4xl mb-2 text-gray-700 dark:text-gray-300">{card.icon}</span>
                                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">{card.title}</h3>
                                            <p className="text-sm text-gray-600 dark:text-gray-400">{card.description}</p>
                                        </motion.div>
                                    ))}
                                </motion.div>
                            </div>
                        </div>
                    ) : (
                        // Pass messages from the current conversation
                        <MessageList
                            messages={displayMessages.filter(m => m.role !== 'system')}
                            messagesEndRef={messagesEndRef}
                            isLoading={isLoading}
                            isConnected={isConnected}
                            conversationType={currentConversation?.type || 'normal'}
                        />
                    )}
                    {/* Debugging info */}
                    
                </div>

                {/* Thinking Indicator */}
                {isLoading && isConnected && (
                    <div className="p-2 text-center text-gray-500 dark:text-gray-400 text-sm flex-shrink-0"> {/* Adjusted padding/size */}
                        Assistant is thinking...
                    </div>
                )}

                {/* Input Area */}
                <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-white dark:from-gray-900 to-transparent z-10"> {/* Ensure it's above messages */}
                    <ChatInput
                        input={input}
                        setInput={setInput}
                        handleSendMessage={handleSendMessage} // Uses updated handler
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
                        onFlashcardCreation={handleFlashcardCreation} // Uses updated handler
                    />
                )}
            </AnimatePresence>
        </div>
    );
}

export default App;
