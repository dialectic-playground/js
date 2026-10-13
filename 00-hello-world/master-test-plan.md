# Master Test Plan (MTP) — Standard Terminal Hello World

| Field | Value |
| :-- | :-- |
| Project | `00-hello-world` |
| Tools | dp-hello |
| Implementation language | js (JavaScript, Node.js 24, npm) |
| Author | Brandon Perkins |
| Version / date | 1.0 — 2026-10-13 |
| Standard | Structure adapted from IEEE 829 / ISO/IEC/IEEE 29119-3 |

## 1. Introduction and scope

### 1.1 Objectives
"Tested enough" means: every SRS acceptance criterion (FR-01 … FR-11) is exercised by a unit
test or a black-box test, every CONV-13 diagnostic and every COUNT boundary is unit-tested,
the public and hidden suites pass byte-for-byte on Linux, macOS, and Windows, and `make lint`
is clean.

### 1.2 In scope / out of scope
| In scope | Out of scope |
| :-- | :-- |
| Every FR/NFR in the SRS and the applicable CONV rules, on Linux, macOS, and Windows | Node.js itself (argv decoding, stream implementation) beyond its observable effect |
| Install/uninstall round trip (`make roundtrip`) | Invalid UTF-8 argument bytes on POSIX (outside the SRS assumption; LLD §5) |

## 2. Test items

| Item | Version / location |
| :-- | :-- |
| dp-hello | `00-hello-world/src/` on branch `feat/00-hello-world` |
| Unit tests | `00-hello-world/test/*.test.js` (32 tests) |
| Public black-box suite | `tests/public/` (10 tests) |
| Hidden black-box suite | `tests/private/` (10 tests, run by CI) |

## 3. Test levels and approach

| Level | Purpose | Technique(s) | Tooling | Owner |
| :-- | :-- | :-- | :-- | :-- |
| Unit | Parser, validation, greeting, output in isolation | Equivalence partitioning, boundary values, error guessing | `node:test` + `node:assert/strict` (`make test-unit`) | developer |
| Integration | parse → validate → greet → format, without a process | Specification-based, via the pure `app.js::run` | `test/app.test.js` | developer |
| System (black-box) | The specified CLI behavior, byte-exact | Specification-based | `make test` → `run-tests.py` | developer |
| Acceptance | Hidden suite on all OSes | — | CI `make check` (container and native) | CI |
| Static analysis | Lint and formatting | — | `make lint` (ESLint `--max-warnings 0`, `prettier --check`) | developer / CI |

## 4. Test design

### 4.1 Equivalence partitions and boundaries

| Input | Valid partitions | Invalid partitions | Boundaries |
| :-- | :-- | :-- | :-- |
| NAME | non-empty: ASCII, spaces, non-ASCII, starting with `-` | empty | `""` vs. one character |
| COUNT | ASCII digits with value 1–1000, leading zeros | empty, non-digits (sign, space, `.`, Unicode digits), 0, > 1000 | 0, 1, 1000, 1001; very long digit strings |
| Option spelling | `-nV`, `-n V`, `--name=V`, `--name V`, repeated | unknown short/long, abbreviations, missing value, `--help=` | last token without its value |
| Operands | none | any word, `-`, anything after `--` | `--` with nothing after it (valid) |
| Scan order | `--help`/`--version` before any syntax error | syntax error before `--help` | `--help` as the value of `-n` (a value, not an option) |

### 4.2 Additional test cases (beyond the supplied suite)

| ID | Requirement(s) | Steps / command (args) | Expected result | Level / test |
| :-- | :-- | :-- | :-- | :-- |
| T-01 | FR-04 | `parseCount` of 1, 1000, `007`, `0001000` | 1, 1000, 7, 1000 | unit: `parseCount accepts 1-1000 with leading zeros` |
| T-02 | FR-05 | `parseCount` of 0, `000`, 1001, 23 digits | null | unit: `parseCount rejects values outside 1-1000` |
| T-03 | FR-05 | `parseCount` of `""`, `+5`, ` 5`, `5.0`, `1e3`, `٣`, `５` | null | unit: `parseCount rejects anything but ASCII digits` |
| T-04 | FR-03 | `--name ''`, `-n ''` | `invalid argument '' for '--name'` / `'-n'` | unit: `an empty name is rejected with the option as written` |
| T-05 | FR-06 | `-c 0 -c 5`, `-n A --name B` | count 5 / name B (no error) | unit: `the last occurrence wins, unvalidated` |
| T-06 | CONV-07 | `-nc2` | name `c2` | unit: `an attached value consumes the rest of the bundle` |
| T-07 | FR-02 | `--name=-x`, `-n-x`, `--name -x`, `-n --help` | the value is `-x` / `--help` | unit: `values may begin with '-' or be empty` |
| T-08 | FR-07, CONV-12 | `--help extra -x`, `-c 0 --help`, `extra --version` | help / help / version | unit: `--help and --version end the scan` |
| T-09 | CONV-12 | `-x --help` | `invalid option -- 'x'` | unit: `an earlier syntax error wins over --help` |
| T-10 | FR-10, CONV-05 | `-ë`, `-😀` | the whole code point is echoed | unit: `unknown short options` |
| T-11 | FR-09 | `--`, `-- -n`, `-`, `a -n B c` | none / `-n` / `-` / `a` as first operand | unit: `operands, '-', and everything after '--' are collected` |
| T-12 | CONV-03, CONV-05 | `emit(run(["-n","Zoë","-c","2"]))` into captured streams | exact UTF-8 bytes, no CR | unit: `emit writes UTF-8 bytes with LF only and sets the status` |
| T-13 | CONV-25 | emit an EPIPE error on stdout after `emit` | no exception | unit: `emit survives a stream error such as EPIPE` |
| T-14 | FR-07, CONV-23 | `HELP_TEXT` vs. the manual, line by line | identical | unit: `help text matches the user manual byte for byte` |
| T-15 | NFR-06 | `make roundtrip` with a temporary PREFIX | install prints the version; uninstall removes everything | CI (3 OSes) |

### 4.3 Negative and robustness testing
Every CONV-13 message is asserted in `options.test.js` (syntax) and end to end with stdout,
stderr, and status in `app.test.js::"every usage error: …"`. The design returns errors as
values, so no input reaches an exception path (CONV-24); stream failure is covered by T-13.
There is no input, file, or permission handling to test (SRS §3.4, NFR-07).

### 4.4 Performance and resource testing
NFR-02 is measured, not asserted in CI: `dp-hello -c 1000` timed with `subprocess` and
`getrusage(RUSAGE_CHILDREN).ru_maxrss` in the toolchain container: ~85 ms and ~47 MiB peak
RSS. The time meets the 300 ms interpreted budget; the memory exceeds 32 MiB because of the
Node.js runtime baseline (RTM §5).

## 5. Test environments

| Environment | OS / version | Toolchain | How provisioned |
| :-- | :-- | :-- | :-- |
| Local (container) | Fedora 44 host, Debian trixie image | Node.js 24, npm, Python 3.13 | `make check` (Podman, `Containerfile`) |
| CI container | ubuntu-latest | same image | `Container (podman)` job |
| CI native | ubuntu-latest, macos-latest, windows-latest (Git Bash) | actions/setup-node 24, Python 3.12, GNU Make | `Native (…)` jobs |

## 6. Entry and exit criteria

- **Entry:** HLD/LLD written; `make all` succeeds; `make lint` is clean.
- **Exit:** all unit tests and the public and hidden suites pass in the container and natively
  on all three OSes; `make roundtrip` passes; the RTM shows every applicable requirement as
  Verified or as a justified gap.
- **Suspension / resumption:** suspend on a toolchain or CI-infrastructure failure; resume
  after it is fixed, re-running the full `make check`.

## 7. Defect management
Defects are GitHub issues in this repository with a severity label; each fix adds a unit test
that reproduces it before the fix (regression guard), and CI re-runs every level.

| Severity | Definition |
| :-- | :-- |
| 1 — Critical | Crash, stack trace, or wrong output/status on a mainline path |
| 2 — Major | Wrong diagnostic or status for an error case, or a platform-specific byte difference |
| 3 — Minor | Documentation, lint, or build-hook issues without behavioral impact |

## 8. Schedule and deliverables

| Milestone | Deliverable | Target date |
| :-- | :-- | :-- |
| Design complete | hld.md, lld.md | 2026-10-13 |
| Implementation complete | src/, test/, Makefile hooks | 2026-10-13 |
| Verification complete | RTM, CI green on all jobs | 2026-10-13 |

## 9. Risks and contingencies

| Risk | Mitigation |
| :-- | :-- |
| Windows-only failure (launcher, paths, output) | CI runs all three OSes on every push; install paths single-quoted |
| Lint/format version drift | Exact versions in `package-lock.json`, `npm ci` everywhere |
| npm registry unavailable | Only `lint`/`format`/`all` need it; the unit tests and the tool have no dependencies |

## 10. Test summary

| Metric | Value |
| :-- | :-- |
| Unit tests (pass / total) | 32 / 32 |
| Coverage (line / branch) | 100% / 100% of `src/lib/` except `main.js` (black-box only), via `node --test --experimental-test-coverage` |
| Public black-box (pass / 10) | 10 / 10 (container and local) |
| Hidden black-box (pass / 10, from CI) | 10 / 10 (container, local run of `make check`) |
| Open defects by severity | 0 / 0 / 0 |
