import { spawn } from 'node:child_process';

// Best-effort cross-platform browser launch. Resolves once the launcher
// process has spawned; we never block login on the browser itself, so the
// caller should always surface the URL as a fallback.
export async function openBrowser(url) {
  const { command, args } = openBrowserCommand(url);

  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { detached: true, stdio: 'ignore' });
    // The launcher hands off to the browser and exits; don't let it keep the
    // CLI's event loop alive after login completes.
    child.unref();
    child.once('error', reject);
    child.once('spawn', () => resolve());
  });
}

function openBrowserCommand(url) {
  switch (process.platform) {
    case 'darwin':
      return { command: 'open', args: [url] };
    case 'win32':
      // Avoid cmd.exe because OAuth query strings contain shell metacharacters
      // such as &, and the authorize URL may be overridden by the user.
      return { command: 'rundll32.exe', args: ['url.dll,FileProtocolHandler', url] };
    default:
      return { command: 'xdg-open', args: [url] };
  }
}
