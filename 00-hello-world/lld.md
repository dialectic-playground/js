# Low-Level Design (LLD) — Standard Terminal Hello World

| Field | Value |
| :-- | :-- |
| Project | `00-hello-world` |
| Tools | dp-hello |
| Implementation language | js (JavaScript, Node.js 24, npm) |
| Author | Brandon Perkins |
| Version / date | 1.0 — 2026-10-13 |
| Status | In review |
| Inputs | `hld.md`, `specs/SRS.md`, `shared/CLI-CONVENTIONS.md` |

## 1. Source layout

```text
00-hello-world/
├── package.json, package-lock.json   # ESM package "dp-hello"; dev deps pinned exactly
├── eslint.config.js                  # ESLint flat config (recommended + eqeqeq, no-var, prefer-const)
├── .prettierrc.json, .prettierignore # Prettier defaults; the launcher is parsed as JavaScript
├── src/
│   ├── bin/dp-hello     # #!/usr/bin/env node launcher (BIN_DIR = src/bin), calls main()
│   └── lib/
│       ├── main.js      # process boundary: argv in, streams and exit code out
│       ├── app.js       # pure run(args); help/version text; diagnostics
│       ├── options.js   # hand-written argv parser
│       ├── validation.js# operand, NAME, and COUNT checks
│       ├── greeting.js  # pure greeting construction
│       └── output.js    # UTF-8 encoding and writing
└── test/                # node:test unit tests: app, options, validation, greeting
```

## 2. Data types

Types are documented as JSDoc `@typedef`s in the source.

### 2.1 `OptionValue` (options.js)
| Field | Type | Constraint / invariant | SRS |
| :-- | :-- | :-- | :-- |
| `value` | string | The raw value, unvalidated, possibly empty or starting with `-` | FR-02, FR-06 |
| `option` | string | The option as written: `-n`, `--name`, `-c`, or `--count` | FR-03, FR-05, CONV-13 |

### 2.2 `ParseResult` (options.js)
| Variant | Fields | Meaning |
| :-- | :-- | :-- |
| `{ action: "help" }` / `{ action: "version" }` | — | The scan reached `--help` / `--version` first (CONV-12) |
| `{ action: "error" }` | `message` | The first syntax error (CONV-13 text without prefix) |
| `{ action: "greet" }` | `name`, `count`: `OptionValue \| null` (last wins); `firstOperand`: `string \| null` | Syntax is valid |

### 2.3 `Validated` (validation.js)
`{ ok: true, name: string, count: number }` with `name !== ""` and `1 <= count <= 1000`, or
`{ ok: false, message }`.

### 2.4 `RunResult` (app.js)
`{ stdout: string, stderr: string, status: 0 | 2 }`. Invariant: `status === 2` implies
`stdout === ""` (FR-11), and `status === 0` implies `stderr === ""` (SRS §3.6).

### 2.5 Error variants

| Variant (source) | Diagnostic (stderr) | Exit status |
| :-- | :-- | :-- |
| Unknown short option (`parseShort`) | `dp-hello: invalid option -- 'x'` + Try line | 2 |
| Unknown long option (`parseLong`) | `dp-hello: unrecognized option '<token>'` + Try line | 2 |
| Short option missing value (`parseShort`) | `dp-hello: option requires an argument -- 'n'` + Try line | 2 |
| Long option missing value (`parseLong`) | `dp-hello: option '--name' requires an argument` + Try line | 2 |
| `--help=…` / `--version=…` (`parseLong`) | `dp-hello: option '--help' doesn't allow an argument` + Try line | 2 |
| Empty NAME / invalid COUNT (`validate`) | `dp-hello: invalid argument '<value>' for '<option>'` + Try line | 2 |
| Operand (`validate`) | `dp-hello: extra operand '<first operand>'` + Try line | 2 |
| Stream error, e.g. EPIPE (`emit`) | none (CONV-25) | status already set |

The Try line is `Try 'dp-hello --help' for more information.` (CONV-14).

## 3. Module and function specifications

### 3.1 `parseArgs` (options.js)
- **Signature:** `parseArgs(args: readonly string[]): ParseResult`
- **Responsibility:** recognize the option syntax of argv, left to right.
- **Postconditions:** returns help/version at the first such token; an error at the first
  syntax error before it; otherwise the last value of each option and the first operand.
- **Algorithm:** for each token: `--` → all remaining tokens are operands, stop; `--…` →
  `parseLong`; `-` followed by anything → `parseShort`; otherwise (including `-`) record an
  operand. A helper result with `result` set ends the scan; else store the value and advance.
- **Complexity:** O(n) time and memory in the number of tokens.
- **Satisfies:** CONV-07 … CONV-13, FR-02, FR-06, FR-07, FR-08, FR-10.
- **Unit tests:** all of `test/options.test.js`.

### 3.2 `parseLong` / `parseShort` (options.js, private)
- `parseLong(token, args, index)`: split at the first `=`; `help`/`version` → action (error if
  `=` present); `name`/`count` → value from after `=` or from the next token (error if none);
  anything else → `unrecognized option '<token>'` with the whole token (CONV-08, no prefixes).
- `parseShort(token, args, index)`: the first code point after `-` is the letter (so a
  non-ASCII letter is echoed whole); `n`/`c` take the rest of the token, else the next token,
  else `option requires an argument`; any other letter → `invalid option`. Because both short
  options take values, a bundle never contains a second option (`-nc2` is name `c2`).

### 3.3 `validate` (validation.js)
- **Signature:** `validate(parsed): Validated`
- **Algorithm:** 1) a first operand → `extra operand`; 2) NAME present and empty → invalid
  argument; 3) COUNT present and `parseCount` is null → invalid argument; 4) defaults
  `World`/1 for absent options.
- **Satisfies:** FR-03, FR-05, FR-06 (only winning values are seen), FR-09.
- **Unit tests:** `defaults: World, once`, `a non-empty name and a valid count are accepted`,
  `an empty name is rejected with the option as written`, `an invalid count is rejected
  verbatim`, `the first operand is reported before invalid values`.

### 3.4 `parseCount` (validation.js)
- **Signature:** `parseCount(text: string): number | null`
- **Algorithm:** reject unless `/^[0-9]+$/` (ASCII digits only: no sign, space, Unicode
  digits); strip leading zeros (keeping one digit); reject if more than 4 digits remain (no
  precision loss for huge inputs); `Number` and range-check 1–1000.
- **Satisfies:** FR-04, FR-05. **Unit tests:** the three `parseCount …` tests.

### 3.5 `greetingLine` / `greetingText` (greeting.js)
- **Signatures:** `greetingLine(name: string): string`, `greetingText(name, count): string`
- **Postconditions:** `` `Hello, ${name}!\n` ``; repeated `max(count, 0)` times. Pure.
- **Satisfies:** FR-01, FR-02, FR-04, NFR-05. **Unit tests:** `test/greeting.test.js`.

### 3.6 `run` / `usageDiagnostic` (app.js)
- **Signature:** `run(args: readonly string[]): RunResult`; `usageDiagnostic(message): string`
- **Algorithm:** `parseArgs` → help: `HELP_TEXT`; version: `VERSION_TEXT`; error:
  `usageError`; greet: `validate` → `usageError` or `greetingText`.
- **Satisfies:** FR-01 … FR-11, CONV-02, CONV-13, CONV-14, CONV-23. Never throws.
- **Unit tests:** `test/app.test.js` (`default and named greetings`, `help text matches the
  user manual byte for byte`, `version line`, `every usage error: …`).

### 3.7 `encode` / `emit` (output.js)
- **Signatures:** `encode(text): Buffer`; `emit(result: RunResult, io: Io): void` where
  `Io = { stdout, stderr, setExitCode }`.
- **Algorithm:** set the exit code; for stdout then stderr, attach a no-op `error` listener
  and write `encode(text)` if non-empty.
- **Satisfies:** CONV-03, CONV-05, CONV-24, CONV-25. **Unit tests:** `encode produces UTF-8
  bytes`, `emit writes UTF-8 bytes with LF only and sets the status`, `emit survives a stream
  error such as EPIPE`.

### 3.8 `main` (main.js)
- **Signature:** `main(args = process.argv.slice(2)): void`
- Calls `emit(run(args), { process.stdout, process.stderr, exitCode setter })`. Covered by
  the black-box suite (P01–P10).

## 4. Algorithms
The only non-trivial algorithm is the scan in §3.1. Design choices: operands are collected
rather than reported immediately, because CONV-10 allows options after operands and CONV-12
lets a later `--help` win (`dp-hello extra --help` prints help); syntax errors end the scan
immediately because they are found "earlier in the scan" (`dp-hello -x --help` is an error).
Value validation is deferred until the scan ends so that last-wins (FR-06) applies:
`dp-hello -c 0 -c 5` is valid, and `dp-hello -c 0 --help` prints help.

## 5. Platform-specific details

| Concern | Linux | macOS | Windows | Abstraction |
| :-- | :-- | :-- | :-- | :-- |
| Argument decoding | UTF-8 bytes → string (invalid bytes become U+FFFD) | same | UTF-16 command line → string | Node (`process.argv`) |
| Output encoding / newlines | Buffer written as is | same | same (no CRLF translation in Node) | `output.js::encode` |
| Async writes | pipes/files synchronous | same | pipes asynchronous | `process.exitCode` (no `process.exit()`) |
| `#!` launcher | kernel | kernel | runner starts `node`; Git Bash/MSYS2 for users | `src/bin/dp-hello` |
| Install launcher path | POSIX path | POSIX path | may contain backslashes | single-quoted, passed as a printf argument |

## 6. Resource management
No files, sockets, or child processes are opened. Memory is bounded by the output: at most
1000 lines of `Hello, NAME!\n`, a single string plus its UTF-8 Buffer. Streams are owned by
Node and flushed before the process exits naturally.

## 7. Sequence of one invocation
P01, `dp-hello`: the kernel (or runner) starts `node src/bin/dp-hello`; the launcher imports
`main.js` and calls `main()`; `run([])` → `parseArgs([])` returns
`{ action: "greet", name: null, count: null, firstOperand: null }` → `validate` returns
`{ ok: true, name: "World", count: 1 }` → `greetingText("World", 1)` = `"Hello, World!\n"`;
`emit` sets `process.exitCode = 0` and writes the 14 UTF-8 bytes to stdout; Node exits with 0.

## 8. Design-to-code checklist

| HLD component | LLD section | Source file(s) | Unit-test file(s) |
| :-- | :-- | :-- | :-- |
| options | §3.1, §3.2 | `src/lib/options.js` | `test/options.test.js` |
| validation | §3.3, §3.4 | `src/lib/validation.js` | `test/validation.test.js` |
| greeting | §3.5 | `src/lib/greeting.js` | `test/greeting.test.js` |
| app | §3.6 | `src/lib/app.js` | `test/app.test.js` |
| output | §3.7 | `src/lib/output.js` | `test/app.test.js` |
| main / launcher | §3.8 | `src/lib/main.js`, `src/bin/dp-hello` | black-box P01–P10 |
