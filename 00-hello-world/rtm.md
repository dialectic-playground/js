<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

**Table of Contents** _generated with [DocToc](https://github.com/thlorenz/doctoc)_

- [Requirements Traceability Matrix (RTM) — Standard Terminal Hello World](#requirements-traceability-matrix-rtm--standard-terminal-hello-world)
  - [1. User requirements to system requirements](#1-user-requirements-to-system-requirements)
  - [2. Forward traceability](#2-forward-traceability)
  - [3. Backward traceability (test → requirement)](#3-backward-traceability-test-%E2%86%92-requirement)
  - [4. Coverage summary](#4-coverage-summary)
  - [5. Gaps and justifications](#5-gaps-and-justifications)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

# Requirements Traceability Matrix (RTM) — Standard Terminal Hello World

| Field          | Value            |
| :------------- | :--------------- |
| Project        | `00-hello-world` |
| Tools          | dp-hello         |
| Author         | Brandon Perkins  |
| Version / date | 1.0 — 2026-10-13 |

Code paths are relative to `src/lib/` (launcher: `src/bin/dp-hello`); unit tests are in
`test/` and cited as `file::"test name"`. Black-box tests: public `P01` … `P10`. The hidden
suite runs in CI on Linux, macOS, and Windows and is not cited.

## 1. User requirements to system requirements

| User requirement (URD) | Derived system requirements (SRS)                  |
| :--------------------- | :------------------------------------------------- |
| UR-01                  | FR-01                                              |
| UR-02                  | FR-02                                              |
| UR-03                  | FR-04                                              |
| UR-04                  | FR-07                                              |
| UR-05                  | FR-08                                              |
| UR-06                  | FR-03, FR-05, FR-09, FR-10, FR-11                  |
| UR-07                  | FR-01, SRS §3.7                                    |
| UR-08                  | NFR-01, CONV-03                                    |
| UR-09                  | FR-02, CONV-05                                     |
| UR-10                  | FR-06, FR-10, CONV-01 … CONV-15, CONV-22 … CONV-26 |
| UR-11                  | NFR-02                                             |
| UR-12                  | NFR-06                                             |

## 2. Forward traceability

| Req. ID           | Summary                                    | Design (HLD/LLD)         | Code (file::function)                                     | Verification (unit / black-box)                                                                                                                                            | Status                         |
| :---------------- | :----------------------------------------- | :----------------------- | :-------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :----------------------------- |
| UR-01 … UR-12     | User needs                                 | HLD §2                   | via derived FR/NFR (§1)                                   | via derived FR/NFR                                                                                                                                                         | Verified (UR-11: see Gaps)     |
| FR-01             | Default greeting                           | HLD §3.3, LLD §3.3, §3.5 | `validation.js::validate`, `greeting.js::greetingText`    | `app.test.js::"default and named greetings"`, `validation.test.js::"defaults: World, once"`, P01                                                                           | Verified                       |
| FR-02             | Named greeting, verbatim                   | LLD §3.1, §3.2, §3.5     | `options.js::parseArgs`, `greeting.js::greetingLine`      | `options.test.js::"name in every spelling"`, `::"values may begin with '-' or be empty"`, `greeting.test.js::"greetingLine keeps the name verbatim …"`, P02, P03, P04      | Verified                       |
| FR-03             | Empty name rejected                        | LLD §3.3                 | `validation.js::validate`                                 | `validation.test.js::"an empty name is rejected with the option as written"`, `app.test.js::"every usage error: …"`                                                        | Verified                       |
| FR-04             | Repetition 1–1000                          | LLD §3.4, §3.5           | `validation.js::parseCount`, `greeting.js::greetingText`  | `validation.test.js::"parseCount accepts 1-1000 with leading zeros"`, `greeting.test.js::"greetingText repeats the line count times"`, P05, P06                            | Verified                       |
| FR-05             | Invalid count rejected                     | LLD §3.3, §3.4           | `validation.js::parseCount`, `::validate`                 | `validation.test.js::"parseCount rejects values outside 1-1000"`, `::"parseCount rejects anything but ASCII digits"`, `::"an invalid count is rejected verbatim"`          | Verified                       |
| FR-06             | Last occurrence wins                       | LLD §3.1, §4             | `options.js::parseArgs`                                   | `options.test.js::"the last occurrence wins, unvalidated"`, `app.test.js::"default and named greetings"`                                                                   | Verified                       |
| FR-07             | Help text, scan order                      | LLD §3.6, §4             | `app.js::run`, `app.js::HELP_TEXT`                        | `app.test.js::"help text matches the user manual byte for byte"`, `options.test.js::"--help and --version end the scan"`, P07                                              | Verified                       |
| FR-08             | Version line                               | LLD §3.6                 | `app.js::VERSION_TEXT`                                    | `app.test.js::"version line"`, P08                                                                                                                                         | Verified                       |
| FR-09             | Operands rejected                          | LLD §3.3                 | `options.js::parseArgs`, `validation.js::validate`        | `options.test.js::"operands, '-', and everything after '--' are collected"`, `app.test.js::"every usage error: …"`, P10                                                    | Verified                       |
| FR-10             | Unknown/malformed options                  | LLD §3.2                 | `options.js::parseLong`, `::parseShort`                   | `options.test.js::"unknown short options"`, `::"unknown and abbreviated long options …"`, `::"missing option arguments"`, `::"--help and --version take no argument"`, P09 | Verified                       |
| FR-11             | Nothing on stdout on error                 | HLD §6, LLD §2.4         | `app.js::usageError`                                      | `app.test.js::"every usage error: …"`, P09, P10                                                                                                                            | Verified                       |
| NFR-01            | Byte-identical, LF only                    | HLD §5                   | `output.js::encode`, `::emit`                             | `app.test.js::"emit writes UTF-8 bytes with LF only …"`, P01–P10 on 3 OSes in CI                                                                                           | Verified                       |
| NFR-02            | ≤ 300 ms, ≤ 32 MiB                         | HLD §7, §8               | (no run-time dependencies)                                | Measured: ~85 ms; peak RSS ~47 MiB                                                                                                                                         | Implemented (memory: see Gaps) |
| NFR-03            | No crash / stack trace                     | HLD §4 D2                | `app.js::run`, `output.js::emit`                          | `app.test.js::"emit survives a stream error such as EPIPE"`, all error-case tests                                                                                          | Verified                       |
| NFR-04            | Separate units                             | HLD §3.2                 | `options.js`, `validation.js`, `greeting.js`, `output.js` | Design review (this RTM, LLD §8)                                                                                                                                           | Verified                       |
| NFR-05            | Pure, tested greeting                      | LLD §3.5                 | `greeting.js::greetingText`                               | `test/greeting.test.js` (4 tests)                                                                                                                                          | Verified                       |
| NFR-06            | All Makefile targets                       | README, `Makefile`       | `Makefile` (DP_* hooks)                                   | CI `make check roundtrip` (container + 3 OSes)                                                                                                                             | Verified                       |
| NFR-07            | No files/env/subprocesses                  | HLD §7                   | only `main.js` reads `process.argv`                       | Inspection (no `fs`, `child_process`, `process.env` imports)                                                                                                               | Verified                       |
| CONV-01           | Canonical name                             | LLD §3.6                 | `app.js::TOOL`                                            | `app.test.js::"every usage error: …"`, P07–P10                                                                                                                             | Verified                       |
| CONV-02           | Version format                             | LLD §3.6                 | `app.js::VERSION_TEXT`                                    | `app.test.js::"version line"`, P08                                                                                                                                         | Verified                       |
| CONV-03           | LF output, binary writes                   | HLD §5                   | `output.js::emit`                                         | `app.test.js::"emit writes UTF-8 bytes with LF only …"`, P01–P10                                                                                                           | Verified                       |
| CONV-05           | UTF-8 arguments                            | HLD §5, LLD §5           | `main.js::main`, `output.js::encode`                      | `app.test.js::"encode produces UTF-8 bytes"`, `::"emit writes UTF-8 bytes …"`                                                                                              | Verified                       |
| CONV-06           | No locale dependence                       | HLD §5                   | `output.js::encode`                                       | Inspection; P01–P10 under CI's minimal environment                                                                                                                         | Verified                       |
| CONV-07           | Short options, bundling                    | LLD §3.2                 | `options.js::parseShort`                                  | `options.test.js::"count in every spelling, including bundled -c2"`, `::"an attached value consumes the rest of the bundle"`, P06                                          | Verified                       |
| CONV-08           | Long options, no abbreviation              | LLD §3.2                 | `options.js::parseLong`                                   | `options.test.js::"unknown and abbreviated long options …"`, P04                                                                                                           | Verified                       |
| CONV-09           | `--` terminator                            | LLD §3.1                 | `options.js::parseArgs`                                   | `options.test.js::"operands, '-', and everything after '--' are collected"`                                                                                                | Verified                       |
| CONV-10           | Operands, interleaving                     | LLD §3.1                 | `options.js::parseArgs`                                   | same as CONV-09, P10                                                                                                                                                       | Verified                       |
| CONV-11           | Repetition                                 | LLD §3.1                 | `options.js::parseArgs`                                   | `options.test.js::"the last occurrence wins, unvalidated"`                                                                                                                 | Verified                       |
| CONV-12           | Scan order                                 | LLD §4                   | `options.js::parseArgs`                                   | `options.test.js::"--help and --version end the scan"`, `::"an earlier syntax error wins over --help"`                                                                     | Verified                       |
| CONV-13           | Exact diagnostics                          | LLD §2.5                 | `options.js`, `validation.js`                             | `options.test.js` error tests, `app.test.js::"every usage error: …"`, P09, P10                                                                                             | Verified                       |
| CONV-14           | Try line, status 2                         | HLD §6                   | `app.js::usageDiagnostic`                                 | `app.test.js::"every usage error: …"`, P09, P10                                                                                                                            | Verified                       |
| CONV-15           | Values verbatim, `''`                      | LLD §2.5                 | `validation.js::invalid`                                  | `validation.test.js::"an empty name is rejected …"`                                                                                                                        | Verified                       |
| CONV-22           | `--help`/`--version` accepted, no argument | LLD §3.2                 | `options.js::parseLong`                                   | `options.test.js::"--help and --version take no argument"`                                                                                                                 | Verified                       |
| CONV-23           | Help verbatim                              | LLD §3.6                 | `app.js::HELP_TEXT`                                       | `app.test.js::"help text matches the user manual byte for byte"`, P07                                                                                                      | Verified                       |
| CONV-24           | No crash                                   | HLD §4 D2                | `app.js::run`, `output.js::emit`                          | as NFR-03                                                                                                                                                                  | Verified                       |
| CONV-25           | EPIPE: terminate quietly                   | LLD §3.7                 | `output.js::emit`                                         | `app.test.js::"emit survives a stream error such as EPIPE"`                                                                                                                | Verified                       |
| CONV-26           | stdin not read                             | HLD §3.1                 | (no stdin access)                                         | Inspection                                                                                                                                                                 | Verified                       |
| CONV-27 … CONV-30 | Harness conditions                         | HLD §5                   | `src/bin/dp-hello` (`#!` launcher)                        | P01–P10 via `run-tests.py`                                                                                                                                                 | Verified                       |

CONV-04 and CONV-16 … CONV-21 do not apply: `dp-hello` copies no input, opens no paths,
processes no operands, and has no runtime errors (SRS §3.7).

## 3. Backward traceability (test → requirement)

| Test                                                                      | Type                    | Requirement(s) verified                                       |
| :------------------------------------------------------------------------ | :---------------------- | :------------------------------------------------------------ |
| P01                                                                       | black-box, public       | FR-01                                                         |
| P02, P03                                                                  | black-box, public       | FR-02                                                         |
| P04                                                                       | black-box, public       | FR-02, CONV-08                                                |
| P05                                                                       | black-box, public       | FR-04                                                         |
| P06                                                                       | black-box, public       | FR-04, CONV-07                                                |
| P07                                                                       | black-box, public       | FR-07, CONV-23                                                |
| P08                                                                       | black-box, public       | FR-08, CONV-02                                                |
| P09                                                                       | black-box, public       | FR-10, FR-11, CONV-13, CONV-14                                |
| P10                                                                       | black-box, public       | FR-09, FR-11, CONV-13, CONV-14                                |
| `greeting.test.js` (4 tests)                                              | unit                    | FR-01, FR-02, FR-04, NFR-05                                   |
| `options.test.js` (13 tests)                                              | unit                    | FR-02, FR-06, FR-07, FR-09, FR-10, CONV-07 … CONV-13, CONV-22 |
| `validation.test.js` (8 tests)                                            | unit                    | FR-03, FR-04, FR-05, FR-09, CONV-15                           |
| `app.test.js::"default and named greetings"` … `::"every usage error: …"` | unit (end to end, pure) | FR-01 … FR-11, CONV-01, CONV-02, CONV-14, CONV-23             |
| `app.test.js::"encode …"`, `::"emit …"` (3 tests)                         | unit                    | NFR-01, NFR-03, CONV-03, CONV-05, CONV-24, CONV-25            |

## 4. Coverage summary

| Category                       | Total | Designed | Implemented | Verified |
| :----------------------------- | :---- | :------- | :---------- | :------- |
| User requirements (UR)         | 12    | 12       | 12          | 11       |
| Functional (FR)                | 11    | 11       | 11          | 11       |
| Non-functional (NFR)           | 7     | 7        | 7           | 6        |
| Conventions (CONV, applicable) | 23    | 23       | 23          | 23       |

## 5. Gaps and justifications

- **NFR-02 (and UR-11) memory:** run time is within budget (~85 ms in the container for
  `-c 1000`, budget 300 ms), but peak RSS is ~47 MiB against 32 MiB. The Node.js 24 runtime
  itself (`node -e 0`) peaks at ~47–49 MiB; V8 flags (`--jitless`, smaller semi-spaces) change
  it by < 1 MiB. This is a property of the chosen runtime, not of the program; the budget
  cannot be met by any Node.js implementation. Plan: none for this repository; raised with the
  curriculum owners as an interpreted-runtime allowance question.
