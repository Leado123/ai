import { useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
  Conversation,
  ConversationType,
  Message,
  getConversations,
  saveConversations, // Assuming this saves the whole array
  addConversation,    // Assuming this adds one and saves
  updateConversation, // Assuming this updates one and saves
  deleteConversation, // Assuming this deletes one and saves
  getConversationById // Assuming this gets one (might not be needed if state is source of truth)
} from '../types';

export default function useConversations() {
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);

  // Load conversations from localStorage on initial load
  useEffect(() => {
    const loadedConversations = getConversations();
    setConversations(loadedConversations);
    // --- REMOVED: Don't automatically select a conversation on load ---
    // if (loadedConversations.length > 0) {
    //   const mostRecent = [...loadedConversations].sort((a, b) => b.updatedAt - a.updatedAt)[0];
    //   setCurrentConversationId(mostRecent.id);
    // }
    // --- END REMOVED ---
  }, []);

  const currentConversation = currentConversationId
    ? conversations.find(c => c.id === currentConversationId)
    : null;

  // Create a new conversation - doesn't automatically set as current here
  const createConversation = useCallback((
    type: ConversationType = 'normal',
    title: string = 'New Chat',
    initialMessages: Message[] = []
  ): string => { // Return the ID
    const id = uuidv4();
    const now = Date.now();
    const newConversation: Conversation = {
      id, title, type, messages: initialMessages, createdAt: now, updatedAt: now,
    };

    setConversations(prev => {
        const newState = [...prev, newConversation];
        saveConversations(newState); // Save the updated full list
        return newState;
    });
    // Don't set currentConversationId here automatically
    return id; // Return the ID so the caller can decide to set it current
  }, []);

  // Update messages - unchanged from previous correct version
  const updateConversationMessages = useCallback((
    conversationId: string,
    messagesOrUpdater: Message[] | ((prevMessages: Message[]) => Message[])
  ) => {
    if (!conversationId) return;
    setConversations(prevConversations => {
      const conversationIndex = prevConversations.findIndex(c => c.id === conversationId);
      if (conversationIndex === -1) return prevConversations;
      const conversation = prevConversations[conversationIndex];
      const newMessages = typeof messagesOrUpdater === 'function'
        ? messagesOrUpdater(conversation.messages)
        : messagesOrUpdater;
      const updatedConversation = { ...conversation, messages: newMessages, updatedAt: Date.now() };
      const newConversations = [
        ...prevConversations.slice(0, conversationIndex),
        updatedConversation,
        ...prevConversations.slice(conversationIndex + 1),
      ];
      saveConversations(newConversations); // Save the updated full list
      return newConversations;
    });
  }, []);

  // Delete a conversation
  const removeConversation = useCallback((id: string) => {
    setConversations(prevConversations => {
      const remaining = prevConversations.filter(c => c.id !== id);
      saveConversations(remaining); // Save the updated list

      // If deleted conversation was the current one, clear current ID
      if (id === currentConversationId) {
        // Optionally select the next most recent, or just clear it
        setCurrentConversationId(null);
      }
      return remaining;
    });
    // No need to call deleteConversation if saveConversations handles the full list
  }, [currentConversationId]); // Dependency needed

  // Update title - unchanged
  const updateConversationTitle = useCallback((
    conversationId: string,
    title: string
  ) => {
    setConversations(prevConversations => {
        const conversationIndex = prevConversations.findIndex(c => c.id === conversationId);
        if (conversationIndex === -1) return prevConversations;
        const conversation = prevConversations[conversationIndex];
        const updatedConversation = { ...conversation, title, updatedAt: Date.now() };
        const newConversations = [
            ...prevConversations.slice(0, conversationIndex),
            updatedConversation,
            ...prevConversations.slice(conversationIndex + 1),
        ];
        saveConversations(newConversations); // Save the updated full list
        return newConversations;
    });
  }, []);

  return {
    conversations,
    currentConversationId,
    currentConversation,
    setCurrentConversationId,
    createConversation,
    updateConversationMessages,
    removeConversation,
    updateConversationTitle
  };
}