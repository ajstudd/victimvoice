// Resolve edits at write time so two screens cannot overwrite each other's changes.
export function createVaultWriter<T>({
  read,
  write,
  commit,
  isCurrent,
}: {
  read: () => T;
  write: (v: T) => Promise<void>;
  commit: (v: T) => void;
  isCurrent: () => boolean;
}) {
  let queue = Promise.resolve();
  return (edit: (v: T) => T) => {
    const task = queue.then(async () => {
      if (!isCurrent())
        throw new Error(
          "Your private space changed. Reopen this screen and try again.",
        );
      const value = edit(read());
      await write(value);
      if (!isCurrent())
        throw new Error(
          "Your private space changed. Reopen this screen and try again.",
        );
      commit(value);
    });
    queue = task.catch(() => {});
    return task;
  };
}
