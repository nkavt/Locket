const EXTERNAL_PROTOCOLS = new Set(['http:', 'https:', 'mailto:']);

/** True when a URL may be handed to the OS (browser or mail client). Everything else is dropped. */
export const isAllowedExternalUrl = (url: string): boolean => {
  try {
    return EXTERNAL_PROTOCOLS.has(new URL(url).protocol);
  } catch {
    return false;
  }
};

/** True when a navigation stays on the dev server, so Vite's full reloads keep working. */
export const isDevServerUrl = (url: string, devServerUrl: string | undefined): boolean => {
  if (!devServerUrl) return false;
  try {
    return new URL(url).origin === new URL(devServerUrl).origin;
  } catch {
    return false;
  }
};
