/*
 * git-credential.ts
 *
 * Copyright (C) 2025 Posit Software, PBC
 */

import { which } from "./path.ts";
import { execProcess } from "./process.ts";

/**
 * Look up git credentials for a URL using `git credential fill`.
 * Returns HTTP headers with Basic auth if credentials are found,
 * or undefined if git is unavailable or no credentials are configured.
 */
export async function gitCredentialForUrl(
  url: string,
): Promise<Record<string, string> | undefined> {
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

    const result = await execProcess(
      {
        cmd: "git",
        args: ["credential", "fill"],
        stdout: "piped",
        stderr: "piped",
      },
      input,
      undefined, // mergeOutput
      undefined, // stderrFilter
      undefined, // respectStreams
      5000, // timeout (ms)
    );

    if (!result.success || !result.stdout) {
      return undefined;
    }

    const lines = result.stdout.split("\n");
    let username: string | undefined;
    let password: string | undefined;

    for (const line of lines) {
      const [key, ...valueParts] = line.split("=");
      const value = valueParts.join("=");
      if (key === "username") username = value;
      if (key === "password") password = value;
    }

    if (!username || !password) {
      return undefined;
    }

    // Use TextEncoder to handle non-ASCII credentials safely
    const encoded = new TextEncoder().encode(`${username}:${password}`);
    const binary = Array.from(encoded, (b) => String.fromCharCode(b)).join("");
    const base64 = btoa(binary);
    return { "Authorization": `Basic ${base64}` };
  } catch {
    return undefined;
  }
}
