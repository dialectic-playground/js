import assert from "node:assert/strict";
import { PassThrough } from "node:stream";
import { test } from "node:test";

import { HELP_TEXT, run, VERSION_TEXT } from "../src/lib/app.js";
import { emit, encode } from "../src/lib/output.js";

const TRY = "Try 'dp-hello --help' for more information.\n";
const ok = (stdout) => ({ stdout, stderr: "", status: 0 });
const usage = (message) => ({
  stdout: "",
  stderr: `dp-hello: ${message}\n${TRY}`,
  status: 2,
});

test("default and named greetings", () => {
  assert.deepEqual(run([]), ok("Hello, World!\n"));
  assert.deepEqual(
    run(["--name", "Ada Lovelace"]),
    ok("Hello, Ada Lovelace!\n"),
  );
  assert.deepEqual(run(["-c2", "-n", "Ken"]), ok("Hello, Ken!\nHello, Ken!\n"));
  assert.deepEqual(run(["-n", "A", "-n", "B"]), ok("Hello, B!\n"));
});

test("help text matches the user manual byte for byte", () => {
  assert.deepEqual(run(["--help"]), ok(HELP_TEXT));
  assert.equal(
    HELP_TEXT,
    [
      "Usage: dp-hello [OPTION]...",
      "Print a greeting to standard output.",
      "",
      "Options:",
      "  -n, --name=NAME     greet NAME instead of World",
      "  -c, --count=COUNT   print the greeting COUNT times (1-1000, default 1)",
      "      --help          display this help and exit",
      "      --version       output version information and exit",
      "",
    ].join("\n"),
  );
  assert.deepEqual(run(["--help", "extra", "-x"]), ok(HELP_TEXT));
});

test("version line", () => {
  assert.equal(VERSION_TEXT, "dp-hello (dialectic-playground) 1.0.0\n");
  assert.deepEqual(run(["--version"]), ok(VERSION_TEXT));
});

test("every usage error: two stderr lines, empty stdout, status 2", () => {
  const cases = [
    [["-x"], "invalid option -- 'x'"],
    [["--nme", "Ada"], "unrecognized option '--nme'"],
    [["--name"], "option '--name' requires an argument"],
    [["-c"], "option requires an argument -- 'c'"],
    [["--version=1"], "option '--version' doesn't allow an argument"],
    [["--name", ""], "invalid argument '' for '--name'"],
    [["--count", "0"], "invalid argument '0' for '--count'"],
    [["-c", "abc"], "invalid argument 'abc' for '-c'"],
    [["-c", "1001"], "invalid argument '1001' for '-c'"],
    [["extra"], "extra operand 'extra'"],
    [["--", "-n"], "extra operand '-n'"],
    [["-n", "Zoë", "Zoë"], "extra operand 'Zoë'"],
  ];
  for (const [args, message] of cases) {
    assert.deepEqual(run(args), usage(message), args.join(" "));
  }
});

test("encode produces UTF-8 bytes", () => {
  assert.deepEqual(
    encode("Zoë\n"),
    Buffer.from([0x5a, 0x6f, 0xc3, 0xab, 0x0a]),
  );
});

/** Collect everything written to a stream as one Buffer. */
function capture() {
  const stream = new PassThrough();
  const chunks = [];
  stream.on("data", (chunk) => chunks.push(chunk));
  return { stream, bytes: () => Buffer.concat(chunks) };
}

test("emit writes UTF-8 bytes with LF only and sets the status", () => {
  const out = capture();
  const err = capture();
  let status = -1;
  emit(run(["-n", "Zoë", "-c", "2"]), {
    stdout: out.stream,
    stderr: err.stream,
    setExitCode: (s) => (status = s),
  });
  assert.deepEqual(
    out.bytes(),
    Buffer.from("Hello, Zo\u00eb!\nHello, Zo\u00eb!\n", "utf8"),
  );
  assert.ok(!out.bytes().includes(0x0d));
  assert.equal(err.bytes().length, 0);
  assert.equal(status, 0);
});

test("emit survives a stream error such as EPIPE", () => {
  const out = capture();
  const err = capture();
  emit(run([]), {
    stdout: out.stream,
    stderr: err.stream,
    setExitCode: () => {},
  });
  const epipe = Object.assign(new Error("write EPIPE"), { code: "EPIPE" });
  assert.doesNotThrow(() => out.stream.emit("error", epipe));
});
