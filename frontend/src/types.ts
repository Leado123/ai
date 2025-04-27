/**
 * Defines the structure for a single message in the conversation.
 */
export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ModalItem {
  setModalOpen: (open: boolean) => void;
}

/**
 * Defines the structure for the initial prompt suggestion cards.
 */
export interface PromptCard {
    title: string;
    description: string;
    icon: string;
    hoverColor?: string; // Optional hover color class
}

export type ConversationType = "flashcard" | "normal" | "research" | "custom";

export interface Conversation {
  id: string; // unique id (e.g., uuid)
  title: string;
  type: ConversationType;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
}

const STORAGE_KEY = "conversations";

export function getConversations(): Conversation[] {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as Conversation[];
  } catch {
    return [];
  }
}

export function saveConversations(convos: Conversation[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(convos));
}

export function addConversation(convo: Conversation) {
  const convos = getConversations();
  convos.push(convo);
  saveConversations(convos);
}

export function updateConversation(updated: Conversation) {
  const convos = getConversations().map(c =>
    c.id === updated.id ? updated : c
  );
  saveConversations(convos);
}

export function deleteConversation(id: string) {
  const convos = getConversations().filter(c => c.id !== id);
  saveConversations(convos);
}

export function getConversationById(id: string): Conversation | undefined {
  return getConversations().find(c => c.id === id);
}