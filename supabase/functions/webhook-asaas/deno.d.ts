// Ambient type declarations for Deno runtime APIs used by Supabase Edge Functions.
// This file allows VS Code's built-in TypeScript server to recognise Deno globals
// without requiring the Deno extension.

declare namespace Deno {
  /** Start an HTTP server. */
  function serve(handler: (req: Request) => Response | Promise<Response>): void

  /** Environment variable access. */
  const env: {
    get(key: string): string | undefined
    set(key: string, value: string): void
    delete(key: string): void
    toObject(): Record<string, string>
  }
}
