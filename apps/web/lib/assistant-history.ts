type StoredConversationSnapshot = {
  date: string;
  conversationId: string;
  title: string;
  preview: string;
  updatedAt: string;
};

export type AssistantActionItem = {
  id: string;
  date: string;
  title: string;
  detail: string;
  done: boolean;
  sourceMessageId: string;
  createdAt: string;
};

const ASSISTANT_HISTORY_KEY = 'xiaojian-assistant-history-v1';
const ASSISTANT_ACTION_ITEMS_KEY = 'xiaojian-assistant-action-items-v1';

function hasWindow() {
  return typeof window !== 'undefined';
}

function readJson<T>(key: string, fallback: T) {
  if (!hasWindow()) {
    return fallback;
  }

  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T) {
  if (!hasWindow()) {
    return;
  }

  window.localStorage.setItem(key, JSON.stringify(value));
}

function buildItemId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `item-${Date.now()}`;
}

export function readAssistantConversationSnapshots() {
  return readJson<StoredConversationSnapshot[]>(ASSISTANT_HISTORY_KEY, []);
}

export function saveAssistantConversationSnapshot(snapshot: StoredConversationSnapshot) {
  const current = readAssistantConversationSnapshots().filter((item) => item.conversationId !== snapshot.conversationId);
  current.unshift(snapshot);
  writeJson(ASSISTANT_HISTORY_KEY, current.slice(0, 12));
}

export function readAssistantActionItems(date: string) {
  return readJson<AssistantActionItem[]>(ASSISTANT_ACTION_ITEMS_KEY, []).filter((item) => item.date === date);
}

export function addAssistantActionItem(date: string, sourceMessageId: string, title: string, detail: string) {
  const nextItem: AssistantActionItem = {
    id: buildItemId(),
    date,
    title,
    detail,
    done: false,
    sourceMessageId,
    createdAt: new Date().toISOString(),
  };
  const current = readJson<AssistantActionItem[]>(ASSISTANT_ACTION_ITEMS_KEY, []);
  writeJson(ASSISTANT_ACTION_ITEMS_KEY, [nextItem, ...current]);
  return nextItem;
}

export function toggleAssistantActionItem(date: string, itemId: string) {
  const current = readJson<AssistantActionItem[]>(ASSISTANT_ACTION_ITEMS_KEY, []);
  const next = current.map((item) =>
    item.date === date && item.id === itemId ? { ...item, done: !item.done } : item,
  );
  writeJson(ASSISTANT_ACTION_ITEMS_KEY, next);
  return next.filter((item) => item.date === date);
}

export function removeAssistantActionItem(date: string, itemId: string) {
  const next = readJson<AssistantActionItem[]>(ASSISTANT_ACTION_ITEMS_KEY, []).filter(
    (item) => !(item.date === date && item.id === itemId),
  );
  writeJson(ASSISTANT_ACTION_ITEMS_KEY, next);
  return next.filter((item) => item.date === date);
}
