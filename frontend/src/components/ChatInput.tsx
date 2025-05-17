import React, { FormEvent, useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import {motion} from "framer-motion";
import { Button, Menu, MenuItem, MenuTrigger, Popover } from 'react-aria-components';
import { Layers, Plus, Telescope } from 'lucide-react';

interface ChatInputProps {
    input: string;
    setInput: (value: string) => void;
    handleSendMessage: (e: FormEvent<HTMLFormElement>) => void;
    isLoading: boolean;
    isConnected: boolean;
    error: string | null;
    flashcardModalOpen: boolean;
    setFlashcardModalOpen: (open: boolean) => void;
    setUseResearch: (useResearch: boolean) => void;
    useResearch: boolean;
}


const ChatInput: React.FC<ChatInputProps> = ({
    input,
    setInput,
    handleSendMessage,
    isLoading,
    isConnected,
    error,
    setFlashcardModalOpen,
    setUseResearch,
    useResearch
}) => {
    const buttonContainerRef = useRef<HTMLDivElement>(null);
    const researchButtonRef = useRef<HTMLButtonElement>(null);
    const quizletButtonRef = useRef<HTMLButtonElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Set up button animations
    useEffect(() => {
        if (buttonContainerRef.current) {
            // Container animation
            gsap.fromTo(
                buttonContainerRef.current,
                { opacity: 0, x: -20 },
                {
                    opacity: 1,
                    x: 0,
                    duration: 0.5,
                    ease: "back.out(1.7)"
                }
            );

            // Staggered button animations
            const buttons = [researchButtonRef.current, quizletButtonRef.current];
            gsap.fromTo(
                buttons,
                { opacity: 0, x: -20 },
                {
                    opacity: 1,
                    x: 0,
                    duration: 0.3,
                    stagger: 0.1,
                    ease: "power2.out"
                }
            );
        }
    }, []);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault(); // Prevent newline
            handleSendMessage(e as any); // Submit form
        }
    };

    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
        }
    }, [input]);

    return (
        <div className="sticky bottom-0 left-0 w-full flex justify-center p-4">
            <div className="w-full md:w-3/4 lg:w-1/2 relative backdrop-blur-sm bg-[rgba(255,255,255,0.8)] dark:bg-[rgba(55,65,81,0.8)] p-4 border border-gray-300 dark:border-gray-700 shadow-lg rounded-4xl">
                <form onSubmit={handleSendMessage} className="flex flex-col items-center gap-2">
                    {/* Input Field */}
                    <textarea
                        ref={textareaRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder={isConnected ? "Ask Anything" : "Connecting..."}
                        disabled={!isConnected || isLoading}
                        className="w-full p-2 focus:outline-none bg-transparent dark:text-white placeholder-gray-500 dark:placeholder-gray-400 resize-none overflow-y-auto"
                        rows={1}
                        style={{
                            lineHeight: "1.5",
                            maxHeight: "150px",
                            height: "auto",
                        }}
                        onKeyDown={handleKeyDown}
                    />
                    {/* Buttons Row */}
                    <div className="flex w-full text-gray-500 dark:text-gray-400 gap-2 items-center">
                        {/* Attachment Menu */}
                        <MenuTrigger>
                            <Button className="p-1.5 border border-gray-300 dark:border-gray-600 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full flex aspect-square material-symbols-rounded" aria-label="Menu"><Plus strokeWidth={1.5} /></Button>
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

                        {/* Quick Action Buttons */}
                        <motion.div
                            ref={buttonContainerRef}
                            layout
                            initial={{ opacity: 0, x: -20, gap: "0px" }}
                            animate={{ opacity: 1, x: 0, gap: "0.5rem" }}
                            className="flex overflow-hidden"
                            transition={{ staggerChildren: 0.1, ease: "circInOut" }}
                        >
                            <motion.button
                                ref={researchButtonRef}
                                type="button"
                                layout
                                onClick={() => setUseResearch(!useResearch)}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.3, ease: "circInOut" }}
                                className={`flex items-center p-2 gap-1 rounded-full border cursor-pointer text-sm whitespace-nowrap ${
                                    useResearch ? 'bg-blue-100 text-blue-400 border-blue-100' : 'border-gray-300 text-gray-600 '
                                }`}
                                aria-pressed={useResearch}
                            >
                                <Telescope size={16}/>
                                Research
                            </motion.button>

                            <motion.button
                                ref={quizletButtonRef}
                                type="button"
                                layout
                                onClick={() => setFlashcardModalOpen(true)}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.3, ease: "circInOut" }}
                                className=" text-gray-600 flex items-center p-2 gap-2  border-gray-300 rounded-full border cursor-pointer text-sm whitespace-nowrap"
                            >
                                <Layers size={16} />
                                Quizlet/Knowt Maker
                            </motion.button>
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