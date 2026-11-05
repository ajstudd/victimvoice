import { test } from 'node:test';
import assert from 'node:assert/strict';
import { startRefreshLoop, CONVERSATION_REFRESH_MS } from '../../shared/refresh-loop.ts';

const settle = async () => { for (let i = 0; i < 5; i++) await Promise.resolve(); };
const deferred = <T>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => { resolve = done; });
  return { promise, resolve };
};

test('a support reply reaches an open conversation without a manual refresh', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const stored = ['User asks for support'];
  let visible: string[] = [];
  let requests = 0;
  const loop = startRefreshLoop({
    load: async () => { requests++; return [...stored]; },
    onSuccess: value => { visible = value; }, onError: error => assert.fail(String(error)),
  });
  await settle();
  stored.push('Support replies');
  t.mock.timers.tick(CONVERSATION_REFRESH_MS);
  await settle();
  assert.deepEqual(visible, stored);
  t.mock.timers.tick(CONVERSATION_REFRESH_MS);
  await settle();
  assert.deepEqual(visible, stored, 'subsequent checks must not duplicate messages');
  assert.equal(requests, 3);
  loop.stop();
});

test('inactive conversations make no requests and catch up immediately on return', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  let requests = 0;
  const loop = startRefreshLoop({
    active: false, load: async () => ++requests, onSuccess: () => {}, onError: error => assert.fail(String(error)),
  });
  t.mock.timers.tick(60_000);
  assert.equal(requests, 0);
  loop.setActive(true);
  await settle();
  assert.equal(requests, 1);
  loop.setActive(false);
  t.mock.timers.tick(60_000);
  assert.equal(requests, 1);
  loop.setActive(true);
  await settle();
  assert.equal(requests, 2);
  loop.stop();
});

test('backgrounding aborts the fetch and ignores a late private response', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const pending = deferred<string>();
  let signal: AbortSignal | undefined;
  const received: string[] = [];
  const loop = startRefreshLoop({
    load: s => { signal = s; return pending.promise; },
    onSuccess: value => { received.push(value); }, onError: error => assert.fail(String(error)),
  });
  loop.setActive(false);
  assert.equal(signal?.aborted, true);
  pending.resolve('late response');
  await settle();
  assert.deepEqual(received, []);
  loop.stop();
});

test('leaving or switching account permanently stops the old conversation loop', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const pending = deferred<string>();
  let requests = 0;
  const received: string[] = [];
  const loop = startRefreshLoop({
    load: () => { requests++; return pending.promise; },
    onSuccess: value => { received.push(value); }, onError: error => assert.fail(String(error)),
  });
  loop.stop();
  loop.refresh();
  loop.setActive(true);
  pending.resolve('previous account');
  await settle();
  t.mock.timers.tick(120_000);
  assert.equal(requests, 1);
  assert.deepEqual(received, []);
});

test('checking immediately after sending supersedes an older pending fetch', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const old = deferred<string>();
  let firstSignal: AbortSignal | undefined;
  let requests = 0;
  const received: string[] = [];
  const loop = startRefreshLoop({
    load: signal => {
      if (++requests === 1) { firstSignal = signal; return old.promise; }
      return Promise.resolve('new reply');
    }, onSuccess: value => { received.push(value); }, onError: error => assert.fail(String(error)),
  });
  loop.refresh();
  await settle();
  old.resolve('outdated page');
  await settle();
  assert.equal(firstSignal?.aborted, true);
  assert.deepEqual(received, ['new reply']);
  loop.stop();
});

test('slow requests never accumulate overlapping scheduled fetches', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const pending = deferred<number>();
  let requests = 0;
  const loop = startRefreshLoop({
    load: () => { requests++; return pending.promise; },
    onSuccess: () => {}, onError: error => assert.fail(String(error)),
  });
  t.mock.timers.tick(15_000);
  assert.equal(requests, 1);
  pending.resolve(1);
  await settle();
  t.mock.timers.tick(4_999);
  assert.equal(requests, 1);
  t.mock.timers.tick(1);
  assert.equal(requests, 2);
  loop.stop();
});

test('connection failures back off and successful recovery restores the five-second interval', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  let requests = 0;
  let errors = 0;
  const received: number[] = [];
  const loop = startRefreshLoop({
    load: async () => { if (++requests < 3) throw new Error('offline'); return requests; },
    onSuccess: value => { received.push(value); }, onError: () => { errors++; },
  });
  await settle();
  t.mock.timers.tick(5_000);
  await settle();
  assert.equal(requests, 2);
  t.mock.timers.tick(9_999);
  assert.equal(requests, 2);
  t.mock.timers.tick(1);
  await settle();
  assert.equal(errors, 2);
  assert.deepEqual(received, [3]);
  t.mock.timers.tick(5_000);
  await settle();
  assert.deepEqual(received, [3, 4]);
  loop.stop();
});

test('hung requests time out, retry and cannot replace a newer response', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const hung = deferred<string>();
  let signal: AbortSignal | undefined;
  let requests = 0;
  let errors = 0;
  const received: string[] = [];
  const loop = startRefreshLoop({
    load: s => {
      if (++requests === 1) { signal = s; return hung.promise; }
      return Promise.resolve('recovered');
    }, onSuccess: value => { received.push(value); }, onError: () => { errors++; },
  });
  t.mock.timers.tick(20_000);
  assert.equal(signal?.aborted, true);
  assert.equal(errors, 1);
  t.mock.timers.tick(5_000);
  await settle();
  hung.resolve('stale');
  await settle();
  assert.deepEqual(received, ['recovered']);
  loop.stop();
});
