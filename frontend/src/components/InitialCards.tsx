import React from 'react';
import { motion } from 'framer-motion';
import { PromptCard } from '../types'; // Import type

const initialCardsData: PromptCard[] = [
    { title: "Flashcards Maker", description: "Create flashcards for studying.", icon: "cards_star" },
    { title: "Deep Research", description: "Conduct in-depth research.", icon: "history_edu" },
    { title: "Writing Helper", description: "Get assistance with writing tasks.", icon: "stylus_note" },
    { title: "Custom Tool", description: "Explore custom functionalities.", icon: "star" },
];

const containerVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: {
        opacity: 1,
        scale: 1,
        transition: {
            staggerChildren: 0.1,
        },
    },
};

const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
};

const InitialCards: React.FC = () => {
    return (
        <div className="flex place-items-center w-full h-full justify-center p-4"> {/* Added padding */}
            <motion.div
                className="grid grid-cols-2 w-full md:w-3/4 lg:w-1/2 gap-4"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
            >
                {initialCardsData.map((card, index) => (
                    <motion.div
                        key={index}
                        className="p-4 rounded-lg shadow-inner bg-gray-50 dark:bg-gray-700 cursor-pointer aspect-square flex flex-col justify-center items-center text-center"
                        variants={itemVariants}
                        whileHover={{ scale: 1.05, backgroundColor: "rgb(240, 240, 240)", transition: { duration: 0.2 } }} // Adjusted hover
                        // Add onClick handler if these cards should trigger actions
                    >
                        <span className="material-symbols-rounded text-4xl mb-2 text-gray-700 dark:text-gray-300">{card.icon}</span>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">{card.title}</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{card.description}</p>
                    </motion.div>
                ))}
            </motion.div>
        </div>
    );
};

export default InitialCards;