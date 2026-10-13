/**
 * Validation of the parsed options (FR-03, FR-05, FR-09).
 *
 * Turns the syntactic parse result into the configuration the greeting needs, or into a
 * CONV-13 usage error. Only the winning (last) value of each option is checked (FR-06).
 */

export const DEFAULT_NAME = "World";
export const DEFAULT_COUNT = 1;
export const MIN_COUNT = 1;
export const MAX_COUNT = 1000;

/**
 * @typedef {import("./options.js").OptionValue} OptionValue
 * @typedef {{ ok: true, name: string, count: number } | { ok: false, message: string }}
 *   Validated `message` is a CONV-13 diagnostic without the `dp-hello: ` prefix.
 */

/**
 * @param {{ name: OptionValue | null, count: OptionValue | null,
 *           firstOperand: string | null }} parsed
 * @returns {Validated}
 */
export function validate(parsed) {
  if (parsed.firstOperand !== null) {
    return { ok: false, message: `extra operand '${parsed.firstOperand}'` };
  }
  let name = DEFAULT_NAME;
  if (parsed.name !== null) {
    if (parsed.name.value === "") {
      return invalid(parsed.name);
    }
    name = parsed.name.value;
  }
  let count = DEFAULT_COUNT;
  if (parsed.count !== null) {
    const parsedCount = parseCount(parsed.count.value);
    if (parsedCount === null) {
      return invalid(parsed.count);
    }
    count = parsedCount;
  }
  return { ok: true, name, count };
}

/**
 * Parse COUNT: ASCII digits only (leading zeros allowed), value 1-1000 (FR-04).
 *
 * @param {string} text
 * @returns {number | null} the value, or null if `text` is not a valid COUNT
 */
export function parseCount(text) {
  if (!/^[0-9]+$/.test(text)) {
    return null;
  }
  // Strip leading zeros first so that very long digit strings cannot lose precision.
  const digits = text.replace(/^0+(?=.)/, "");
  if (digits.length > String(MAX_COUNT).length) {
    return null;
  }
  const value = Number(digits);
  return value >= MIN_COUNT && value <= MAX_COUNT ? value : null;
}

/** @param {OptionValue} option */
function invalid(option) {
  return {
    ok: /** @type {const} */ (false),
    message: `invalid argument '${option.value}' for '${option.option}'`,
  };
}
