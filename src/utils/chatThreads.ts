export type ChatMessageRecord = {
  id: string;
  from: string;
  to?: string | null;
  room: string;
  content: string;
  time: string;
};

export type ChatConversation = {
  email: string;
  name?: string;
  lastMessage: string;
  lastTime: string;
};

export function normalizeChatEmail(value?: string | null): string {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}