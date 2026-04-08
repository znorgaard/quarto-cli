/*
 * git-credential.ts
 *
 * Copyright (C) 2026 Posit Software, PBC
 */

import { debug } from "../deno_ral/log.ts";
import { which } from "./path.ts";
import { execProcess } from "./process.ts";

export interface GitCredentialResult {
  headers: { Authorization: string };
  approve: () => Promise<void>;
  reject: () => Promise<void>;
}

/**
 * Look up git credentials for a URL using `git credential fill`.
 * Returns a result with auth headers and approve/reject callbacks
 * per the git-credential protocol, or undefined if git is unavailable
 * or no credentials are configured.
 */
export async function gitCredentialForUrl(
  url: string,
): Promise<GitCredentialResult | undefined> {
  try {
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      return undefined;
    }

    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return undefined;
    }

    if (!(await which("git"))) {
      return undefined;
    }

    const input = [
      `protocol=${parsed.protocol.replace(":", "")}`,
      `host=${parsed.host}`,
      `path=${parsed.pathname.replace(/^\//, "")}`,
      "",
      "",
    ].join("\n");

    debug(`[git-credential] Looking up credentials for ${parsed.protocol}//${parsed.host}${parsed.pathname}`);
    const result = await execProcess(
      {
        cmd: "git",
        args: ["credential", "fill"],
        stdout: "piped",
        stderr: "piped",
        env: { ...Deno.env.toObject(), GIT_TERMINAL_PROMPT: "0" },
      },
      input,
      undefined, // mergeOutput
      undefined, // stderrFilter
      undefined, // respectStreams
      10000, // timeout (ms)
    );

    if (!result.success || !result.stdout) {
      return undefined;
    }

    const headers = parseGitCredentialOutput(result.stdout);
    if (!headers) {
      return undefined;
    }

    const credentialOutput = result.stdout;
    return {
      headers,
      approve: () => gitCredentialAction("approve", credentialOutput),
      reject: () => gitCredentialAction("reject", credentialOutput),
    };
  } catch {
    return undefined;
  }
}

async function gitCredentialAction(
  action: "approve" | "reject",
  input: string,
): Promise<void> {
  try {
    await execProcess(
      {
        cmd: "git",
        args: ["credential", action],
        stdout: "piped",
        stderr: "piped",
        env: { ...Deno.env.toObject(), GIT_TERMINAL_PROMPT: "0" },
      },
      input,
      undefined,
      undefined,
      undefined,
      5000,
    );
  } catch {
    // Best-effort — silently ignore failures
  }
}

/**
 * Parse the output of `git credential fill` into a Basic auth header.
 * Returns undefined if the output is missing username or password.
 */
export function parseGitCredentialOutput(
  stdout: string,
): { Authorization: string } | undefined {
  const lines = stdout.split("\n");
  let username: string | undefined;
  let password: string | undefined;

  for (const line of lines) {
    const trimmed = line.replace(/\r$/, "");
    const [key, ...valueParts] = trimmed.split("=");
    const value = valueParts.join("=");
    if (key.trim() === "username") username = value;
    if (key.trim() === "password") password = value;
  }

  if (!username || !password) {
    return undefined;
  }

  // Encode via TextEncoder to handle non-ASCII characters, then convert
  // to a binary string that btoa can accept (btoa only handles Latin-1).
  const encoded = new TextEncoder().encode(`${username}:${password}`);
  const binary = Array.from(encoded, (b) => String.fromCharCode(b)).join("");
  const base64 = btoa(binary);
  return { "Authorization": `Basic ${base64}` };
}
