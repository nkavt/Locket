// The store is a whole-dataset document, so every mutation is load -> change
// -> save. Serialising through one lock keeps MCP writes, IPC writes and
// renderer full-state saves from interleaving.

let chain: Promise<unknown> = Promise.resolve();

/** Run `fn` exclusively against the database. */
export const withDbLock = <T>(fn: () => Promise<T>): Promise<T> => {
  const run = chain.then(fn, fn);
  chain = run.catch(() => undefined);
  return run;
};
