/*
 * git-credential.test.ts
 *
 * Copyright (C) 2025 Posit Software, PBC
 */
import { unitTest } from "../test.ts";
import { assert, assertEquals } from "testing/asserts";
import { gitCredentialForUrl } from "../../src/core/git-credential.ts";

unitTest("git-credential - returns undefined for non-HTTP URL", async () => {
  const result = await gitCredentialForUrl("ftp://example.com/foo.tar.gz");
  assertEquals(result, undefined);
});

unitTest("git-credential - returns undefined for invalid URL", async () => {
  const result = await gitCredentialForUrl("not-a-url");
  assertEquals(result, undefined);
});

unitTest("git-credential - returns undefined for empty string", async () => {
  const result = await gitCredentialForUrl("");
  assertEquals(result, undefined);
});

unitTest("git-credential - returns headers or undefined for HTTPS URL", async () => {
  // Intentionally environment-dependent: returns undefined when no credentials
  // are configured, or a valid Authorization header when they are (e.g. CI with
  // gh auth, local dev with macOS Keychain, etc.).
  const result = await gitCredentialForUrl(
    "https://github.com/quarto-dev/quarto-cli/archive/refs/heads/main.tar.gz",
  );
  // Result is either undefined or an object with Authorization header
  if (result !== undefined) {
    assert(
      result["Authorization"]?.startsWith("Basic "),
      "Authorization header should use Basic scheme",
    );
  }
});
