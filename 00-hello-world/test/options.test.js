import assert from "node:assert/strict";
import { test } from "node:test";

import { parseArgs } from "../src/lib/options.js";

/** A greet result with the given raw values. */
function greet({ name = null, count = null, firstOperand = null } = {}) {
  return { action: "greet", name, count, firstOperand };
}

const value = (v, option) => ({ value: v, option });
const error = (message) => ({ action: "error", message });

test("no arguments: defaults", () => {
  assert.deepEqual(parseArgs([]), greet());
});

test("name in every spelling", () => {
  for (const [args, option] of [
    [["-n", "Ada"], "-n"],
    [["-nAda"], "-n"],
    [["--name", "Ada"], "--name"],
    [["--name=Ada"], "--name"],
  ]) {
    assert.deepEqual(
      parseArgs(args),
      greet({ name: value("Ada", option) }),
      args.join(" "),
    );
  }
});

test("count in every spelling, including bundled -c2", () => {
  assert.deepEqual(
    parseArgs(["-c2", "-nKen"]),
    greet({ name: value("Ken", "-n"), count: value("2", "-c") }),
  );
  assert.deepEqual(parseArgs(["-c", "2"]), greet({ count: value("2", "-c") }));
  assert.deepEqual(
    parseArgs(["--count=2"]),
    greet({ count: value("2", "--count") }),
  );
  assert.deepEqual(
    parseArgs(["--count", "2"]),
    greet({ count: value("2", "--count") }),
  );
});

test("an attached value consumes the rest of the bundle", () => {
  assert.deepEqual(parseArgs(["-nc2"]), greet({ name: value("c2", "-n") }));
});

test("values may begin with '-' or be empty", () => {
  assert.deepEqual(
    parseArgs(["--name=-x"]),
    greet({ name: value("-x", "--name") }),
  );
  assert.deepEqual(parseArgs(["-n-x"]), greet({ name: value("-x", "-n") }));
  assert.deepEqual(
    parseArgs(["--name", "-x"]),
    greet({ name: value("-x", "--name") }),
  );
  assert.deepEqual(
    parseArgs(["-n", "--help"]),
    greet({ name: value("--help", "-n") }),
  );
  assert.deepEqual(
    parseArgs(["--name="]),
    greet({ name: value("", "--name") }),
  );
  assert.deepEqual(parseArgs(["-n", ""]), greet({ name: value("", "-n") }));
});

test("the last occurrence wins, unvalidated", () => {
  assert.deepEqual(
    parseArgs(["-n", "A", "--name", "B"]),
    greet({ name: value("B", "--name") }),
  );
  assert.deepEqual(
    parseArgs(["-c", "0", "-c", "5"]),
    greet({ count: value("5", "-c") }),
  );
});

test("operands, '-', and everything after '--' are collected", () => {
  assert.deepEqual(parseArgs(["extra"]), greet({ firstOperand: "extra" }));
  assert.deepEqual(parseArgs(["-"]), greet({ firstOperand: "-" }));
  assert.deepEqual(parseArgs(["--", "-n"]), greet({ firstOperand: "-n" }));
  assert.deepEqual(
    parseArgs(["a", "-n", "B", "c"]),
    greet({ name: value("B", "-n"), firstOperand: "a" }),
  );
  assert.deepEqual(parseArgs(["--"]), greet());
});

test("--help and --version end the scan", () => {
  assert.deepEqual(parseArgs(["--help"]), { action: "help" });
  assert.deepEqual(parseArgs(["--version"]), { action: "version" });
  assert.deepEqual(parseArgs(["--help", "extra", "-x"]), { action: "help" });
  assert.deepEqual(parseArgs(["--version", "--help"]), { action: "version" });
  assert.deepEqual(parseArgs(["-c", "0", "--help"]), { action: "help" });
  assert.deepEqual(parseArgs(["extra", "--version"]), { action: "version" });
});

test("an earlier syntax error wins over --help", () => {
  assert.deepEqual(parseArgs(["-x", "--help"]), error("invalid option -- 'x'"));
});

test("unknown short options", () => {
  assert.deepEqual(parseArgs(["-x"]), error("invalid option -- 'x'"));
  assert.deepEqual(parseArgs(["-h"]), error("invalid option -- 'h'"));
  assert.deepEqual(parseArgs(["-ë"]), error("invalid option -- 'ë'"));
  assert.deepEqual(parseArgs(["-😀"]), error("invalid option -- '😀'"));
});

test("unknown and abbreviated long options echo the whole token", () => {
  assert.deepEqual(
    parseArgs(["--nme", "Ada"]),
    error("unrecognized option '--nme'"),
  );
  assert.deepEqual(parseArgs(["--nam"]), error("unrecognized option '--nam'"));
  assert.deepEqual(parseArgs(["--x=1"]), error("unrecognized option '--x=1'"));
  assert.deepEqual(
    parseArgs(["---name=A"]),
    error("unrecognized option '---name=A'"),
  );
});

test("missing option arguments", () => {
  assert.deepEqual(
    parseArgs(["-n"]),
    error("option requires an argument -- 'n'"),
  );
  assert.deepEqual(
    parseArgs(["-c"]),
    error("option requires an argument -- 'c'"),
  );
  assert.deepEqual(
    parseArgs(["--name"]),
    error("option '--name' requires an argument"),
  );
  assert.deepEqual(
    parseArgs(["--count"]),
    error("option '--count' requires an argument"),
  );
});

test("--help and --version take no argument", () => {
  assert.deepEqual(
    parseArgs(["--help="]),
    error("option '--help' doesn't allow an argument"),
  );
  assert.deepEqual(
    parseArgs(["--version=1"]),
    error("option '--version' doesn't allow an argument"),
  );
});
