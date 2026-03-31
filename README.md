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

### 1. Add the marketplace
From within Claude Code, run the plugin marketplace add command for the humanlayer-clone marketplace:
```bash
/plugin marketplace add https://github.com/billlyzhaoyh/humanlayer-clone.git
```

### 2. Install the plugin
Then, run the plugin install command for the humanlayer-clone plugin:
```bash
/plugin install humanlayer-clone@humanlayer-clone
```

## Quick Start

### 0. Initialize Workspace (First Time Only)

```bash
# Setup thoughts directory
/setup

# Optional: Setup Linear automation
export LINEAR_API_KEY=your_key
/setup-linear
/setup-github-actions
```

This creates the `thoughts/` directory structure where research and plans are stored.

**For Linear automation:**
1. `/setup-linear` - Creates workflow states in Linear workspace
2. `/setup-github-actions` - Generates GitHub Actions workflow files
3. Configure GitHub Secrets (LINEAR_API_KEY, ANTHROPIC_API_KEY)
4. Commit workflows and run: `gh workflow run linear-research-tickets.yml`

### 1. Research Phase

```bash
/humanlayer-clone:research "How does authentication work in this codebase?"
```

Output: `thoughts/shared/research/2025-01-04-auth-research.md`

### 2. Planning Phase

```bash
/humanlayer-clone:plan thoughts/shared/research/2025-01-04-auth-research.md
```

Output: `thoughts/shared/plans/2025-01-04-auth-plan.md`

### 3. Implementation Phase

```bash
/humanlayer-clone:implement thoughts/shared/plans/2025-01-04-auth-plan.md
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

### `/setup-linear`

Automatically configure your Linear workspace with required workflow states for automation.

**What it does:**
- Creates 9 workflow states for Research → Plan → Implementation lifecycle
- Skips states that already exist (safe to re-run)
- Assigns appropriate colors and types to each state
- Provides next steps for completing Linear integration

**Requirements:**
- `LINEAR_API_KEY` environment variable must be set
- Admin permissions in Linear workspace

**Usage:**

```bash
# Interactive setup
/setup-linear

# Or run directly
export LINEAR_API_KEY=your_key
node scripts/linear-helper.mjs setup-workflow
```

**States Created:**
- Research: Research Needed, Research in Progress, Research in Review
- Planning: Ready for Plan, Plan in Progress, Plan in Review
- Implementation: Ready for Dev, In Dev, Code Review

### `/setup-github-actions`

Automatically generate GitHub Actions workflow files for Linear automation in your repository.

**What it does:**
- Creates `package.json` with `@linear/sdk` dependency (if not present)
- Copies `scripts/linear-helper.mjs` to your repository
- Creates 3 workflow files in `.github/workflows/`:
  - `linear-research-tickets.yml` - Automates research phase
  - `linear-create-plan.yml` - Automates planning phase
  - `linear-implement-plan.yml` - Automates implementation phase

**Why needed:**
When you install the plugin, you only get commands and agents. GitHub Actions workflows and dependencies need to be in your repository.

**Usage:**

```bash
# Interactive setup
/setup-github-actions

# Or run directly
node scripts/setup-github-actions.mjs
```

**After running:**
1. Install dependencies: `npm install`
2. Commit files: `git add package.json scripts/ .github/workflows/ && git commit`
3. Configure GitHub Secrets (LINEAR_API_KEY, ANTHROPIC_API_KEY)
4. Test with: `gh workflow run linear-research-tickets.yml -f num_tickets=1`

### `/humanlayer-clone:research`

Deep codebase research using 6 parallel sub-agents.

**What it does:**
- Spawns specialized agents to investigate different aspects
- Documents findings without critique or recommendations
- Generates structured markdown with YAML frontmatter
- Supports follow-up questions and iterative research

**Output:** `thoughts/shared/research/YYYY-MM-DD-description.md`

### `/humanlayer-clone:plan`

Interactive implementation planning.

**What it does:**
- Reads prior research documents (if provided)
- Runs fresh research agents for additional context
- Asks clarifying questions iteratively
- Creates phased plans with automated/manual success criteria

**Output:** `thoughts/shared/plans/YYYY-MM-DD-description.md`

### `/humanlayer-clone:implement`

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
/humanlayer-clone:research "How do we handle user permissions?"

# Create a plan based on research
/humanlayer-clone:plan thoughts/shared/research/2025-01-04-permissions.md
# (Plugin reads research AND runs fresh investigation)

# Execute the plan
/humanlayer-clone:implement thoughts/shared/plans/2025-01-04-permissions-plan.md

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
/humanlayer-clone:iterate-plan thoughts/shared/plans/2025-01-04-permissions-plan.md
```

## Linear Automation

This plugin includes GitHub Actions workflows for automating Linear ticket progression through the Research → Plan → Implementation lifecycle.

### Quick Setup

The easiest way to set up Linear integration:

```bash
# 1. Set your Linear API key
export LINEAR_API_KEY=your_api_key_here

# 2. Setup Linear workspace (creates workflow states)
node scripts/linear-helper.mjs setup-workflow
# Or: /setup-linear

# 3. Setup GitHub Actions (creates workflows + dependencies)
node scripts/setup-github-actions.mjs
# Or: /setup-github-actions

# 4. Install dependencies
npm install

# 5. Configure GitHub Secrets
# Go to Settings → Secrets → Actions
# Add: LINEAR_API_KEY, ANTHROPIC_API_KEY

# 6. Commit all files and test
git add package.json scripts/ .github/workflows/
git commit -m "Add Linear automation"
git push
gh workflow run linear-research-tickets.yml -f num_tickets=1
```

This automatically:
- Creates all 9 required workflow states in Linear
- Generates package.json with @linear/sdk dependency
- Copies linear-helper.mjs script to your repository
- Creates 3 GitHub Actions workflow files
- Provides ready-to-use automation

### Prerequisites

1. **Linear Workspace Setup**

   **Automated (Recommended):**
   ```bash
   export LINEAR_API_KEY=your_api_key
   node scripts/linear-helper.mjs setup-workflow
   ```

   **Manual Alternative:**
   - Create "LinearLayer (Claude)" user/bot for automation
   - Configure workflow states matching your team's process
   - Required states: `Research Needed`, `Research in Progress`, `Research in Review`, `Ready for Plan`, `Plan in Progress`, `Plan in Review`, `Ready for Dev`, `In Dev`, `Code Review`

2. **GitHub Repository Setup**
   - Install plugin: `npm install` (installs @linear/sdk)
   - Add GitHub Secrets:
     - `LINEAR_API_KEY`: Your Linear API key
     - `ANTHROPIC_API_KEY`: Claude API key for automation
     - `GH_TOKEN`: GitHub token (automatically available as `secrets.GITHUB_TOKEN`)

3. **Thoughts Directory**
   - Unlike manual workflows, automated workflows commit `thoughts/` to the repository
   - Research and plan documents are tracked in git for audit trail
   - Each workflow commit links back to Linear ticket

### Available Workflows

**Note:** These workflow files are not included with the plugin. Run `/setup-github-actions` to generate them in your repository.

#### 1. Research Tickets (`linear-research-tickets.yml`)

Automates research phase for Linear tickets.

**Trigger**: Manual workflow dispatch
**Parameters**: `num_tickets` (default: 10)

**What it does:**
1. Fetches tickets in "research needed" status assigned to "LinearLayer (Claude)"
2. Updates ticket to "research in progress"
3. Downloads any images from ticket to `thoughts/shared/images/`
4. Runs `/humanlayer-clone:research` command with ticket details
5. Commits research document to repository
6. Updates ticket to "research in review" (success) or "research needed" (failure)
7. Adds comment to Linear with research link

**Usage:**
```bash
gh workflow run linear-research-tickets.yml --repo your-org/your-repo
```

#### 2. Create Plans (`linear-create-plan.yml`)

Creates implementation plans for researched tickets.

**Trigger**: Manual workflow dispatch
**Parameters**: `num_tickets` (default: 10)

**What it does:**
1. Fetches tickets in "ready for plan" status
2. Updates ticket to "plan in progress"
3. Locates prior research document for the ticket
4. Runs `/humanlayer-clone:plan` command with ticket + research context
5. Commits plan document to repository
6. Updates ticket to "plan in review" (success) or "ready for plan" (failure)
7. Adds comment with plan link

**Usage:**
```bash
gh workflow run linear-create-plan.yml --repo your-org/your-repo
```

#### 3. Implement Plans (`linear-implement-plan.yml`)

Implements approved plans and creates pull requests.

**Trigger**: Manual workflow dispatch
**Parameters**: `num_tickets` (default: 10)

**What it does:**
1. Fetches tickets in "ready for dev" status
2. Creates/checks out git branch from Linear ticket
3. Updates ticket to "in dev"
4. Locates plan document for the ticket
5. Runs `/humanlayer-clone:implement` command with plan
6. Commits implementation changes
7. Creates pull request via `gh pr create`
8. Adds PR link to Linear ticket
9. Updates ticket to "code review" (success) or "ready for dev" (failure)

**Usage:**
```bash
gh workflow run linear-implement-plan.yml --repo your-org/your-repo
```

### Linear CLI Usage

The plugin includes `scripts/linear-helper.mjs` for Linear API operations:

**Setup & Configuration:**
```bash
# Setup workflow states (creates all required states)
node scripts/linear-helper.mjs setup-workflow
node scripts/linear-helper.mjs setup-workflow --team "Engineering"

# List all workflow states
node scripts/linear-helper.mjs list-states
node scripts/linear-helper.mjs list-states --team "Engineering"
```

**Issue Management:**
```bash
# List issues by status
node scripts/linear-helper.mjs list-issues --status "research needed" --assignee "LinearLayer (Claude)" --limit 10

# Get issue details
node scripts/linear-helper.mjs get-issue ENG-123
node scripts/linear-helper.mjs get-issue ENG-123 --output text

# Update issue status
node scripts/linear-helper.mjs update-status ENG-123 "research in progress"

# Add comment
node scripts/linear-helper.mjs add-comment ENG-123 "Research complete: [link]"

# Add PR link
node scripts/linear-helper.mjs add-link ENG-123 https://github.com/org/repo/pull/42 --title "Implementation PR"

# Download images
node scripts/linear-helper.mjs download-images ENG-123 --output-dir thoughts/shared/images
```

### Workflow Customization

Each workflow file can be customized:

- **Assignee filter**: Change `"LinearLayer (Claude)"` to your bot name
- **Status names**: Update status strings to match your Linear workflow
- **Ticket limits**: Adjust default `num_tickets` parameter
- **Parallel processing**: Workflows use matrix strategy for concurrent execution

### Best Practices

1. **Start Small**: Begin with `num_tickets: 1` to test workflows
2. **Monitor Progress**: Check Linear ticket comments for execution logs
3. **Review Research First**: Ensure research quality before triggering plan workflow
4. **Manual Review Gates**: Review plans before moving tickets to "ready for dev"
5. **Branch Naming**: Use Linear's branch name suggestion feature for consistency

### Troubleshooting

**Workflow fails with "LINEAR_API_KEY not found"**
- Ensure secret is added to repository settings

**Ticket status not updating**
- Verify status names match Linear workflow states exactly (case-sensitive)
- Check that "LinearLayer (Claude)" user exists and has permissions

**No tickets found**
- Verify tickets are assigned to "LinearLayer (Claude)"
- Check status filter matches Linear workflow state names

**Images not downloading**
- Ensure Linear attachments are accessible
- Check `thoughts/shared/images/` directory exists

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
