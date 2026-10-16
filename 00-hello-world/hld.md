<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

**Table of Contents** _generated with [DocToc](https://github.com/thlorenz/doctoc)_

- [High-Level Design (HLD) — Standard Terminal Hello World](#high-level-design-hld--standard-terminal-hello-world)
  - [1. Introduction](#1-introduction)
    - [1.1 Scope](#11-scope)
    - [1.2 Definitions and acronyms](#12-definitions-and-acronyms)
    - [1.3 References](#13-references)
  - [2. Requirements summary](#2-requirements-summary)
  - [3. Architectural overview](#3-architectural-overview)
    - [3.1 Context diagram](#31-context-diagram)
    - [3.2 Component (module) decomposition](#32-component-module-decomposition)
    - [3.3 Data flow](#33-data-flow)
  - [4. Key design decisions](#4-key-design-decisions)
  - [5. Cross-platform strategy](#5-cross-platform-strategy)
  - [6. Error handling and diagnostics](#6-error-handling-and-diagnostics)
  - [7. Non-functional design](#7-non-functional-design)
  - [8. Risks and open issues](#8-risks-and-open-issues)
  - [9. Approval](#9-approval)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

# High-Level Design (HLD) — Standard Terminal Hello World

| Field                   | Value                                                                               |
| :---------------------- | :---------------------------------------------------------------------------------- |
| Project                 | `00-hello-world`                                                                    |
| Tools                   | dp-hello                                                                            |
| Implementation language | js (JavaScript, Node.js 24, npm)                                                    |
| Author                  | Brandon Perkins                                                                     |
| Version / date          | 1.0 — 2026-10-13                                                                    |
| Status                  | In review                                                                           |
| Inputs                  | `specs/URD.md`, `specs/SRS.md`, `specs/user-manual.md`, `shared/CLI-CONVENTIONS.md` |

## 1. Introduction

### 1.1 Scope

`dp-hello` writes `Hello,` + NAME + `!` + LF to standard output COUNT times (NAME defaults to
`World`, COUNT to 1, range 1–1000), prints help and version text, and reports usage errors
with exit status 2 (SRS §1.2, §3). It reads no input, takes no operands, touches no files or
environment variables, and runs no subprocesses (SRS §3.3, §3.4, NFR-07).

### 1.2 Definitions and acronyms

| Term         | Meaning                                                                        |
| :----------- | :----------------------------------------------------------------------------- |
| Run result   | `{ stdout, stderr, status }`: everything one invocation produces, as data      |
| Parse result | The syntactic reading of argv: an action, raw option values, the first operand |
| Usage error  | A CONV-13 diagnostic + the CONV-14 line on stderr, exit status 2               |
| ESM          | ECMAScript modules (`import`/`export`), the package's module system            |

### 1.3 References

- SRS-00 §3 (interfaces), §4 (FR-01 … FR-11), §5 (NFR-01 … NFR-07), §6 (diagnostics)
- CLI-CONV §2 (CONV-03, CONV-05), §3 (CONV-07 … CONV-12), §4 (CONV-13 … CONV-15), §8
- User manual §"Help output"

## 2. Requirements summary

| Area                   | SRS requirements                                     | Architectural impact                                                                               |
| :--------------------- | :--------------------------------------------------- | :------------------------------------------------------------------------------------------------- |
| Option parsing         | FR-02, FR-06, FR-07, FR-08, FR-10, CONV-07 … CONV-12 | A hand-written parser (`options.js`) that only recognizes syntax and stops at `--help`/`--version` |
| Validation             | FR-03, FR-05, FR-06, FR-09                           | A separate unit (`validation.js`) that checks only the winning values                              |
| Greeting               | FR-01, FR-02, FR-04, NFR-05                          | A pure function (`greeting.js`)                                                                    |
| Diagnostics and status | FR-11, §3.7, §6, CONV-13, CONV-14                    | One place (`app.js`) maps errors to text and exit status; stdout stays empty on error              |
| Output bytes           | NFR-01, CONV-03, CONV-05, CONV-25                    | An output adapter (`output.js`) that writes UTF-8 Buffers and absorbs stream errors                |
| Build                  | NFR-06                                               | npm package with Makefile hooks; the launcher directory `src/bin/` is BIN_DIR                      |

## 3. Architectural overview

### 3.1 Context diagram

```text
                       ┌────────────────────┐ ──▶ stdout (UTF-8, LF)
  argv (process.argv) ▶│      dp-hello      │ ──▶ stderr (diagnostics)
                       │  node + src/lib/*  │ ──▶ exit status (0 or 2)
                       └────────────────────┘
        (no stdin, files, environment variables, network, or child processes)
```

### 3.2 Component (module) decomposition

| Component               | Responsibility                                                                 | Depends on                    |
| :---------------------- | :----------------------------------------------------------------------------- | :---------------------------- |
| `src/bin/dp-hello`      | `#!/usr/bin/env node` launcher; calls `main()`                                 | main                          |
| `src/lib/main.js`       | Process boundary: reads `process.argv`, wires `process.stdout/stderr/exitCode` | app, output                   |
| `src/lib/app.js`        | Pure program `run(args) → RunResult`; help/version text; diagnostic formatting | options, validation, greeting |
| `src/lib/options.js`    | Parse argv into a parse result or a syntax error (CONV-07 … CONV-13)           | —                             |
| `src/lib/validation.js` | Check operands, NAME, and COUNT; produce `{ name, count }` or an error         | —                             |
| `src/lib/greeting.js`   | Build the greeting text (pure)                                                 | —                             |
| `src/lib/output.js`     | Encode to UTF-8, write the result, set the status, absorb stream errors        | —                             |

### 3.3 Data flow

`main` passes `process.argv.slice(2)` to `run`. `run` calls `parseArgs`: a help/version action
returns that text, a syntax error returns a usage-error result, and otherwise `validate` turns
the raw values into `{ name, count }` (or a usage error) and `greetingText` builds the output.
`main` hands the run result to `emit`, which sets `process.exitCode` and writes the stdout and
stderr strings as UTF-8 Buffers. The process exits naturally once the writes are flushed.

## 4. Key design decisions

| #   | Decision                                                                                    | Alternatives considered                                       | Rationale                                                                                    |
| :-- | :------------------------------------------------------------------------------------------ | :------------------------------------------------------------ | :------------------------------------------------------------------------------------------- |
| D1  | Pure core `run(args) → { stdout, stderr, status }` with a thin I/O shell                    | Writing from inside the parser; throwing exceptions to `main` | Every behavior is unit-testable without processes; errors cannot leak partial stdout (FR-11) |
| D2  | Errors are returned as values (`{ action: "error" }`, `{ ok: false }`), never thrown        | Exceptions                                                    | No code path can produce an uncaught exception or a stack trace (CONV-24)                    |
| D3  | Hand-written parser; `node:util.parseArgs` not used                                         | `util.parseArgs`, third-party parsers                         | Their diagnostics, abbreviation, and scan-order rules differ from CONV-07 … CONV-13          |
| D4  | Build the whole output in memory and write it once                                          | Streaming line by line                                        | At most 1000 short lines; one write is simplest and fastest                                  |
| D5  | `process.exitCode`, never `process.exit()`                                                  | `process.exit(status)`                                        | `exit()` can drop pending asynchronous writes (pipes on Windows)                             |
| D6  | ES modules, no runtime dependencies; dev dependencies pinned exactly in `package-lock.json` | CommonJS; bundling                                            | Idiomatic modern Node; nothing to build; identical lint/format versions everywhere           |
| D7  | Extensionless launcher committed in `src/bin/` (also the `bin` entry of `package.json`)     | Generating a launcher in a build step                         | Nothing to compile; the file is executable in git and checked by ESLint and Prettier         |

## 5. Cross-platform strategy

- **Line endings (CONV-03):** all generated text uses `\n`. Node's stream writes are binary on
  every OS: Node never translates LF to CRLF, so there is no text mode to switch off.
- **Encoding (CONV-05, CONV-06):** `output.js::encode` converts every string to a UTF-8 Buffer
  before writing, independent of locale and console code page. Node decodes `process.argv`
  from the UTF-16 command line on Windows and from UTF-8 bytes on POSIX, so `Zoë` round-trips.
- **Launching:** the `#!/usr/bin/env node` line is honored on Linux and macOS; on Windows the
  black-box runner starts the interpreter itself, and users run the tool from Git Bash or MSYS2.
- **Paths:** the tool uses none. The Makefile's install launcher single-quotes the absolute
  payload path, which may be a backslash path under Git Bash.
- Platform differences are isolated in `output.js` (and Node itself); no OS-specific APIs.

## 6. Error handling and diagnostics

`options.js` and `validation.js` return the CONV-13 message text (without the `dp-hello:`
prefix). `app.js::usageError` is the only place that adds the prefix and the CONV-14 line,
leaves stdout empty, and sets status 2. Stream failures (EPIPE) are absorbed by an `error`
listener in `output.js::emit` (CONV-25), so the process ends without a diagnostic.

## 7. Non-functional design

| Quality attribute           | SRS reference | How the design achieves it                                                                                                                                                                     |
| :-------------------------- | :------------ | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Performance / memory        | NFR-02        | No dependencies loaded at run time; six tiny modules; one write. Node start-up dominates (~85 ms in the container for `-c 1000`). Node's baseline RSS (~47 MiB) exceeds the 32 MiB budget (§8) |
| Portability                 | NFR-01        | UTF-8 Buffers, LF only, no OS-specific code; CI on Linux, macOS, Windows                                                                                                                       |
| Robustness                  | NFR-03        | Errors as values (D2); stream errors absorbed; the parser is total over all inputs                                                                                                             |
| Security / input validation | NFR-07        | Only `process.argv` is read; no `fs`, `child_process`, or `process.env` usage                                                                                                                  |
| Maintainability             | NFR-04        | One module per responsibility (§3.2)                                                                                                                                                           |
| Testability                 | NFR-05        | `greetingText` and `run` are pure; `emit` takes injected streams                                                                                                                               |

## 8. Risks and open issues

| Risk / issue                                                                                               | Likelihood  | Impact | Mitigation                                                                                                                   |
| :--------------------------------------------------------------------------------------------------------- | :---------- | :----- | :--------------------------------------------------------------------------------------------------------------------------- |
| NFR-02 memory: the Node.js 24 runtime alone (`node -e 0`) peaks at ~47–49 MiB RSS, above the 32 MiB budget | H (certain) | L      | Runtime limitation, not reducible by the program (V8 flags such as `--jitless` change < 1 MiB); recorded as a gap in the RTM |
| Invalid UTF-8 argument bytes on POSIX are decoded by Node to U+FFFD and cannot be echoed byte-exactly      | L           | L      | Outside the SRS assumption (UTF-8 terminal); documented in the LLD                                                           |
| Lint/format tool drift between container and native                                                        | L           | M      | Exact versions in `package-lock.json`, installed with `npm ci` everywhere                                                    |

## 9. Approval

| Role     | Name            | Date       | Decision  |
| :------- | :-------------- | :--------- | :-------- |
| Author   | Brandon Perkins | 2026-10-13 | Submitted |
| Reviewer |                 |            |           |
