# humanlayer-clone

A Claude Code plugin that provides a complete Research → Plan → Implement workflow with specialized sub-agents for codebase analysis.

## Overview

This plugin replicates the powerful workflow from the HumanLayer repository, enabling:

- **Deep Codebase Research**: Parallel sub-agent investigation with structured documentation
- **Interactive Planning**: Skeptical, iterative planning with two-tier success criteria
- **Phase-Based Implementation**: Structured execution with verification gates

## Features

- 🔍 **6 Specialized Sub-Agents**: codebase-locator, codebase-analyzer, codebase-pattern-finder, thoughts-locator, thoughts-analyzer, web-search-researcher
- 📝 **Structured Documentation**: YAML frontmatter + markdown format
- ✅ **Two-Tier Verification**: Automated (make test) vs Manual (UI/UX) success criteria
- 🔄 **Iterative Workflow**: Research feeds into planning, plans guide implementation
- 🎯 **Phase-Based Execution**: Pause after each phase for verification

## Installation

```bash
cd your-project
claude plugin install https://github.com/billyzhaoyh/humanlayer-clone
```

## Quick Start

### 0. Initialize Workspace (First Time Only)

```bash
/setup
```

This creates the `thoughts/` directory structure where research and plans are stored.

### 1. Research Phase

```bash
/research "How does authentication work in this codebase?"
```

Output: `thoughts/shared/research/2025-01-04-auth-research.md`

### 2. Planning Phase

```bash
/plan thoughts/shared/research/2025-01-04-auth-research.md
```

Output: `thoughts/shared/plans/2025-01-04-auth-plan.md`

### 3. Implementation Phase

```bash
/implement thoughts/shared/plans/2025-01-04-auth-plan.md
```

Executes phase-by-phase with verification pauses.

## Commands

### `/setup`

Initialize the thoughts directory structure for storing research and plans.

**What it does:**
- Creates `thoughts/shared/research/`, `thoughts/shared/plans/`, etc.
- Adds `thoughts/` to `.gitignore`
- Creates helpful README explaining the structure

**Usage:** Run once per project before using other commands.

```bash
/setup
```

### `/research`

Deep codebase research using 6 parallel sub-agents.

**What it does:**
- Spawns specialized agents to investigate different aspects
- Documents findings without critique or recommendations
- Generates structured markdown with YAML frontmatter
- Supports follow-up questions and iterative research

**Output:** `thoughts/shared/research/YYYY-MM-DD-description.md`

### `/plan`

Interactive implementation planning.

**What it does:**
- Reads prior research documents (if provided)
- Runs fresh research agents for additional context
- Asks clarifying questions iteratively
- Creates phased plans with automated/manual success criteria

**Output:** `thoughts/shared/plans/YYYY-MM-DD-description.md`

### `/implement`

Phase-based implementation with verification gates.

**What it does:**
- Reads plan and executes phase by phase
- Runs automated verification (make test, make lint)
- Pauses for manual verification after each phase
- Updates plan checkboxes as work completes
- Handles discrepancies between plan and reality

### `/iterate-plan`

Update existing plans based on feedback.

**What it does:**
- Locates existing plan
- Makes surgical edits vs full rewrites
- Maintains structure and progress checkboxes
- Only spawns research if truly necessary

## Directory Structure

```
your-project/
├── thoughts/                    # Created by plugin (gitignored)
│   └── shared/
│       ├── research/           # Research documents
│       └── plans/              # Implementation plans
└── .gitignore                  # Plugin adds thoughts/ to gitignore
```

## Sub-Agents

### codebase-locator
Finds WHERE code lives. Uses Grep, Glob, LS to locate relevant files and organize by purpose.

### codebase-analyzer
Understands HOW code works. Reads files, traces data flow, provides file:line references.

### codebase-pattern-finder
Finds similar implementations. Shows code examples and variations for reference.

### thoughts-locator
Discovers relevant documentation in thoughts/ directory.

### thoughts-analyzer
Extracts actionable insights from thoughts documents, filtering noise.

### web-search-researcher
Performs external research when explicitly requested.

## Workflow Example

```bash
# First time: initialize workspace
/setup

# Start with research
/research "How do we handle user permissions?"

# Create a plan based on research
/plan thoughts/shared/research/2025-01-04-permissions.md
# (Plugin reads research AND runs fresh investigation)

# Execute the plan
/implement thoughts/shared/plans/2025-01-04-permissions-plan.md

# Phase 1 completes...
# Phase 1 Complete - Ready for Manual Verification
#
# Automated verification passed:
# ✓ make test
# ✓ make lint
#
# Please perform manual verification:
# - [ ] UI displays roles correctly
# - [ ] Permission checks work in admin panel

# After manual testing...
# "Continue to Phase 2"

# Update plan if needed
/iterate-plan thoughts/shared/plans/2025-01-04-permissions-plan.md
```

## Philosophy

**Documentarian, Not Critic**: Research and analysis agents document what exists without suggesting improvements or identifying problems. This keeps findings objective and lets the main Claude session make decisions.

**Interactive Planning**: Plans are created through conversation, not one-shot generation. The planner asks questions, presents options, and iterates based on your feedback.

**Verification Gates**: Implementation pauses after each phase for manual verification, ensuring quality before proceeding.

## Troubleshooting

### Plugin not found after installation
```bash
claude plugin list
# Verify humanlayer-clone is listed
```

### Thoughts directory not created
The plugin will create `thoughts/` automatically on first command use.

### Agents not spawning
Ensure agent definitions are in `agents/` directory and have valid frontmatter.

## License

Apache-2.0

## Credits

Based on the workflow system from [HumanLayer](https://github.com/humanlayer/humanlayer).
