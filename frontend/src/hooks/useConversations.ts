import { useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { 
  Conversation, 
  ConversationType, 
  Message, 
  getConversations,
  saveConversations, 
  addConversation, 
  updateConversation,
  deleteConversation,
  getConversationById
} from '../types';

export default function useConversations() {
  // Current active conversation
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  
  // All conversations
  const [conversations, setConversations] = useState<Conversation[]>([]);
  
  // Load conversations from localStorage on initial load
  useEffect(() => {
    const loadedConversations = getConversations();
    setConversations(loadedConversations);
    
    // Set current conversation to the most recent one if it exists
    if (loadedConversations.length > 0) {
      // Sort by updatedAt and get the most recent
      const mostRecent = [...loadedConversations].sort((a, b) => b.updatedAt - a.updatedAt)[0];
      setCurrentConversationId(mostRecent.id);
    }
  }, []);
  
  // Get current conversation
  const currentConversation = currentConversationId 
    ? conversations.find(c => c.id === currentConversationId) 
    : null;
  
  // Create a new conversation
  const createConversation = useCallback((
    type: ConversationType = 'normal',
    title: string = 'New Chat',
    initialMessages: Message[] = []
  ): string => {
    const id = uuidv4();
    const now = Date.now();
    
    const newConversation: Conversation = {
      id,
      title,
      type,
      messages: initialMessages,
      createdAt: now,
      updatedAt: now,
    };
    
    // Update local state
    setConversations(prev => [...prev, newConversation]);
    setCurrentConversationId(id);
    
    // Update localStorage
    addConversation(newConversation);
    
    return id;
  }, []);
  
  // Update a conversation's messages
  const updateConversationMessages = useCallback((
    conversationId: string, 
    messages: Message[]
  ) => {
    if (!conversationId) return;
    
    const conversation = conversations.find(c => c.id === conversationId);
    if (!conversation) return;
    
    const updated = {
      ...conversation,
      messages,
      updatedAt: Date.now(),
    };
    
    // Update local state
    setConversations(prev => prev.map(c => c.id === conversationId ? updated : c));
    
    // Update localStorage
    updateConversation(updated);
  }, [conversations]);
  
  // Delete a conversation
  const removeConversation = useCallback((id: string) => {
    // Update local state
    setConversations(prev => prev.filter(c => c.id !== id));
    
    // If deleted conversation was the current one, select another one
    if (id === currentConversationId) {
      const remaining = conversations.filter(c => c.id !== id);
      if (remaining.length > 0) {
        setCurrentConversationId(remaining[0].id);
      } else {
        setCurrentConversationId(null);
      }
    }
    
    // Update localStorage
    deleteConversation(id);
  }, [conversations, currentConversationId]);

  // Update conversation title
  const updateConversationTitle = useCallback((
    conversationId: string, 
    title: string
  ) => {
    const conversation = conversations.find(c => c.id === conversationId);
    if (!conversation) return;
    
    const updated = {
      ...conversation,
      title,
      updatedAt: Date.now(),
    };
    
    // Update local state
    setConversations(prev => prev.map(c => c.id === conversationId ? updated : c));
    
    // Update localStorage
    updateConversation(updated);
  }, [conversations]);

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