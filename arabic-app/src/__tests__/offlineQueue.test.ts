import {
  readQueue,
  enqueueCompletion,
  removeFromQueue,
  clearQueue,
  type KeyValueStore,
  type QueuedCompletion,
} from '../lib/offlineQueue';

// In-memory fake of the storage interface.
function makeStore(): KeyValueStore & { data: Record<string, string> } {
  const data: Record<string, string> = {};
  return {
    data,
    getItem: (k) => Promise.resolve(data[k] ?? null),
    setItem: (k, v) => {
      data[k] = v;
      return Promise.resolve();
    },
  };
}

const item = (lessonId: string): QueuedCompletion => ({
  lessonId,
  completedDay: '2026-07-01',
  enqueuedAt: '2026-07-01T10:00:00Z',
});

describe('offlineQueue', () => {
  it('starts empty', async () => {
    const store = makeStore();
    expect(await readQueue(store)).toEqual([]);
  });

  it('enqueues a completion', async () => {
    const store = makeStore();
    const q = await enqueueCompletion(store, item('l1'));
    expect(q).toHaveLength(1);
    expect(q[0].lessonId).toBe('l1');
  });

  it('de-dupes repeated completions for the same lesson', async () => {
    const store = makeStore();
    await enqueueCompletion(store, item('l1'));
    const q = await enqueueCompletion(store, item('l1'));
    expect(q).toHaveLength(1);
  });

  it('keeps distinct lessons separate', async () => {
    const store = makeStore();
    await enqueueCompletion(store, item('l1'));
    const q = await enqueueCompletion(store, item('l2'));
    expect(q.map((x) => x.lessonId)).toEqual(['l1', 'l2']);
  });

  it('removes a synced item', async () => {
    const store = makeStore();
    await enqueueCompletion(store, item('l1'));
    await enqueueCompletion(store, item('l2'));
    const q = await removeFromQueue(store, 'l1');
    expect(q.map((x) => x.lessonId)).toEqual(['l2']);
  });

  it('survives corrupt storage without throwing', async () => {
    const store = makeStore();
    store.data['offline:lesson-completions'] = '{not valid json';
    expect(await readQueue(store)).toEqual([]);
  });

  it('clears the queue', async () => {
    const store = makeStore();
    await enqueueCompletion(store, item('l1'));
    await clearQueue(store);
    expect(await readQueue(store)).toEqual([]);
  });
});
