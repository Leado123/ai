import { useState, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { processFilesForFlashcards } from "../assets/prompts";
import { FilePond } from "react-filepond"
import { FilePondFile } from "filepond";
import "filepond/dist/filepond.css"

function FlashCardCreator({
    setModalOpen,
    onFlashcardCreation
}: {
    setModalOpen: (open: boolean) => void;
    onFlashcardCreation: (fileTexts: { fileName: string; text: string }[]) => void
}) {
    const [files, setFiles] = useState<FilePondFile[]>([]);
    const [customPrompt, setCustomPrompt] = useState("make the terms & definitions short & easy...");
    const [isLoading, setIsLoading] = useState(false);

    // Function for smooth closing with animation
    const closeModal = useCallback(() => {
        // Instead of immediately setting to false, we'll let the animation complete first
        const modalContent = document.querySelector(".modal-content");
        if (modalContent) {
            modalContent.classList.add("closing");
            // Only close after animation has time to complete
            setTimeout(() => setModalOpen(false), 300); // 300ms to ensure animation completes
        } else {
            setModalOpen(false); // Fallback if element not found
        }
    }, [setModalOpen]);

    // Handle generating flashcards
    const handleGenerateFlashcards = async () => {
        if (files.length === 0) return;

        setIsLoading(true);
        try {
            const fileObjects = files.map(filePondFile => filePondFile.file as File);
            const results = await processFilesForFlashcards(fileObjects, customPrompt);

            // Generate a Quizlet-compatible flashcard prompt
            const flashcardPrompt = results.map(({ fileName, text }) => {
                return `File: ${fileName}\nExtracted Text:\n${text}\n\nGenerate flashcards in the format:\nTerm: [term]\nDefinition: [definition]\n---`;
            }).join("\n\n");

            console.log("Generated Flashcard Prompt for AI:", flashcardPrompt);

            onFlashcardCreation(results);
            closeModal(); // Use smooth closing
        } catch (error) {
            console.error("Error generating flashcards:", error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.9, backdropFilter: "blur(0px)" }}
            animate={{ opacity: 1, scale: 1, backdropFilter: "blur(5px)" }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.3, ease: "easeInOut" }} // Increased duration for more noticeable animation
            className="fixed inset-0 flex items-center justify-center z-50  bg-opacity-30"
        >
            <AnimatePresence>
                <motion.div
                    layout
                    className="modal-content  bg-purple-100 text-amber-700 gap-4 dark:bg-gray-800 w-4/5 flex flex-col h-4/5 p-4 rounded-3xl shadow-xl border  dark:border-gray-700"
                    initial={{ y: 50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 50, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                >
                    {/* Flashcard Modal Header */}
                    <div className="w-full flex items-center">
                        <text className="text-xl flex place-items-center gap-2 flex-1 font-bold dark:text-white">
                            <span className="material-symbols-rounded text-base">cards_star</span>
                            Flashcard Creator</text>
                        <button
                            onClick={closeModal} // Use smooth closing
                            className="p-1.5 material-symbols-rounded text-gray-600 dark:text-gray-300 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
                            aria-label="Close modal"
                        >
                            close
                        </button>
                    </div>

                    {/* Main Content Area */}
                    <div className="flex-1 gap-4 text-black flex w-full overflow-hidden">
                        {/* File Upload Area */}
                        <div className="border bg-white border-gray-300 rounded-2xl h-full p-3 flex flex-col w-1/3">
                            <h3 className="text-md font-semibold mb-2 dark:text-gray-200">Upload Files</h3>
                            <div className="file-upload-wrapper">
                            <FilePond
        files={files.map(file => file.file)}
        onupdatefiles={(fileItems) => setFiles(fileItems as FilePondFile[])}
        allowMultiple={true}
        maxFiles={3}
        name="files" /* sets the file input name, it's filepond by default */
        labelIdle='Drag & Drop your files or <span class="filepond--label-action">Browse</span>'
      />
                            </div>
                            
                        </div>

                        {/* Configuration/Preview Area */}
                        <div className="flex-1 bg-white shadow-inner flex flex-col gap-2 border border-gray-300 rounded-2xl p-3">
                            <p className="text-md font-semibold dark:text-gray-200">Configuration</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Custom prompt (in addition to built-in prompt)</p>
                            <textarea
                                value={customPrompt}
                                onChange={(e) => setCustomPrompt(e.target.value)}
                                className="border text-black rounded-md p-2 w-full"
                            />
                        </div>
                    </div>

                    {/* Footer/Action Area */}
                    <div className="dark:border-gray-700 flex place-items-center">
                        <text className="flex-1">courtesy of college success club, you are allowed to generate an infinite amount of flashcards all for <span className="font-black underline text-blue-500">free</span></text>
                        <button
                            onClick={handleGenerateFlashcards}
                            disabled={files.length === 0 || isLoading}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? "Extracting..." : "Generate Flashcards"}
                        </button>
                    </div>
                </motion.div>
            </AnimatePresence>
        </motion.div>
    );
}

export default FlashCardCreator;