import React, { useState, useRef, useEffect, FormEvent } from 'react'; // Ensure useRef is imported
import { motion } from "motion/react";
import io, { Socket } from 'socket.io-client';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import "./index.css";
import { Button, Menu, MenuItem, MenuTrigger, Popover } from 'react-aria-components';

// Define the structure of a message
interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

// --- Socket.IO Connection ---
const SOCKET_URL = 'http://localhost:5001';
// REMOVE: let socket: Socket | null = null; // Remove the global variable

function App() {
  // State for the conversation history
  const [messages, setMessages] = useState<Message[]>([
    { role: 'system', content: 'You are a helpful assistant. Your name is sharesyllabus.me ai. When you read someones paper, you will check for spelling errors, grammar issues, & list them in a bullet point outline. You will also analyse papers for logical incoherence, when you respond to the user, remember to list logical steps made in their paper' },
  ]);
  // State for the current input value
  const [input, setInput] = useState('');
  // State to track loading status (assistant is typing)
  const [isLoading, setIsLoading] = useState(false);
  // State for potential errors
  const [error, setError] = useState<string | null>(null);
  // State for connection status
  const [isConnected, setIsConnected] = useState(false);

  // Ref for the messages container to enable auto-scrolling
  const messagesEndRef = useRef<null | HTMLDivElement>(null);
  // ADD: Use useRef to hold the socket instance
  const socketRef = useRef<Socket | null>(null);

  // Function to scroll to the bottom of the messages container
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const [sidebarOpen, setSideBarOpen] = useState(true);

  // --- WebSocket Effect Hook ---
  useEffect(() => {
    // Initialize socket connection and store in ref if not already connected
    const currentSocket = socketRef.current;

    if (!socketRef.current) {
        console.log(">>> SOCKET: Initializing connection...");
        socketRef.current = io(SOCKET_URL, {
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            timeout: 20000
        });
    }

    const currentSocketInstance = socketRef.current; // Use a local variable for listeners

    currentSocketInstance.on('connect', () => {
      console.log('>>> SOCKET: Connected, ID:', currentSocketInstance.id);
      setIsConnected(true);
      setError(null);
    });

    currentSocketInstance.on('disconnect', (reason) => {
      console.log('>>> SOCKET: Disconnected, reason:', reason);
      setIsConnected(false);
      if (reason !== 'io client disconnect') {
        setError('Disconnected. Trying to reconnect...');
      }
      // Optional: Consider nullifying the ref here if auto-reconnect is off
      // socketRef.current = null;
    });

    currentSocketInstance.on('connect_error', (err) => {
      console.error('>>> SOCKET: Connection Error:', err);
      setError(`Connection failed: ${err.message}`);
      setIsConnected(false);
      setIsLoading(false); // Ensure loading stops on connection error
    });

    currentSocketInstance.on('message_chunk', (data: { chunk: string }) => {
      setIsLoading(true);
      setMessages((prevMessages) => {
        const lastMessage = prevMessages[prevMessages.length - 1];
        if (lastMessage && lastMessage.role === 'assistant') {
          return [
            ...prevMessages.slice(0, -1),
            { ...lastMessage, content: lastMessage.content + data.chunk },
          ];
        } else {
          return [...prevMessages, { role: 'assistant', content: data.chunk }];
        }
      });
    });

    currentSocketInstance.on('stream_end', () => {
      console.log('>>> SOCKET: Received stream_end. Setting isLoading to false.');
      setIsLoading(false);
      console.log('>>> SOCKET: setIsLoading(false) called.');
      scrollToBottom();
    });

    currentSocketInstance.on('error', (data: { message: string }) => {
      console.error('>>> SOCKET: Received error event:', data.message);
      setError(`Server error: ${data.message}`);
      setIsLoading(false);
    });

    // Cleanup function
    return () => {
      console.log(">>> SOCKET: Cleaning up listeners for previous socket instance (if any).");
      // Remove listeners from the specific socket instance being cleaned up
      currentSocketInstance.off('connect');
      currentSocketInstance.off('disconnect');
      currentSocketInstance.off('connect_error');
      currentSocketInstance.off('message_chunk');
      currentSocketInstance.off('stream_end');
      currentSocketInstance.off('error');

      // Optional: Disconnect if component truly unmounts
      // console.log(">>> SOCKET: Disconnecting socket in cleanup.");
      // currentSocketInstance.disconnect();
      // socketRef.current = null; // Reset ref if disconnecting
    };
  }, []); // Empty dependency array ensures this runs only once on mount

  // Scroll to bottom whenever messages change or loading state changes
  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]); // Simplified dependency array

  // Function to handle sending a message via WebSocket
  const handleSendMessage = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmedInput = input.trim();
    const currentSocket = socketRef.current; // Get socket from ref

    // Log state before guard, checking the ref's current value
    console.log(`>>> handleSendMessage: Checking guard. isLoading value: ${isLoading}`);
    console.log(`>>> handleSendMessage: Attempting send. Input: "${trimmedInput}", isLoading: ${isLoading}, isConnected: ${isConnected}, socket exists: ${!!currentSocket}`);

    // Use currentSocket (from ref) in the check
    if (!trimmedInput || isLoading || !currentSocket || !isConnected) {
      console.warn('>>> handleSendMessage: Aborted send.', { trimmedInput, isLoading, isConnected: isConnected, socketExists: !!currentSocket });
      if (!isConnected) setError("Cannot send: Not connected to the server.");
      if (!currentSocket) setError("Cannot send: Socket not available.");
      return;
    }

    setError(null);
    const newUserMessage: Message = { role: 'user', content: trimmedInput };
    const updatedMessages = [...messages, newUserMessage];

    console.log('>>> handleSendMessage: Updating UI optimistically.');
    setMessages(updatedMessages);
    setInput('');
    setIsLoading(true);

    const historyPayload = updatedMessages;

    console.log('>>> handleSendMessage: Emitting send_message to server.');
    currentSocket.emit('send_message', { history: historyPayload }); // Use currentSocket to emit
  };

  // --- Render JSX ---
  // (The entire return statement remains the same as your provided code)
  return (
    <div className="flex w-screen h-screen ">
      {/* Sidebar */}
      <motion.div
        initial={{ width: sidebarOpen ? 200 : 0, opacity: sidebarOpen ? 1 : 0 }}
        animate={{ width: sidebarOpen ? 200 : 0, opacity: sidebarOpen ? 1 : 0 }}
        transition={{ duration: 0.3 }}
        className=" flex flex-col border-gray-200 bg-gray-100 border-r"
      >
        <div className="w-full text-4xl p-2 rounded-md flex">
          <button
            onClick={() => setSideBarOpen(!sidebarOpen)}
            className="text-gray-700 font-bold flex items-center justify-center  rounded-md w-10 h-10 material-symbols-rounded"
          >
            left_panel_open
          </button>
          <div className="flex-1"></div>
          <div className={`w-3 h-3 rounded-full self-center mr-2 ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} title={isConnected ? 'Connected' : 'Disconnected'}></div>
        </div>
        {/* Other sidebar content would go here */}
      </motion.div>

      {/* Main Chat Area */}
      <div className="flex flex-1 relative p-2 flex-col h-screen">
        {/* Top Bar */}
        <motion.div
          layout
          className="flex sticky top-0 items-center bg-white z-10 py-2" // Added background and z-index
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {!sidebarOpen && (
            <motion.button
              layout
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 40 }}
              exit={{ opacity: 0, width: 0 }}
              onClick={() => setSideBarOpen(!sidebarOpen)}
              className="text-gray-700 font-bold flex items-center justify-center rounded-md h-10 material-symbols-rounded mr-2" // Added margin
            >
              left_panel_open
            </motion.button>
          )}
          <motion.select
            layout
            className="text-xl text-gray-700 h-10 font-semibold bg-transparent border-none focus:outline-none"
          >
            <option>deepseek-r1</option>
            {/* Add other model options if needed */}
          </motion.select>
        </motion.div>

        {/* Message Display Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Initial Cards Display */}
          {messages.length === 1 && messages[0].role === 'system' ? (
            <div className="flex place-items-center w-full h-full justify-center">
              <motion.div
                className="grid grid-cols-2 w-full md:w-3/4 lg:w-1/2 gap-4" // Adjusted width
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
                    className={`p-4 rounded-lg shadow-inner bg-gray-50 cursor-pointer aspect-square flex flex-col justify-center items-center text-center`} // Added background and text alignment
                    variants={{
                      hidden: { opacity: 0, y: 20 },
                      visible: { opacity: 1, y: 0 },
                    }}
                    whileHover={{ scale: 1.05, backgroundColor: "rgb(250, 250, 200)", transition: { duration: 0.3 } }} // Adjusted hover effect
                  >
                    <span className="material-symbols-rounded text-4xl mb-2">{card.icon}</span>
                    <h3 className="text-lg font-bold">{card.title}</h3>
                    <p className="text-sm text-gray-600">{card.description}</p>
                  </motion.div>
                ))}
              </motion.div>
            </div>
          ) : (
            // Messages Mapping
            messages.map((msg, index) => (
              msg.role !== 'system' && (
                <div
                  key={index}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start pl-4 pr-4 md:pl-16 md:pr-16'}`} // Adjusted padding
                >
                  {msg.role === 'user' ? (
                    <div
                      className="max-w-xs md:max-w-md lg:max-w-lg xl:max-w-xl px-4 py-2 rounded-lg shadow bg-blue-500 text-white"
                    >
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  ) : (
                    <div className="prose dark:prose-invert max-w-none text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-700 p-4 rounded-lg shadow"> {/* Added background/padding */}
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {msg.content}
                      </ReactMarkdown>
                    </div>
                  )}
                </div>
              )
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Thinking Indicator */}
        {isLoading && isConnected && (
          <div className="p-4 text-center text-gray-500 dark:text-gray-400">
            Assistant is thinking...
          </div>
        )}

        {/* Input Area */}
        <div className="sticky bottom-0 left-0 w-full flex justify-center p-4 bg-gradient-to-t from-white via-white dark:from-gray-800 dark:via-gray-800"> {/* Added gradient */}
          <div className="w-full md:w-3/4 lg:w-1/2 relative backdrop-blur-sm bg-[rgba(255,255,255,0.8)] dark:bg-[rgba(55,65,81,0.8)] p-4 border border-gray-200 dark:border-gray-700 shadow-lg rounded-2xl">
            <form onSubmit={handleSendMessage} className="flex flex-col items-center gap-2">
              {/* Input Field */}
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={isConnected ? "Type your message..." : "Connecting..."}
                disabled={!isConnected || isLoading} // Disable if not connected OR loading
                className="w-full p-2 focus:outline-none bg-transparent dark:text-white"
              />
              {/* Buttons Row */}
              <div className="flex w-full text-gray-500 gap-2 items-center"> {/* Added items-center */}
                {/* Attachment Menu */}
                <MenuTrigger>
                  <Button className="p-2 border border-gray-200 cursor-pointer hover:bg-gray-100 rounded-full flex aspect-square material-symbols-rounded" aria-label="Menu">add</Button>
                  <Popover className="bg-white border border-gray-200 rounded-xl shadow-lg">
                    <Menu className="outline-none p-1">
                      <MenuItem className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded cursor-pointer outline-none" onAction={() => alert('open')}>
                        <span className="material-symbols-rounded text-gray-500">add_to_drive</span>
                        <p>Google Drive (coming soon)</p>
                      </MenuItem>
                      <MenuItem className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded cursor-pointer outline-none" onAction={() => alert('rename')}>
                        <span className="material-symbols-rounded text-gray-500">filter_drama</span>
                        <p>Outlook (coming soon)</p>
                      </MenuItem>
                      <MenuItem className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded cursor-pointer outline-none" onAction={() => alert('duplicate')}>
                        <span className="material-symbols-rounded text-gray-500">attach_file</span>
                        <p>Upload From Computer</p>
                      </MenuItem>
                    </Menu>
                  </Popover>
                </MenuTrigger>
                {/* Quick Action Buttons */}
                <motion.div
                  layout
                  initial={{ opacity: 0, x: -20, gap: "0px" }}
                  animate={{ opacity: 1, x: 0, gap: "0.5rem" }}
                  className="flex"
                  transition={{ staggerChildren: 0.1, ease: "circInOut" }} // Adjusted stagger
                >
                  <motion.button
                    layout
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, ease: "circInOut" }} // Adjusted duration
                    className="bg-blue-700 text-white flex place-items-center p-2 rounded-full border font-semibold gap-1 hover:text-yellow-400 cursor-pointer text-sm" // Made text smaller
                  >
                    <span className="material-symbols-rounded text-base">cards_star</span> {/* Adjusted icon size */}
                    flashcards maker
                  </motion.button>
                  <motion.button
                    layout
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: 0.1, ease: "circInOut" }} // Added delay
                    className="bg-green-700 text-white flex place-items-center p-2 rounded-full border font-semibold gap-1 hover:text-red-600 cursor-pointer text-sm"
                  >
                    <span className="material-symbols-rounded text-base">history_edu</span>
                    deep research
                  </motion.button>
                  <motion.button
                    layout
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: 0.2, ease: "circInOut" }} // Added delay
                    className="bg-orange-500 text-white flex place-items-center p-2 rounded-full border font-semibold gap-1 hover:text-green-400 cursor-pointer text-sm"
                  >
                    <span className="material-symbols-rounded text-base">stylus_note</span>
                    writing helper
                  </motion.button>
                </motion.div>
                {/* Spacer */}
                <div className="flex-1"></div>
                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isLoading || !input.trim() || !isConnected}
                  className={`bg-black dark:bg-blue-600 rounded-full cursor-pointer p-2 aspect-square text-white material-symbols-rounded ${(!input.trim() || !isConnected || isLoading) ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-700 dark:hover:bg-blue-700'}`}
                >
                  arrow_upward
                </button>
              </div>
            </form>
             {/* Optional: Display connection error message near input */}
             {error && !isConnected && (
                <div className="text-red-500 text-xs mt-2 text-center">{error}</div>
             )}
          </div>
        </div>
      </div >
    </div >
  );
}

export default App;
