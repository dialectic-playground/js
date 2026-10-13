/**
 * Output: writes a run result to the process's streams (CONV-03, CONV-05, CONV-25).
 *
 * Text is encoded to UTF-8 Buffers here, so the bytes never depend on the locale or the
 * console code page (CONV-06), and Node writes them unchanged: it never translates LF into
 * CRLF, on Windows either. The exit status is set through `process.exitCode` rather than
 * `process.exit()`, so pending asynchronous writes (pipes on Windows) are flushed first.
 */

/**
 * @typedef {import("./app.js").RunResult} RunResult
 * @typedef {{ stdout: NodeJS.WritableStream, stderr: NodeJS.WritableStream,
 *             setExitCode: (status: number) => void }} Io
 */

/**
 * UTF-8 bytes of `text`, exactly as the arguments it contains were given (CONV-05).
 *
 * @param {string} text
 * @returns {Buffer}
 */
export function encode(text) {
  return Buffer.from(text, "utf8");
}

/**
 * Write `result` to `io` and set its exit status. A failing stream (for example EPIPE when
 * the reader has gone away) ends the output silently instead of crashing (CONV-24, CONV-25).
 *
 * @param {RunResult} result
 * @param {Io} io
 */
export function emit(result, io) {
  io.setExitCode(result.status);
  for (const [stream, text] of [
    [io.stdout, result.stdout],
    [io.stderr, result.stderr],
  ]) {
    // Swallow stream errors: an 'error' event without a listener would throw.
    stream.on("error", () => {});
    if (text !== "") {
      stream.write(encode(text));
    }
  }
}
