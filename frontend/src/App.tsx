import { useState, useRef, useEffect, FormEvent } from 'react';
import { motion } from "motion/react";

import "./index.css" // Assuming your Tailwind setup uses this
import { Button, Menu, MenuItem, MenuTrigger, Popover } from 'react-aria-components';

// Define the structure of a message
interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}
// Define the expected API response structure
interface ApiResponse {
  response?: string;
  error?: string;
}

function App() {
  // State for the conversation history
  const [messages, setMessages] = useState<Message[]>([
    // Optional: Start with a system message or initial assistant message
    { role: 'system', content: 'You are a helpful assistant. Your name is sharesyllabus.me ai. When you read someones paper, you will check for spelling errors, grammar issues, & list them in a bullet point outline. You will also analyse papers for logical incoherence, when you respond to the user, remember to list logical steps made in their paper' },
  ]);
  // State for the current input value
  const [input, setInput] = useState('');
  // State to track loading status
  const [isLoading, setIsLoading] = useState(false);
  // State for potential errors
  const [error, setError] = useState<string | null>(null);

  // Ref for the messages container to enable auto-scrolling
  const messagesEndRef = useRef<null | HTMLDivElement>(null);

  // Function to scroll to the bottom of the messages container
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const [sidebarOpen, setSideBarOpen] = useState(true);

  // Scroll to bottom whenever messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Function to handle sending a message
  const handleSendMessage = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault(); // Prevent default form submission page reload
    const trimmedInput = input.trim();
    if (!trimmedInput || isLoading) return; // Don't send empty or while loading

    setError(null); // Clear previous errors
    const newUserMessage: Message = { role: 'user', content: trimmedInput };
    const updatedMessages = [...messages, newUserMessage];

    setMessages(updatedMessages); // Add user message optimistically
    setInput(''); // Clear input field
    setIsLoading(true); // Set loading state

    try {
      // Prepare history for the API (send all messages including the new user one)
      const historyPayload = updatedMessages.filter(msg => msg.role !== 'system'); // Or include system based on backend needs

      const response = await fetch('http://localhost:5001/api/chat', { // Ensure this matches your Flask backend URL
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ history: historyPayload }), // Send the history
      });

      const data: ApiResponse = await response.json();

      if (!response.ok || data.error) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }

      if (data.response) {
        const assistantMessage: Message = { role: 'assistant', content: data.response };
        setMessages((prevMessages) => [...prevMessages, assistantMessage]);
      } else {
        // Handle cases where the API might succeed but return no response content
        throw new Error("Received an empty response from the server.");
      }

    } catch (err) {
      console.error("Failed to send message:", err);
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      setError(`Failed to get response: ${errorMessage}`);
      // Optional: Remove the optimistic user message if the API call fails
      // setMessages(messages);
    } finally {
      setIsLoading(false); // Reset loading state
    }
  };

  return (
    <div className="flex w-screen h-screen ">

      {/* Header (Optional) */}
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
        </div>
      </motion.div>
      <div className="flex flex-1 relative p-2 flex-col h-screen">
        <motion.div
          layout
          className="flex sticky"
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
              className="text-gray-700 font-bold flex items-center justify-center rounded-md h-10 material-symbols-rounded"
            >
              left_panel_open
            </motion.button>
          )}
          <motion.select
            layout
            className="text-xl text-gray-700 h-10 font-semibold"
          >
            <option>deepseek-r1</option>
          </motion.select>
        </motion.div>
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 1 && messages[0].role === 'system' ? (
            // Display cards on startup
            <div className="flex place-items-center w-full  justify-center">
              <motion.div
                className="grid grid-cols-2 w-1/3 gap-4"
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
                  { title: "Flashcards Maker", description: "Create flashcards for studying.", icon: "bg-blue-500", hoverColor: "hover:bg-blue-600" },
                  { title: "Deep Research", description: "Conduct in-depth research.", icon: "bg-green-500", hoverColor: "hover:bg-green-600" },
                  { title: "Writing Helper", description: "Get assistance with writing tasks.", icon: "bg-orange-500", hoverColor: "hover:bg-orange-600" },
                  { title: "Custom Tool", description: "Explore custom functionalities.", icon: "bg-purple-500", hoverColor: "hover:bg-purple-600" },
                ].map((card, index) => (
                  <motion.div
                    key={index}
                    className={`p-4 ${card.color} text-white rounded-lg shadow cursor-pointer ${card.hoverColor} aspect-square flex flex-col justify-center items-center`}
                    variants={{
                      hidden: { opacity: 0, y: 20 },
                      visible: { opacity: 1, y: 0 },
                    }}
                    whileHover={{ scale: 1.05, transition: {duration: 0.3}}}
                  >
                    <h3 className="text-lg font-bold">{card.title}</h3>
                    <p>{card.description}</p>
                  </motion.div>
                ))}
              </motion.div>
            </div>
          ) : (
            messages.map((msg, index) => (
              // Render only user and assistant messages, skip system messages in UI
              msg.role !== 'system' && (
                <div
                  key={index}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-center pl-32 pr-32'}`}
                >
                  {msg.role === 'user' ? (
                    <div
                      className="max-w-xs md:max-w-md lg:max-w-lg xl:max-w-xl px-4 py-2 rounded-lg shadow bg-blue-500 text-white"
                    >
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  ) : (
                    <p className="text-gray-900 dark:text-white whitespace-pre-wrap">{msg.content}</p>
                  )}
                </div>
              )
            ))
          )}
          {/* Empty div to act as scroll anchor */}
          <div ref={messagesEndRef} />
        </div>

        {/* Loading Indicator */}
        {isLoading && (
          <div className="p-4 text-center text-gray-500 dark:text-gray-400">
            Assistant is thinking...
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="p-4 text-center text-red-500 bg-red-100 dark:bg-red-900 dark:text-red-300 border-t border-red-200 dark:border-red-700">
            {error}
          </div>
        )}


        {/* Input Area */}
        <div className="absolute bottom-0 left-0 w-full flex justify-center">
          <div className="m-4 w-1/2 relative backdrop-blur-sm bg-[rgba(255,255,255,0.8)] p-4 border border-gray-200 shadow-lg rounded-4xl">
            <form onSubmit={handleSendMessage} className="flex flex-col items-center gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your message..."
                disabled={isLoading}
                className="w-full p-2 focus:outline-none"
              />
              <div className="flex w-full text-gray-500 gap-2">
                <MenuTrigger>
                  <Button className="p-2 border border-gray-200 cursor-pointer hover:bg-gray-100 rounded-full flex aspect-square material-symbols-rounded" aria-label="Menu">add</Button>
                  <Popover className="">
                    <Menu className="box-border bg-white border border-gray-200 rounded-xl shadow-lg">
                      <MenuItem onAction={() => alert('open')} >
                        <span className="material-symbols-rounded flex items-center text-gray-500 justify-center">add_to_drive</span>
                        <p className="flex-1 flex items-center">Google Drive (coming soon)</p>
                      </MenuItem>
                      <MenuItem onAction={() => alert('rename')}>
                        <span className="material-symbols-rounded flex items-center text-gray-500 justify-center">filter_drama</span>
                        <p className="flex-1 flex items-center">Outlook (coming soon)</p>
                      </MenuItem>
                      <MenuItem onAction={() => alert('duplicate')} >
                        <span className="material-symbols-rounded flex items-center text-gray-500 justify-center">attach_file</span>
                        <p className="flex-1 flex items-center ">Upload From Computer</p>
                      </MenuItem>
                    </Menu>
                  </Popover>
                </MenuTrigger>
                <motion.div
                  layout
                  initial={{ opacity: 0, x: -20, gap: "0px" }}
                  animate={{ opacity: 1, x: 0, gap: "0.5rem" }}
                  className="flex"
                  transition={{ staggerChildren: 1, ease: "circInOut" }}
                >
                  <motion.button
                    layout
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4, ease: "circInOut" }}
                    className="bg-blue-700 text-white flex place-items-center p-2 rounded-full border font-semibold gap-1 hover:text-yellow-400 cursor-pointer"
                  >
                    <span className="material-symbols-rounded">cards_star</span>
                    flaschards maker
                  </motion.button>
                  <motion.button
                    layout
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4, ease: "circInOut" }}
                    className="bg-green-700 text-white flex place-items-center p-2 rounded-full border font-semibold gap-1 hover:text-red-600 cursor-pointer"
                  >
                    <span className="material-symbols-rounded">history_edu</span>
                    deep research
                  </motion.button>
                  <motion.button
                    layout
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4, ease: "circInOut" }}
                    className="bg-orange-500 text-white flex place-items-center p-2 rounded-full border font-semibold gap-1 hover:text-green-400 cursor-pointer"
                  >
                    <span className="material-symbols-rounded">stylus_note</span>
                    writing helper
                  </motion.button>
                </motion.div>
                <div className="flex-1"></div>
                <button
                  type="submit"
                  disabled={isLoading || !input.trim()}
                  className="bg-black hover:bg-gray-950 rounded-full cursor-pointer p-2 aspect-square text-white material-symbols-rounded"
                >
                  arrow_upward
                </button>
              </div>
            </form>
          </div>
        </div>
      </div >
    </div >
  );
}

export default App;
