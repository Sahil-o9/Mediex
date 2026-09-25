/** Central place for reading server-side configuration. Never import this from client code. */

export function env(name: string): string | undefined {
  const v = process.env[name];
  return v && v.trim() ? v.trim() : undefined;
}

export function isProduction(): boolean {
  return process.env["NODE_ENV"] === "production";
}

/**
 * The documented demo doctor (doctor001) is accepted only outside production,
 * or when ALLOW_DEMO_ACCOUNTS=true is set explicitly (e.g. a hackathon demo deployment).
 */
export function demoAccountsAllowed(): boolean {
  return env("ALLOW_DEMO_ACCOUNTS") === "true" || !isProduction();
}
