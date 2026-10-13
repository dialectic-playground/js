/** Process entry point of dp-hello: run the program on process.argv and write the result. */

import { run } from "./app.js";
import { emit } from "./output.js";

/**
 * process.argv[2...] are the user's arguments. Node has already decoded them to strings:
 * from UTF-8 bytes on POSIX and from the UTF-16 command line on Windows (CONV-05).
 *
 * @param {readonly string[]} [args]
 */
export function main(args = process.argv.slice(2)) {
  emit(run(args), {
    stdout: process.stdout,
    stderr: process.stderr,
    setExitCode: (status) => {
      process.exitCode = status;
    },
  });
}
