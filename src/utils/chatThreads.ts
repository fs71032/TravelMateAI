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

export function appendChatMessage(list: ChatMessageRecord[], message: ChatMessageRecord): ChatMessageRecord[] {
  if (list.some((entry) => entry.id === message.id)) {
    return list;
  }

  const withoutPendingDuplicate = list.filter((entry) => {
    if (!entry.id.startsWith('pending-')) return true;
    return !(
      entry.content === message.content &&
      normalizeChatEmail(entry.from) === normalizeChatEmail(message.from) &&
      normalizeChatEmail(entry.to) === normalizeChatEmail(message.to) &&
      entry.room === message.room
    );
  });

  return [...withoutPendingDuplicate, message].sort(
    (a, b) => new Date(a.time).getTime() - new Date(b.time).getTime()
  );
}

export function filterThreadMessages(
  messages: ChatMessageRecord[],
  currentEmail: string,
  partnerEmail: string
): ChatMessageRecord[] {
  const self = normalizeChatEmail(currentEmail);
  const partner = normalizeChatEmail(partnerEmail);
  if (!self || !partner) return [];

  return messages.filter(
    (message) =>
      message.room === 'private' &&
      ((normalizeChatEmail(message.from) === self && normalizeChatEmail(message.to) === partner) ||
        (normalizeChatEmail(message.from) === partner && normalizeChatEmail(message.to) === self))
  );
}

export function buildConversationList(
  privateMessages: ChatMessageRecord[],
  currentEmail: string,
  onlineUsers: { name?: string; email?: string }[] = []
): ChatConversation[] {
  const self = normalizeChatEmail(currentEmail);
  const byPartner = new Map<string, ChatConversation>();

  for (const message of privateMessages) {
    if (message.room !== 'private') continue;

    const from = normalizeChatEmail(message.from);
    const to = normalizeChatEmail(message.to);
    let partner = '';
    if (from === self) partner = to;
    else if (to === self) partner = from;
    else continue;

    if (!partner || partner === self) continue;

    const existing = byPartner.get(partner);
    if (!existing || new Date(message.time).getTime() >= new Date(existing.lastTime).getTime()) {
      byPartner.set(partner, {
        email: partner,
        name: onlineUsers.find((user) => normalizeChatEmail(user.email) === partner)?.name,
        lastMessage: message.content,
        lastTime: message.time
      });
    }
  }

  return Array.from(byPartner.values()).sort(
    (a, b) => new Date(b.lastTime).getTime() - new Date(a.lastTime).getTime()
  );
}
