export const CONVERSATION_REFRESH_MS = 5_000;

/** One request at a time; inactive or superseded results cannot reach the UI. */
export function startRefreshLoop<T>({
  load,
  onSuccess,
  onError,
  active: initiallyActive = true,
}: {
  load: (signal: AbortSignal) => Promise<T>;
  onSuccess: (value: T) => void;
  onError: (error: unknown) => void;
  active?: boolean;
}) {
  let active = initiallyActive;
  let disposed = false;
  let generation = 0;
  let failures = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let deadline: ReturnType<typeof setTimeout> | undefined;
  let controller: AbortController | undefined;

  function invalidate() {
    generation++;
    clearTimeout(timer);
    clearTimeout(deadline);
    controller?.abort();
  }
  function schedule(delay: number) {
    if (active && !disposed) timer = setTimeout(run, delay);
  }
  function failed(error: unknown) {
    failures++;
    onError(error);
    schedule(Math.min(CONVERSATION_REFRESH_MS * 2 ** (failures - 1), 60_000));
  }
  async function run() {
    if (!active || disposed) return;
    const current = ++generation;
    const request = new AbortController();
    controller = request;
    const isCurrent = () => active && !disposed && current === generation;
    deadline = setTimeout(() => {
      if (!isCurrent()) return;
      generation++;
      request.abort();
      failed(new Error('Checking for replies timed out.'));
    }, 20_000);
    try {
      const value = await load(request.signal);
      if (!isCurrent()) return;
      clearTimeout(deadline);
      failures = 0;
      onSuccess(value);
      schedule(CONVERSATION_REFRESH_MS);
    } catch (error) {
      if (!isCurrent()) return;
      clearTimeout(deadline);
      failed(error);
    }
  }
  void run();
  return {
    refresh() {
      if (!active || disposed) return;
      invalidate();
      failures = 0;
      void run();
    },
    setActive(next: boolean) {
      if (disposed || active === next) return false;
      invalidate();
      active = next;
      failures = 0;
      if (active) void run();
      return true;
    },
    stop() {
      disposed = true;
      active = false;
      invalidate();
    },
  };
}
