import React from 'react';
import { motion } from 'framer-motion';

interface TopBarProps {
    isSidebarOpen: boolean;
    toggleSidebar: () => void;
    // Add props for model selection if needed
}

const TopBar: React.FC<TopBarProps> = ({ isSidebarOpen, toggleSidebar }) => {
    return (
        <motion.div
            layout // Animate layout changes
            className="flex sticky top-0 items-center backdrop-blur-xl z-10 py-2 px-2" // Added padding
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
        >
            {!isSidebarOpen && (
                <motion.button
                    layout
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 40 }}
                    exit={{ opacity: 0, width: 0 }}
                    onClick={toggleSidebar}
                    className="text-gray-700 dark:text-gray-300 font-bold flex items-center justify-center rounded-md h-10 w-10 material-symbols-rounded mr-2 hover:bg-gray-200 dark:hover:bg-gray-700" // Added hover
                    aria-label="Open sidebar"
                >
                    left_panel_open
                </motion.button>
            )}
            {/* Model Selector */}
            <motion.select
                layout
                className="text-xl text-gray-700 dark:text-white font-semibold bg-transparent border-none focus:outline-none appearance-none" // Added appearance-none
                // Add onChange handler and value prop for model selection state
            >
                <option>gemini 2.0 flash</option>
                {/* Add other model options */}
            </motion.select>
        </motion.div>
    );
};

export default TopBar;