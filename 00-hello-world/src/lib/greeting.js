/** Pure greeting construction (FR-01, FR-02, FR-04, NFR-05). */

/**
 * One greeting line: `Hello, ` + name + `!` + LF.
 *
 * @param {string} name
 * @returns {string}
 */
export function greetingLine(name) {
  return `Hello, ${name}!\n`;
}

/**
 * `count` greeting lines for `name` (empty when `count` is 0 or less).
 *
 * @param {string} name
 * @param {number} count
 * @returns {string}
 */
export function greetingText(name, count) {
  return greetingLine(name).repeat(Math.max(count, 0));
}
