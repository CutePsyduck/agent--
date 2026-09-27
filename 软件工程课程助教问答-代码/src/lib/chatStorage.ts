// EXPORTS: IChatMessage, IChatSession, getSessions, saveSessions, createSession, deleteSession, updateSession
import { scopedStorage } from '@lark-apaas/client-toolkit-lite';

const STORAGE_KEY = '__rag_se_chat_history';

export interface IChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations?: string[];
  isRefused?: boolean;
  suggestedQuestion?: string;
  timestamp: number;
}

export interface IChatSession {
  id: string;
  title: string;
  messages: IChatMessage[];
  createdAt: number;
  updatedAt: number;
}

export function getSessions(): IChatSession[] {
  try {
    const raw = scopedStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveSessions(sessions: IChatSession[]): void {
  try {
    scopedStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  } catch {
    // 存储失败静默处理
  }
}

export function createSession(): IChatSession {
  const now = Date.now();
  const session: IChatSession = {
    id: `sess_${now}_${Math.random().toString(36).slice(2, 8)}`,
    title: '新对话',
    messages: [],
    createdAt: now,
    updatedAt: now,
  };
  const sessions = getSessions();
  sessions.unshift(session);
  saveSessions(sessions);
  return session;
}

export function deleteSession(sessionId: string): void {
  const sessions = getSessions().filter((s) => s.id !== sessionId);
  saveSessions(sessions);
}

export function updateSession(session: IChatSession): void {
  const sessions = getSessions();
  const idx = sessions.findIndex((s) => s.id === session.id);
  session.updatedAt = Date.now();
  // 根据第一条用户消息更新标题
  const firstUserMsg = session.messages.find((m) => m.role === 'user');
  if (firstUserMsg && session.title === '新对话') {
    session.title = firstUserMsg.content.slice(0, 20) + (firstUserMsg.content.length > 20 ? '...' : '');
  }
  if (idx >= 0) {
    sessions[idx] = session;
  } else {
    sessions.unshift(session);
  }
  saveSessions(sessions);
}
