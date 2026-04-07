/*
 * git-credential.test.ts
 *
 * Copyright (C) 2020-2022 Posit Software, PBC
 */
import { unitTest } from "../test.ts";
import { assert, assertEquals } from "testing/asserts";
import { gitCredentialForUrl } from "../../src/core/git-credential.ts";

// deno-lint-ignore require-await
unitTest("git-credential - returns undefined for non-HTTP URL", async () => {
  const result = await gitCredentialForUrl("ftp://example.com/foo.tar.gz");
  assertEquals(result, undefined);
});

// deno-lint-ignore require-await
unitTest("git-credential - returns undefined for invalid URL", async () => {
  const result = await gitCredentialForUrl("not-a-url");
  assertEquals(result, undefined);
});

// deno-lint-ignore require-await
unitTest("git-credential - returns undefined for empty string", async () => {
  const result = await gitCredentialForUrl("");
  assertEquals(result, undefined);
});

unitTest("git-credential - returns headers or undefined for HTTPS URL", async () => {
  // This test verifies the function doesn't throw for a valid HTTPS URL.
  // It may return undefined (no credentials configured) or HeadersInit
  // (credentials found) depending on the environment.
  const result = await gitCredentialForUrl(
    "https://github.com/quarto-dev/quarto-cli/archive/refs/heads/main.tar.gz",
  );
  // Result is either undefined or an object with Authorization header
  if (result !== undefined) {
    const headers = result as Record<string, string>;
    assert(
      headers["Authorization"]?.startsWith("Basic "),
      "Authorization header should use Basic scheme",
    );
  }
});
