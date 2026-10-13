import assert from "node:assert/strict";
import { test } from "node:test";

import { greetingLine, greetingText } from "../src/lib/greeting.js";

test("greetingLine builds Hello, NAME! with LF", () => {
  assert.equal(greetingLine("World"), "Hello, World!\n");
});

test("greetingLine keeps the name verbatim (spaces, punctuation, non-ASCII)", () => {
  assert.equal(greetingLine("Ada Lovelace"), "Hello, Ada Lovelace!\n");
  assert.equal(greetingLine("Zoë"), "Hello, Zoë!\n");
  assert.equal(greetingLine("-x"), "Hello, -x!\n");
  assert.equal(greetingLine("'$HOME' \\n"), "Hello, '$HOME' \\n!\n");
});

test("greetingText repeats the line count times", () => {
  assert.equal(greetingText("Ken", 1), "Hello, Ken!\n");
  assert.equal(greetingText("Ken", 3), "Hello, Ken!\n".repeat(3));
  assert.equal(greetingText("Ken", 1000).length, "Hello, Ken!\n".length * 1000);
});

test("greetingText is empty for a count of 0 or less", () => {
  assert.equal(greetingText("Ken", 0), "");
  assert.equal(greetingText("Ken", -1), "");
});
