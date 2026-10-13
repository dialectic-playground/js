/**
 * The dp-hello program as a pure function: arguments in; output bytes and status out.
 *
 * It wires parsing, validation, and greeting construction together and is the only place
 * that maps a usage error to its CONV-13/CONV-14 diagnostic and exit status 2.
 */

import { greetingText } from "./greeting.js";
import { parseArgs } from "./options.js";
import { validate } from "./validation.js";

export const TOOL = "dp-hello";
export const EXIT_SUCCESS = 0;
export const EXIT_USAGE = 2;

export const VERSION_TEXT = `${TOOL} (dialectic-playground) 1.0.0\n`;

export const HELP_TEXT = `Usage: ${TOOL} [OPTION]...
Print a greeting to standard output.

Options:
  -n, --name=NAME     greet NAME instead of World
  -c, --count=COUNT   print the greeting COUNT times (1-1000, default 1)
      --help          display this help and exit
      --version       output version information and exit
`;

/**
 * @typedef {{ stdout: string, stderr: string, status: number }} RunResult
 */

/**
 * Run dp-hello with `args` (without the program name). Never throws and never touches the
 * process: the caller writes the result (see main.js).
 *
 * @param {readonly string[]} args
 * @returns {RunResult}
 */
export function run(args) {
  const parsed = parseArgs(args);
  switch (parsed.action) {
    case "help":
      return success(HELP_TEXT);
    case "version":
      return success(VERSION_TEXT);
    case "error":
      return usageError(parsed.message);
    default: {
      const config = validate(parsed);
      if (!config.ok) {
        return usageError(config.message);
      }
      return success(greetingText(config.name, config.count));
    }
  }
}

/**
 * The two CONV-13/CONV-14 lines for a usage error.
 *
 * @param {string} message diagnostic without the tool-name prefix
 * @returns {string}
 */
export function usageDiagnostic(message) {
  return `${TOOL}: ${message}\nTry '${TOOL} --help' for more information.\n`;
}

/** @param {string} stdout */
function success(stdout) {
  return { stdout, stderr: "", status: EXIT_SUCCESS };
}

/** @param {string} message */
function usageError(message) {
  return { stdout: "", stderr: usageDiagnostic(message), status: EXIT_USAGE };
}
