/** Dev-only logging — silent in production builds so nothing lands in device
 * consoles or shipped bundles. Swap the bodies here for a crash reporter
 * (Sentry, etc.) when one is wired up; call sites don't need to change. */
export const logger = {
  warn: (...args: unknown[]) => {
    if (__DEV__) console.warn(...args);
  },
  error: (...args: unknown[]) => {
    if (__DEV__) console.error(...args);
  },
};
