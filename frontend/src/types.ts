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