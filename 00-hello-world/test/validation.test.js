import assert from "node:assert/strict";
import { test } from "node:test";

import { parseCount, validate } from "../src/lib/validation.js";

const parsed = ({ name = null, count = null, firstOperand = null } = {}) => ({
  name,
  count,
  firstOperand,
});
const value = (v, option) => ({ value: v, option });

test("defaults: World, once", () => {
  assert.deepEqual(validate(parsed()), { ok: true, name: "World", count: 1 });
});

test("a non-empty name and a valid count are accepted", () => {
  assert.deepEqual(
    validate(
      parsed({ name: value("Zoë", "-n"), count: value("007", "--count") }),
    ),
    {
      ok: true,
      name: "Zoë",
      count: 7,
    },
  );
});

test("an empty name is rejected with the option as written", () => {
  assert.deepEqual(validate(parsed({ name: value("", "-n") })), {
    ok: false,
    message: "invalid argument '' for '-n'",
  });
  assert.deepEqual(validate(parsed({ name: value("", "--name") })), {
    ok: false,
    message: "invalid argument '' for '--name'",
  });
});

test("an invalid count is rejected verbatim", () => {
  assert.deepEqual(validate(parsed({ count: value("abc", "-c") })), {
    ok: false,
    message: "invalid argument 'abc' for '-c'",
  });
  assert.deepEqual(validate(parsed({ count: value("1001", "--count") })), {
    ok: false,
    message: "invalid argument '1001' for '--count'",
  });
});

test("the first operand is reported before invalid values", () => {
  assert.deepEqual(
    validate(parsed({ name: value("", "-n"), firstOperand: "foo" })),
    {
      ok: false,
      message: "extra operand 'foo'",
    },
  );
});

test("parseCount accepts 1-1000 with leading zeros", () => {
  assert.equal(parseCount("1"), 1);
  assert.equal(parseCount("2"), 2);
  assert.equal(parseCount("999"), 999);
  assert.equal(parseCount("1000"), 1000);
  assert.equal(parseCount("007"), 7);
  assert.equal(parseCount("0001000"), 1000);
  assert.equal(parseCount("0".repeat(500) + "1"), 1);
});

test("parseCount rejects values outside 1-1000", () => {
  for (const text of [
    "0",
    "000",
    "1001",
    "99999999999999999999999",
    "1".repeat(400),
  ]) {
    assert.equal(parseCount(text), null, text);
  }
});

test("parseCount rejects anything but ASCII digits", () => {
  for (const text of [
    "",
    "abc",
    "+5",
    "-5",
    " 5",
    "5 ",
    "5.0",
    "1e3",
    "0x10",
    "٣",
    "５",
    "5\n",
  ]) {
    assert.equal(parseCount(text), null, JSON.stringify(text));
  }
});
