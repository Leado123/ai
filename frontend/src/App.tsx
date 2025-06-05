import {
  useRef,
  FormEvent,
  useState,
  useCallback,
  MouseEvent,
  useEffect,
} from "react"; // Added MouseEvent
import { AnimatePresence, motion } from "framer-motion";
import { useSocketManager } from "./hooks/useSocketManager";
import useConversations from "./hooks/useConversations"; // Import useConversations
import { Message, ConversationType } from "./types"; // Import ConversationType
import "./index.css";
import "katex/dist/katex.min.css";
import FlashCardCreator from "./components/FlashCardCreator";
import ChatInput from "./components/ChatInput";
import MessageList from "./components/MessageList";
import { addSystemMessage, addUserMessage } from "./assets/prompts"; // Import message helpers
import { PanelLeft, Sparkles, SquarePen } from "lucide-react";
import { ChatScrollAnchor } from "./components/ChatScrollAnchor";
import GradientText from "./reactbits/TextAnimations/GradientText/GradientText";
import SplitText from "./reactbits/TextAnimations/SplitText/SplitText";

function App() {
  const initialSystemMessage =
    "You are a helpful assistant. \n Your name is sharesyllabus.me ai. \n When you want to put a header, put a #, ##, ###, or similar for markdown interpreters. Headers should start with an emoji before the words, and avoid using numbers on headers. \n Also DO NOT use excessive line spaces (backslash n), use a line breaker instead when necessary. When you want to write mathjax, use dollar signs instead of backslash brackets. if you want to render anything with special symbols including chemistry ones, use the dollar sign MathJax format. \n ANYTIME YOU WANT TO WRITE NOTATION, use DOLLAR SIGNS $";
  // --- Refs for scrolling ---
  const messagesEndRef = useRef<HTMLDivElement>(null); // Ref for the target div at the end of MessageList
  const chatContainerRef = useRef<HTMLDivElement>(null); // Ref for the scrollable messages container in App.tsx

  const [input, setInput] = useState("");
  const [sidebarOpen, setSideBarOpen] = useState(true);
  const [flashcardModalOpen, setFlashcardModalOpen] = useState(false);
  const [useResearch, setUseResearch] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isAtBottom, setIsAtBottom] = useState(true); // State to track if the user is at the bottom of the chat

  const {
    conversations,
    currentConversationId,
    currentConversation,
    setCurrentConversationId,
    createConversation,
    updateConversationMessages,
    removeConversation,
  } = useConversations();

  // --- Scroll to Bottom Logic ---

  const handleScroll = () => {
    if (!chatContainerRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
    const atBottom = scrollHeight - clientHeight <= scrollTop + 1;

    setIsAtBottom(atBottom);
  };

  // --- Define Callback for Socket Manager ---
  const handleMessagesUpdate = useCallback(
    (updater: (prevMessages: Message[]) => Message[]) => {
      if (currentConversationId) {
        updateConversationMessages(currentConversationId, updater);
      } else {
        console.warn(
          "[App] handleMessagesUpdate called but no currentConversationId is set."
        );
      }
    },
    [currentConversationId, updateConversationMessages]
  );

  // --- Use Socket Manager with Callback ---
  const { isConnected, sendMessage: sendSocketMessage } = useSocketManager(
    handleMessagesUpdate,
    setIsLoading,
    setError // Pass App.tsx's scrollToBottom
  );

  // --- Handle Sending User Message ---
  const handleSendMessage = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmedInput = input.trim();
    if (!trimmedInput) return;

    let targetConversationId = currentConversationId;
    let messagesForSocket: Message[];

    if (!targetConversationId) {
      const newId = createConversation(
        "normal",
        trimmedInput.substring(0, 30),
        [
          { role: "system", content: initialSystemMessage },
          { role: "user", content: trimmedInput },
        ]
      );
      setCurrentConversationId(newId);
      targetConversationId = newId;
      messagesForSocket = [
        { role: "system", content: initialSystemMessage },
        { role: "user", content: trimmedInput },
      ];
    } else if (currentConversation) {
      const userMessage: Message = { role: "user", content: trimmedInput };
      updateConversationMessages(targetConversationId, (prevMessages) => [
        ...prevMessages,
        userMessage,
      ]);
      messagesForSocket = [...currentConversation.messages, userMessage];
    } else {
      setError("Error sending message: Conversation context lost.");
      return;
    }

    if (sendSocketMessage(messagesForSocket)) {
      setInput("");
    }
  };

  // --- Handle Flashcard Creation ---
  const handleFlashcardCreation = async (
    fileTexts: { fileName: string; text: string | any }[]
  ) => {
    const title = `Flashcards: ${fileTexts.map((f) => f.fileName).join(", ")}`;
    const newConversationId = createConversation("flashcard", title, [
      { role: "system", content: initialSystemMessage },
    ]);
    setCurrentConversationId(newConversationId);

    let messagesToSend: Message[] = [
      { role: "system", content: initialSystemMessage },
    ];
    const systemInfoMsg = `Flashcard creation initiated for: ${fileTexts
      .map((file) => file.fileName)
      .join(", ")}`;
    messagesToSend = addSystemMessage(messagesToSend, systemInfoMsg);
    const prompt = `Please create flashcards from these files: ${fileTexts
      .map((file) => {
        const textStr =
          typeof file.text === "string"
            ? file.text
            : file.text
            ? JSON.stringify(file.text)
            : "No text extracted";
        return `\n\nFile: ${file.fileName}\n${textStr.substring(0, 10000)}${
          textStr.length > 10000 ? "..." : ""
        }`;
      })
      .join(
        ""
      )}\n\nGenerate flashcards in the format: [Term] tab [Definition], new line between rows.`;
    messagesToSend = addUserMessage(messagesToSend, prompt);
    updateConversationMessages(newConversationId, messagesToSend);
    sendSocketMessage(messagesToSend);
    setFlashcardModalOpen(false);
  };

  // --- Handle Creating/Switching Conversations ---
  const createNewConversation = (type: ConversationType = "normal") => {
    if (type === "flashcard") {
      setFlashcardModalOpen(true);
    } else {
      const newId = createConversation(type, "New Chat", [
        { role: "system", content: initialSystemMessage },
      ]);
      setCurrentConversationId(newId);
      setError(null);
      setInput("");
    }
  };

  // --- Handle Deleting Conversation ---
  const handleDeleteConversation = (
    e: MouseEvent<HTMLButtonElement>,
    idToDelete: string
  ) => {
    e.stopPropagation();
    removeConversation(idToDelete);
  };

  // --- State for messages to display ---
  const [displayMessages, setDisplayMessages] = useState<Message[]>([]);
  useEffect(() => {
    setDisplayMessages(currentConversation?.messages ?? []);
  }, [currentConversation]);

  // --- Effects for Scrolling ---
  // 1. Scroll when the current conversation is loaded or switched
  useEffect(() => {
    if (currentConversationId) {
      // Ensure a conversation is selected
      console.log(
        `[App useEffect] currentConversationId changed: ${currentConversationId}. Scheduling scroll.`
      );
      // Delay slightly to allow MessageList to render with new messages
      const timer = setTimeout(() => {
        console.log(
          `[App useEffect] Delayed scroll for currentConversationId: ${currentConversationId}.`
        );
      }, 50); // Adjust delay if needed, 50-100ms is usually sufficient
      return () => clearTimeout(timer);
    }
  }, [currentConversationId]); // Rerun if currentConversationId or scrollToBottom changes

  // 2. Scroll when new messages are added to the displayMessages
  useEffect(() => {
    if (displayMessages.length > 0) {
      // This will also be triggered by useSocketManager updates via handleMessagesUpdate
      console.log(
        `[App useEffect] displayMessages changed (length: ${displayMessages.length}). Scheduling scroll.`
      );
    }
  }, [displayMessages]); // Rerun if displayMessages or scrollToBottom changes

  return (
    <div className="flex w-screen h-screen bg-white dark:bg-gray-900">
      {/* Sidebar */}
      <motion.div
        initial={{ width: sidebarOpen ? "15em" : "3.25em" }}
        animate={{ width: sidebarOpen ? "15em" : "3.25em" }}
        className="flex p-1 flex-col  bg-gray-50 dark:bg-gray-800 overflow-hidden h-full flex-shrink-0"
      >
        {/* Sidebar Header */}
        <div className="w-full text-xl p-1.5 rounded-md flex items-center justify-between flex-shrink-0">
          <button
            onClick={() => setSideBarOpen(!sidebarOpen)}
            className="text-gray-700 dark:text-gray-300 font-bold flex items-center justify-center rounded-md material-symbols-rounded p-1 hover:bg-gray-200 dark:hover:bg-gray-700"
          >
            <PanelLeft className="text-gray-700 dark:text-gray-300" />
          </button>
          {sidebarOpen && (
            <button
              onClick={() => createNewConversation("normal")}
              className="flex gap-1 text-lg font-semibold text-gray-700 rounded-full p-1 cursor-pointer items-center justify-center"
            >
              <SquarePen className="text-gray-700 dark:text-gray-300" />
            </button>
          )}
        </div>
        {/* Conversation List */}
        {sidebarOpen && (
          <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
            {[...conversations]
              .sort((a, b) => b.updatedAt - a.updatedAt)
              .map((convo) => (
                <div
                  key={convo.id}
                  onClick={() => setCurrentConversationId(convo.id)}
                  className={`group flex items-center justify-between p-2 rounded cursor-pointer text-sm ${
                    currentConversationId === convo.id
                      ? "bg-blue-200 dark:bg-blue-700 font-semibold"
                      : "hover:bg-gray-200 dark:hover:bg-gray-700"
                  } text-gray-800 dark:text-gray-200`}
                  title={convo.title}
                >
                  <span className="truncate flex-1 mr-2">
                    {convo.title || "Untitled Chat"}
                  </span>
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
      <div className="flex flex-1 relative p-2 flex-col h-screen overflow-hidden">
        {/* Top Bar */}
        <motion.div
          layout
          className="flex text-black bg-transparent font-normal absolute top-0 items-center justify-between p-3 pr-10 z-10 flex-shrink-0 w-full"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="flex items-center justify-start text-lg">Yay AI</div>
          <div className="flex items-center justify-center text-lg truncate"></div>
          <div className="flex items-center justify-end gap-2">
            <div
              className={`w-3 h-3 rounded-full self-center ${
                isConnected ? "bg-green-500" : "bg-red-500"
              }`}
              title={isConnected ? "Connected" : "Disconnected"}
            ></div>
          </div>
        </motion.div>

        {/* Message Display Area */}
        <div
          ref={chatContainerRef} // Keep this ref for potential direct container manipulation if needed, but scrolling targets messagesEndRef
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto h-full overflow-x-hidden" // This div is the scrollable container
        >
          <MessageList
            messages={displayMessages.filter((m) => m.role !== "system")}
            messagesEndRef={messagesEndRef} // Pass the ref to MessageList
            isLoading={isLoading}
            isConnected={isConnected}
            conversationType={currentConversation?.type || "normal"}
          />
          <ChatScrollAnchor
            scrollAreaRef={chatContainerRef}
            isAtBottom={isAtBottom}
            trackVisibility={isLoading}
          />
        </div>

        {/* Input Area */}
        <div
          className={`absolute left-0 right-0 p-4 z-10 ${
            displayMessages.length < 2 ? "bottom-1/3" : "bottom-0"
          }`}
        >
          {displayMessages.length < 2 && !currentConversationId && (
            <div className="w-full flex flex-col">
              <div className="flex justify-center">
                <img src="logo_big.png" width="200" height="200" className="" />
              </div>
              
                <SplitText className="text-black font-black" text="College Success Club AI" />
            </div>
          )}
          <ChatInput
            input={input}
            setInput={setInput}
            handleSendMessage={handleSendMessage}
            isLoading={isLoading}
            isConnected={isConnected}
            error={error}
            flashcardModalOpen={flashcardModalOpen}
            setFlashcardModalOpen={setFlashcardModalOpen}
            setUseResearch={setUseResearch}
            useResearch={useResearch}
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
