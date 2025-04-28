import React, { FormEvent } from 'react';
import { motion } from 'framer-motion';
import { Button, Menu, MenuItem, MenuTrigger, Popover } from 'react-aria-components';

interface ChatInputProps {
    input: string;
    setInput: (value: string) => void;
    handleSendMessage: (e: FormEvent<HTMLFormElement>) => void;
    isLoading: boolean;
    isConnected: boolean;
    error: string | null;
    flashcardModalOpen: boolean;
    setFlashcardModalOpen: (open: boolean) => void;
}

const ChatInput: React.FC<ChatInputProps> = ({
    input,
    setInput,
    handleSendMessage,
    isLoading,
    isConnected,
    error,
    setFlashcardModalOpen
}) => {


    return (
        <div className="sticky bottom-0 left-0 w-full flex justify-center p-4 "> {/* Added gradient */}
            <div className="w-full md:w-3/4 lg:w-1/2 relative backdrop-blur-sm bg-[rgba(255,255,255,0.8)] dark:bg-[rgba(55,65,81,0.8)] p-4 border border-gray-200 dark:border-gray-700 shadow-lg rounded-3xl"> {/* Adjusted rounding */}
                <form onSubmit={handleSendMessage} className="flex flex-col items-center gap-2">
                    {/* Input Field */}
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder={isConnected ? "Type your message..." : "Connecting..."}
                        disabled={!isConnected || isLoading}
                        className="w-full p-2 focus:outline-none bg-transparent dark:text-white placeholder-gray-500 dark:placeholder-gray-400" // Added placeholder styles
                    />
                    {/* Buttons Row */}
                    <div className="flex w-full text-gray-500 dark:text-gray-400 gap-2 items-center">
                        {/* Attachment Menu */}
                        <MenuTrigger>
                            <Button className="p-2 border border-gray-300 dark:border-gray-600 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full flex aspect-square material-symbols-rounded" aria-label="Menu">add</Button>
                            <Popover className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg">
                                <Menu className="outline-none p-1">
                                    <MenuItem className="flex items-center gap-2 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded cursor-pointer outline-none text-gray-800 dark:text-white" onAction={() => alert('Google Drive (coming soon)')}>
                                        <span className="material-symbols-rounded">add_to_drive</span> Google Drive
                                    </MenuItem>
                                    <MenuItem className="flex items-center gap-2 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded cursor-pointer outline-none text-gray-800 dark:text-white" onAction={() => alert('Outlook (coming soon)')}>
                                        <span className="material-symbols-rounded">filter_drama</span> Outlook
                                    </MenuItem>
                                    <MenuItem className="flex items-center gap-2 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded cursor-pointer outline-none text-gray-800 dark:text-white" onAction={() => alert('Upload From Computer')}>
                                        <span className="material-symbols-rounded">attach_file</span> Upload
                                    </MenuItem>
                                </Menu>
                            </Popover>
                        </MenuTrigger>

                        {/* Quick Action Buttons - Consider making this a separate component too */}
                        <motion.div
                            layout
                            initial={{ opacity: 0, x: -20, gap: "0px" }}
                            animate={{ opacity: 1, x: 0, gap: "0.5rem" }}
                            className="flex overflow-hidden" // Added overflow-hidden
                            transition={{ staggerChildren: 0.1, ease: "circInOut" }}
                        >
                            {/* Example Button */}

                            <motion.button
                                type="button" // Prevent form submission
                                layout
                                onClick={() => setFlashcardModalOpen(true)}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.3, ease: "circInOut" }}
                                className="bg-blue-600 text-white flex items-center p-2 rounded-full border border-blue-700 font-semibold gap-1 hover:bg-blue-700 cursor-pointer text-sm whitespace-nowrap" // Added whitespace-nowrap
                            >
                                <span className="material-symbols-rounded text-base">cards_star</span>
                                flashcards maker
                            </motion.button>
                            {/* Add other buttons similarly */}
                        </motion.div>

                        <div className="flex-1"></div> {/* Spacer */}

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={isLoading || !input.trim() || !isConnected}
                            className={`bg-black dark:bg-blue-600 rounded-full cursor-pointer p-2 aspect-square text-white material-symbols-rounded transition-opacity duration-200 ${(!input.trim() || !isConnected || isLoading) ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-700 dark:hover:bg-blue-700'}`}
                            aria-label="Send message"
                        >
                            arrow_upward
                        </button>
                    </div>
                </form>
                {/* Connection Error Display */}
                {error && !isConnected && (
                    <div className="text-red-500 text-xs mt-2 text-center">{error}</div>
                )}
            </div>
        </div>
    );
};

export default ChatInput;