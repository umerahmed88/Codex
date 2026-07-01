// ============================================================================
// A tiny offline action queue backed by AsyncStorage.
//
// WHY: a user mid-lesson on a flaky Riyadh connection must not lose their
// "complete" action. When a write fails (offline), we enqueue it; on the next
// successful app foreground / reconnect we flush the queue.
//
// The queue OPERATIONS here are pure/deterministic given the storage adapter,
// so they can be unit-tested with an in-memory fake.
// ============================================================================

export interface QueuedCompletion {
  lessonId: string;
  // The local calendar day the user completed on — captured at enqueue time so
  // a late sync still credits the correct day for the streak.
  completedDay: string; // 'YYYY-MM-DD'
  enqueuedAt: string; // ISO timestamp, for ordering/debugging
}

const STORAGE_KEY = 'offline:lesson-completions';

// Minimal storage interface — AsyncStorage satisfies it, and tests pass a fake.
export interface KeyValueStore {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}

export async function readQueue(store: KeyValueStore): Promise<QueuedCompletion[]> {
  const raw = await store.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as QueuedCompletion[]) : [];
  } catch {
    // Corrupt data → start clean rather than crash.
    return [];
  }
}

export async function enqueueCompletion(
  store: KeyValueStore,
  item: QueuedCompletion
): Promise<QueuedCompletion[]> {
  const queue = await readQueue(store);
  // De-dupe: one pending completion per lesson is enough.
  if (queue.some((q) => q.lessonId === item.lessonId)) return queue;
  const next = [...queue, item];
  await store.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

export async function removeFromQueue(
  store: KeyValueStore,
  lessonId: string
): Promise<QueuedCompletion[]> {
  const queue = await readQueue(store);
  const next = queue.filter((q) => q.lessonId !== lessonId);
  await store.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

export async function clearQueue(store: KeyValueStore): Promise<void> {
  await store.setItem(STORAGE_KEY, JSON.stringify([]));
}
