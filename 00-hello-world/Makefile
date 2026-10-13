# 00-hello-world: Standard Terminal Hello World, in JavaScript (Node.js 24).
#
# Extends the universal build contract in shared/templates/BASE-MAKEFILE:
#
#   make all | install | uninstall | test | check | lint | format | clean | distclean
#   make test-hidden | grade | help
#
# Toolchain: Node.js 24 and npm. package.json and package-lock.json in this directory define
# the dp-hello package (ES modules: the program in src/lib/, the launcher in src/bin/, unit
# tests in test/) and its exactly pinned development dependencies (ESLint, Prettier).
#
# Build: the program has no runtime dependencies, so there is nothing to compile. `make all`
# installs the development dependencies into node_modules/ (`npm ci`, only when
# package-lock.json is newer than the installed tree) and leaves the extensionless
# `#!/usr/bin/env node` launcher src/bin/dp-hello executable, so BIN_DIR is src/bin.
# Unit tests use the built-in node:test runner and need no dependencies.
#
# Install: package.json and src/{bin,lib} go to $(LIBDIR)/js/00-hello-world, and a `#!/bin/sh`
# launcher that runs the installed src/bin/dp-hello with node (absolute path baked in) goes to
# $(BINDIR)/dp-hello. Uninstall removes both.
#
# Container-first: goals run in the toolchain container built from the repository's
# Containerfile (podman, then docker, then local; override with DP_RUNTIME).

PROJECT := 00-hello-world
TOOLS   := dp-hello

# Path to the sdlc-curriculum checkout (the specs, test suites, and runner live there).
CURRICULUM_ROOT ?= ../sdlc-curriculum

NODE ?= node
NPM  ?= npm

# Directory that contains the built executables after `make all`.
BIN_DIR := src/bin

# Where `make install` puts the payload (see the header).
INSTALL_DIR = $(LIBDIR)/js/$(PROJECT)

# Install the development dependencies unless node_modules is already up to date with the
# lockfile (npm writes node_modules/.package-lock.json after every install).
NPM_CI = [ node_modules/.package-lock.json -nt package-lock.json ] \
	|| $(NPM) ci --no-audit --no-fund
ESLINT   = $(NODE) node_modules/eslint/bin/eslint.js
PRETTIER = $(NODE) node_modules/prettier/bin/prettier.cjs

define DP_BUILD
$(NPM_CI)
chmod +x $(BIN_DIR)/dp-hello
endef

DP_UNIT_TEST = $(NODE) --test

define DP_LINT
$(NPM_CI)
$(ESLINT) --max-warnings 0 .
$(PRETTIER) --check .
endef

define DP_FORMAT
$(NPM_CI)
$(PRETTIER) --write --log-level warn .
endef

define DP_INSTALL
rm -rf "$(INSTALL_DIR)"
mkdir -p "$(INSTALL_DIR)/src" "$(BINDIR)"
cp package.json "$(INSTALL_DIR)/"
cp -R src/bin src/lib "$(INSTALL_DIR)/src/"
printf '#!/bin/sh\nexec node %s "$$@"\n' "'$(INSTALL_DIR)/src/bin/dp-hello'" \
	> "$(BINDIR)/dp-hello"
chmod +x "$(BINDIR)/dp-hello"
"$(BINDIR)/dp-hello" --version
endef

define DP_UNINSTALL
rm -f "$(BINDIR)/dp-hello"
rm -rf "$(INSTALL_DIR)"
rmdir "$(LIBDIR)/js" "$(LIBDIR)" 2>/dev/null || true
endef

DP_CLEAN = rm -rf coverage .eslintcache

DP_DISTCLEAN = rm -rf node_modules

include $(CURRICULUM_ROOT)/shared/templates/BASE-MAKEFILE
