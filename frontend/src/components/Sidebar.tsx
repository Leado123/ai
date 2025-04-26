import React from 'react';
import { motion } from 'framer-motion'; // Assuming you use framer-motion based on usage

interface SidebarProps {
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
    isConnected: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, setIsOpen, isConnected }) => {
    return (
        <motion.div
            initial={false} // Prevent initial animation on load if desired
            animate={{ width: isOpen ? 200 : 0, opacity: isOpen ? 1 : 0 }}
            transition={{ duration: 0.3 }}
            className={`flex flex-col border-gray-200 bg-gray-100 dark:bg-gray-800 border-r overflow-hidden ${isOpen ? 'p-2' : ''}`} // Add padding only when open
            style={{ width: isOpen ? '200px' : '0px' }} // Explicit width for motion
        >
            {/* Ensure content inside doesn't cause overflow when hidden */}
            <div className="min-w-[184px]"> {/* Content wrapper with min-width */}
                <div className="w-full text-4xl rounded-md flex items-center mb-4"> {/* Added items-center and margin */}
                    <button
                        onClick={() => setIsOpen(false)} // Changed to close action
                        className="text-gray-700 dark:text-gray-300 font-bold flex items-center justify-center rounded-md w-10 h-10 material-symbols-rounded hover:bg-gray-200 dark:hover:bg-gray-700"
                        aria-label="Close sidebar"
                    >
                        left_panel_close {/* Changed icon */}
                    </button>
                    <div className="flex-1"></div>
                    <div
                        className={`w-3 h-3 rounded-full self-center mr-2 ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}
                        title={isConnected ? 'Connected' : 'Disconnected'}
                    ></div>
                </div>
                {/* Placeholder for other sidebar content */}
                <div className="flex-1 overflow-y-auto">
                    <p className="text-sm text-gray-600 dark:text-gray-400 p-2">History items...</p>
                    {/* Add history list, new chat button etc. here */}
                </div>
            </div>
        </motion.div>
    );
};

export default Sidebar;