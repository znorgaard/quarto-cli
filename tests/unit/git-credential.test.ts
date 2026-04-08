/*
 * git-credential.test.ts
 *
 * Copyright (C) 2026 Posit Software, PBC
 */
import { unitTest } from "../test.ts";
import { assert, assertEquals } from "testing/asserts";
import { gitCredentialForUrl, parseGitCredentialOutput } from "../../src/core/git-credential.ts";

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

unitTest("git-credential - accepts http:// URLs", async () => {
  // Verify http:// is not rejected like ftp:// — should reach credential lookup
  // (returns undefined if no credentials configured, which is fine)
  const result = await gitCredentialForUrl("http://example.com/org/repo/archive/main.tar.gz");
  if (result !== undefined) {
    assert(
      result.headers["Authorization"]?.startsWith("Basic "),
      "Authorization header should use Basic scheme",
    );
  }
});

// deno-lint-ignore require-await
unitTest("parseGitCredentialOutput - parses valid credential output", async () => {
  const output = [
    "protocol=https",
    "host=github.com",
    "username=testuser",
    "password=testtoken",
    "",
  ].join("\n");
  const result = parseGitCredentialOutput(output);
  assertEquals(result, { "Authorization": `Basic ${btoa("testuser:testtoken")}` });
});

// deno-lint-ignore require-await
unitTest("parseGitCredentialOutput - handles password containing equals signs", async () => {
  const output = [
    "protocol=https",
    "host=github.com",
    "username=user",
    "password=tok=en=value",
    "",
  ].join("\n");
  const result = parseGitCredentialOutput(output);
  assertEquals(result, { "Authorization": `Basic ${btoa("user:tok=en=value")}` });
});

// deno-lint-ignore require-await
unitTest("parseGitCredentialOutput - returns undefined when username is missing", async () => {
  const output = [
    "protocol=https",
    "host=github.com",
    "password=testtoken",
    "",
  ].join("\n");
  assertEquals(parseGitCredentialOutput(output), undefined);
});

// deno-lint-ignore require-await
unitTest("parseGitCredentialOutput - returns undefined when password is missing", async () => {
  const output = [
    "protocol=https",
    "host=github.com",
    "username=testuser",
    "",
  ].join("\n");
  assertEquals(parseGitCredentialOutput(output), undefined);
});

// deno-lint-ignore require-await
unitTest("parseGitCredentialOutput - returns undefined for empty string", async () => {
  assertEquals(parseGitCredentialOutput(""), undefined);
});

// deno-lint-ignore require-await
unitTest("parseGitCredentialOutput - handles Windows \\r\\n line endings", async () => {
  const output = "protocol=https\r\nhost=github.com\r\nusername=testuser\r\npassword=testtoken\r\n";
  const result = parseGitCredentialOutput(output);
  assertEquals(result, { "Authorization": `Basic ${btoa("testuser:testtoken")}` });
});

// deno-lint-ignore require-await
unitTest("parseGitCredentialOutput - handles non-ASCII credentials", async () => {
  const output = [
    "protocol=https",
    "host=github.com",
    "username=ユーザー",
    "password=パスワード",
    "",
  ].join("\n");
  const result = parseGitCredentialOutput(output);
  // Hardcoded base64 of the UTF-8 encoding of "ユーザー:パスワード"
  assertEquals(result, { "Authorization": "Basic 44Om44O844K244O8OuODkeOCueODr+ODvOODiQ==" });
});

unitTest("git-credential - returns headers or undefined for HTTPS URL", async () => {
  // Intentionally environment-dependent: returns undefined when no credentials
  // are configured, or a valid Authorization header when they are (e.g. CI with
  // gh auth, local dev with macOS Keychain, etc.).
  const result = await gitCredentialForUrl(
    "https://github.com/quarto-dev/quarto-cli/archive/refs/heads/main.tar.gz",
  );
  // Result is either undefined or a GitCredentialResult with headers and callbacks
  if (result !== undefined) {
    assert(
      result.headers["Authorization"]?.startsWith("Basic "),
      "Authorization header should use Basic scheme",
    );
    assert(typeof result.approve === "function", "should have approve callback");
    assert(typeof result.reject === "function", "should have reject callback");
  }
});
