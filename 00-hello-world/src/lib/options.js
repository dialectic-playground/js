/**
 * Command-line parsing for dp-hello (SRS section 3.2, CONV-07 ... CONV-13).
 *
 * The parser is hand-written: it recognizes the option syntax only and never checks option
 * values, which is the job of validation.js (FR-06: only the winning value is validated).
 * It reports problems as values, never by throwing.
 */

/** Options that take a value: short letter -> setting. */
const SHORT_VALUED = new Map([
  ["n", "name"],
  ["c", "count"],
]);

/** Options that take a value: long name -> setting. */
const LONG_VALUED = new Map([
  ["name", "name"],
  ["count", "count"],
]);

/** Long options without a value, which end the scan (CONV-12, CONV-22). */
const LONG_FLAGS = new Map([
  ["help", "help"],
  ["version", "version"],
]);

/**
 * @typedef {{ value: string, option: string }} OptionValue
 *   A raw option value and the option as the user wrote it (`-n` or `--name`).
 * @typedef {{ action: "help" } | { action: "version" } | { action: "error", message: string }
 *   | { action: "greet", name: OptionValue | null, count: OptionValue | null,
 *       firstOperand: string | null }} ParseResult
 *   `message` is a CONV-13 diagnostic without the `dp-hello: ` prefix.
 */

/**
 * Parse the arguments (without the program name) from left to right.
 *
 * Returns as soon as `--help` or `--version` is reached, or at the first syntax error
 * (CONV-12). Operands are collected (CONV-10 allows interleaving) and reported by validation.
 *
 * @param {readonly string[]} args
 * @returns {ParseResult}
 */
export function parseArgs(args) {
  /** @type {Record<string, OptionValue>} */
  const values = {};
  /** @type {string[]} */
  const operands = [];
  let index = 0;
  while (index < args.length) {
    const token = args[index];
    index += 1;
    let step;
    if (token === "--") {
      operands.push(...args.slice(index));
      break;
    } else if (token.startsWith("--")) {
      step = parseLong(token, args, index);
    } else if (token.startsWith("-") && token !== "-") {
      step = parseShort(token, args, index);
    } else {
      operands.push(token);
      continue;
    }
    if (step.result) {
      return step.result;
    }
    values[step.setting] = step.value;
    index = step.index;
  }
  return {
    action: "greet",
    name: values.name ?? null,
    count: values.count ?? null,
    firstOperand: operands.length > 0 ? operands[0] : null,
  };
}

/**
 * Handle one `--long[=value]` token (CONV-08: no abbreviations).
 *
 * @param {string} token
 * @param {readonly string[]} args
 * @param {number} index position of the token after `token`
 */
function parseLong(token, args, index) {
  const equals = token.indexOf("=");
  const name = equals === -1 ? token.slice(2) : token.slice(2, equals);
  const flag = LONG_FLAGS.get(name);
  if (flag !== undefined) {
    if (equals !== -1) {
      return error(`option '--${name}' doesn't allow an argument`);
    }
    return { result: /** @type {ParseResult} */ ({ action: flag }) };
  }
  const setting = LONG_VALUED.get(name);
  if (setting === undefined) {
    return error(`unrecognized option '${token}'`);
  }
  if (equals !== -1) {
    return valued(setting, token.slice(equals + 1), `--${name}`, index);
  }
  if (index < args.length) {
    return valued(setting, args[index], `--${name}`, index + 1);
  }
  return error(`option '--${name}' requires an argument`);
}

/**
 * Handle one `-x...` token (CONV-07). Both short options take a value, which is the rest of
 * the token or, when that is empty, the next token; so a bundle never holds a second option.
 *
 * @param {string} token
 * @param {readonly string[]} args
 * @param {number} index position of the token after `token`
 */
function parseShort(token, args, index) {
  // Iterate by code point so that an unknown non-ASCII letter is echoed whole (CONV-05).
  const [letter] = token.slice(1);
  const setting = SHORT_VALUED.get(letter);
  if (setting === undefined) {
    return error(`invalid option -- '${letter}'`);
  }
  const attached = token.slice(1 + letter.length);
  if (attached !== "") {
    return valued(setting, attached, `-${letter}`, index);
  }
  if (index < args.length) {
    return valued(setting, args[index], `-${letter}`, index + 1);
  }
  return error(`option requires an argument -- '${letter}'`);
}

/** @param {string} message */
function error(message) {
  return { result: /** @type {ParseResult} */ ({ action: "error", message }) };
}

/**
 * @param {string} setting
 * @param {string} value
 * @param {string} option
 * @param {number} index
 */
function valued(setting, value, option, index) {
  return { result: null, setting, value: { value, option }, index };
}
