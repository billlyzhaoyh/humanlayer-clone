#!/usr/bin/env node

/**
 * GitHub Actions Setup Script
 *
 * Creates the three Linear automation workflows in .github/workflows/
 * along with comprehensive documentation.
 */

import { promises as fs } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Workflow templates
const RESEARCH_WORKFLOW = `name: Linear Research Tickets

on:
  workflow_dispatch:
    inputs:
      num_tickets:
        description: 'Number of tickets to process'
        required: false
        default: '10'
        type: string

jobs:
  fetch-tickets:
    name: Fetch tickets for research
    runs-on: ubuntu-latest
    outputs:
      tickets: \${{ steps.get-tickets.outputs.tickets }}
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm install

      - name: Fetch tickets
        id: get-tickets
        env:
          LINEAR_API_KEY: \${{ secrets.LINEAR_API_KEY }}
        run: |
          # Get tickets in "research needed" status assigned to "LinearLayer (Claude)"
          TICKETS=$(node scripts/linear-helper.mjs list-issues \\
            --status "Research Needed" \\
            --assignee "LinearLayer (Claude)" \\
            --limit "\${{ github.event.inputs.num_tickets }}")

          # Extract just the IDs for matrix strategy
          TICKET_IDS=$(echo "$TICKETS" | jq -r '.[].id')

          if [ -z "$TICKET_IDS" ]; then
            echo "No tickets found in 'Research Needed' status"
            echo "tickets=[]" >> $GITHUB_OUTPUT
            exit 0
          fi

          # Format as JSON array for matrix
          MATRIX_JSON=$(echo "$TICKET_IDS" | jq -R -s -c 'split("\\n") | map(select(length > 0))')
          echo "tickets=$MATRIX_JSON" >> $GITHUB_OUTPUT

          echo "Found tickets: $MATRIX_JSON"

  research-ticket:
    name: Research ticket \${{ matrix.ticket_id }}
    needs: fetch-tickets
    if: needs.fetch-tickets.outputs.tickets != '[]'
    runs-on: ubuntu-latest
    strategy:
      matrix:
        ticket_id: \${{ fromJson(needs.fetch-tickets.outputs.tickets) }}
      fail-fast: false
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4
        with:
          token: \${{ secrets.GITHUB_TOKEN }}

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm install

      - name: Update ticket status to "Research In Progress"
        env:
          LINEAR_API_KEY: \${{ secrets.LINEAR_API_KEY }}
        run: |
          node scripts/linear-helper.mjs update-status \\
            "\${{ matrix.ticket_id }}" \\
            "Research In Progress"

      - name: Get ticket details
        id: ticket-info
        env:
          LINEAR_API_KEY: \${{ secrets.LINEAR_API_KEY }}
        run: |
          # Get ticket details in text format
          TICKET_INFO=$(node scripts/linear-helper.mjs get-issue \\
            "\${{ matrix.ticket_id }}" \\
            --output text)

          # Save to file for passing to Claude
          echo "$TICKET_INFO" > ticket-details.txt

          echo "Ticket details saved to ticket-details.txt"

      - name: Download ticket images
        env:
          LINEAR_API_KEY: \${{ secrets.LINEAR_API_KEY }}
        run: |
          mkdir -p thoughts/shared/images
          node scripts/linear-helper.mjs download-images \\
            "\${{ matrix.ticket_id }}" \\
            --output-dir thoughts/shared/images || echo "No images to download"

      - name: Setup Claude Code
        env:
          ANTHROPIC_API_KEY: \${{ secrets.ANTHROPIC_API_KEY }}
        run: |
          # Install Claude Code CLI if not available
          echo "Setting up Claude Code..."
          # NOTE: You may need to install Claude Code in CI
          # See: https://docs.claude.com/claude-code

      - name: Run research command
        id: research
        env:
          ANTHROPIC_API_KEY: \${{ secrets.ANTHROPIC_API_KEY }}
        run: |
          # Prepare research prompt
          RESEARCH_PROMPT="Research Linear ticket \${{ matrix.ticket_id }}:

          $(cat ticket-details.txt)

          Please conduct deep codebase research to understand:
          1. Current implementation relevant to this ticket
          2. Related components and dependencies
          3. Existing patterns we should follow
          4. Technical context needed for planning

          Create research document: thoughts/shared/research/$(date +%Y-%m-%d)-\${{ matrix.ticket_id }}-research.md"

          # Run Claude Code with /research command
          echo "$RESEARCH_PROMPT" | claude /research || {
            echo "Research command failed"
            exit 1
          }

          # Find the created research document
          RESEARCH_DOC=$(find thoughts/shared/research -name "*\${{ matrix.ticket_id }}*" -type f | head -1)
          echo "research_doc=$RESEARCH_DOC" >> $GITHUB_OUTPUT

      - name: Commit research document
        run: |
          git config user.name "LinearLayer Bot"
          git config user.email "linearbot@github.actions"

          git add thoughts/
          git commit -m "Research for \${{ matrix.ticket_id }}" || echo "No changes to commit"
          git push

      - name: Update ticket status to "Research In Review"
        if: success()
        env:
          LINEAR_API_KEY: \${{ secrets.LINEAR_API_KEY }}
        run: |
          node scripts/linear-helper.mjs update-status \\
            "\${{ matrix.ticket_id }}" \\
            "Research In Review"

      - name: Add comment with research link
        if: success()
        env:
          LINEAR_API_KEY: \${{ secrets.LINEAR_API_KEY }}
        run: |
          RESEARCH_DOC="\${{ steps.research.outputs.research_doc }}"
          REPO_URL="\${{ github.server_url }}/\${{ github.repository }}"
          COMMIT_SHA=$(git rev-parse HEAD)

          COMMENT="✅ Research completed successfully!

          📄 Research document: [$RESEARCH_DOC]($REPO_URL/blob/$COMMIT_SHA/$RESEARCH_DOC)

          Status updated to 'Research In Review'. Please review and move to 'Ready for Plan' when approved."

          node scripts/linear-helper.mjs add-comment \\
            "\${{ matrix.ticket_id }}" \\
            "$COMMENT"

      - name: Revert status on failure
        if: failure()
        env:
          LINEAR_API_KEY: \${{ secrets.LINEAR_API_KEY }}
        run: |
          node scripts/linear-helper.mjs update-status \\
            "\${{ matrix.ticket_id }}" \\
            "Research Needed"

          COMMENT="❌ Research workflow failed. Status reverted to 'Research Needed'.

          Please check the GitHub Actions logs: \${{ github.server_url }}/\${{ github.repository }}/actions/runs/\${{ github.run_id }}"

          node scripts/linear-helper.mjs add-comment \\
            "\${{ matrix.ticket_id }}" \\
            "$COMMENT"
`;

const PLAN_WORKFLOW = `name: Linear Create Plan

on:
  workflow_dispatch:
    inputs:
      num_tickets:
        description: 'Number of tickets to process'
        required: false
        default: '10'
        type: string

jobs:
  fetch-tickets:
    name: Fetch tickets for planning
    runs-on: ubuntu-latest
    outputs:
      tickets: \${{ steps.get-tickets.outputs.tickets }}
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm install

      - name: Fetch tickets
        id: get-tickets
        env:
          LINEAR_API_KEY: \${{ secrets.LINEAR_API_KEY }}
        run: |
          # Get tickets in "Ready for Plan" status
          TICKETS=$(node scripts/linear-helper.mjs list-issues \\
            --status "Ready for Plan" \\
            --assignee "LinearLayer (Claude)" \\
            --limit "\${{ github.event.inputs.num_tickets }}")

          TICKET_IDS=$(echo "$TICKETS" | jq -r '.[].id')

          if [ -z "$TICKET_IDS" ]; then
            echo "No tickets found in 'Ready for Plan' status"
            echo "tickets=[]" >> $GITHUB_OUTPUT
            exit 0
          fi

          MATRIX_JSON=$(echo "$TICKET_IDS" | jq -R -s -c 'split("\\n") | map(select(length > 0))')
          echo "tickets=$MATRIX_JSON" >> $GITHUB_OUTPUT

          echo "Found tickets: $MATRIX_JSON"

  create-plan:
    name: Create plan for \${{ matrix.ticket_id }}
    needs: fetch-tickets
    if: needs.fetch-tickets.outputs.tickets != '[]'
    runs-on: ubuntu-latest
    strategy:
      matrix:
        ticket_id: \${{ fromJson(needs.fetch-tickets.outputs.tickets) }}
      fail-fast: false
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4
        with:
          token: \${{ secrets.GITHUB_TOKEN }}

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm install

      - name: Update ticket status to "Plan In Progress"
        env:
          LINEAR_API_KEY: \${{ secrets.LINEAR_API_KEY }}
        run: |
          node scripts/linear-helper.mjs update-status \\
            "\${{ matrix.ticket_id }}" \\
            "Plan In Progress"

      - name: Get ticket details
        id: ticket-info
        env:
          LINEAR_API_KEY: \${{ secrets.LINEAR_API_KEY }}
        run: |
          TICKET_INFO=$(node scripts/linear-helper.mjs get-issue \\
            "\${{ matrix.ticket_id }}" \\
            --output text)
          echo "$TICKET_INFO" > ticket-details.txt

      - name: Locate research document
        id: research-doc
        run: |
          # Find research document for this ticket
          RESEARCH_DOC=$(find thoughts/shared/research -name "*\${{ matrix.ticket_id }}*" -type f | head -1)

          if [ -z "$RESEARCH_DOC" ]; then
            echo "❌ No research document found for \${{ matrix.ticket_id }}"
            echo "Expected: thoughts/shared/research/*\${{ matrix.ticket_id }}*.md"
            echo "Please run research workflow first."
            exit 1
          fi

          echo "research_path=$RESEARCH_DOC" >> $GITHUB_OUTPUT
          echo "Found research document: $RESEARCH_DOC"

      - name: Setup Claude Code
        env:
          ANTHROPIC_API_KEY: \${{ secrets.ANTHROPIC_API_KEY }}
        run: |
          echo "Setting up Claude Code..."

      - name: Run plan command
        id: plan
        env:
          ANTHROPIC_API_KEY: \${{ secrets.ANTHROPIC_API_KEY }}
        run: |
          # Prepare planning prompt
          PLAN_PROMPT="Create implementation plan for Linear ticket \${{ matrix.ticket_id }}:

          ## Ticket Details
          $(cat ticket-details.txt)

          ## Prior Research
          Please read the research document first:
          $(cat \${{ steps.research-doc.outputs.research_path }})

          Based on the ticket requirements and research findings, create a detailed implementation plan with:
          1. Phase-by-phase breakdown
          2. Automated verification (make test, make lint)
          3. Manual verification steps
          4. Clear success criteria

          Create plan document: thoughts/shared/plans/$(date +%Y-%m-%d)-\${{ matrix.ticket_id }}-plan.md"

          # Run Claude Code with /plan command
          echo "$PLAN_PROMPT" | claude /plan || {
            echo "Plan command failed"
            exit 1
          }

          # Find the created plan document
          PLAN_DOC=$(find thoughts/shared/plans -name "*\${{ matrix.ticket_id }}*" -type f | head -1)
          echo "plan_doc=$PLAN_DOC" >> $GITHUB_OUTPUT

      - name: Commit plan document
        run: |
          git config user.name "LinearLayer Bot"
          git config user.email "linearbot@github.actions"

          git add thoughts/
          git commit -m "Plan for \${{ matrix.ticket_id }}" || echo "No changes to commit"
          git push

      - name: Update ticket status to "Plan In Review"
        if: success()
        env:
          LINEAR_API_KEY: \${{ secrets.LINEAR_API_KEY }}
        run: |
          node scripts/linear-helper.mjs update-status \\
            "\${{ matrix.ticket_id }}" \\
            "Plan In Review"

      - name: Add comment with plan link
        if: success()
        env:
          LINEAR_API_KEY: \${{ secrets.LINEAR_API_KEY }}
        run: |
          PLAN_DOC="\${{ steps.plan.outputs.plan_doc }}"
          RESEARCH_DOC="\${{ steps.research-doc.outputs.research_path }}"
          REPO_URL="\${{ github.server_url }}/\${{ github.repository }}"
          COMMIT_SHA=$(git rev-parse HEAD)

          COMMENT="✅ Implementation plan created successfully!

          📋 Plan document: [$PLAN_DOC]($REPO_URL/blob/$COMMIT_SHA/$PLAN_DOC)
          📄 Research document: [$RESEARCH_DOC]($REPO_URL/blob/$COMMIT_SHA/$RESEARCH_DOC)

          Status updated to 'Plan In Review'. Please review and move to 'Ready for Dev' when approved."

          node scripts/linear-helper.mjs add-comment \\
            "\${{ matrix.ticket_id }}" \\
            "$COMMENT"

      - name: Revert status on failure
        if: failure()
        env:
          LINEAR_API_KEY: \${{ secrets.LINEAR_API_KEY }}
        run: |
          node scripts/linear-helper.mjs update-status \\
            "\${{ matrix.ticket_id }}" \\
            "Ready for Plan"

          COMMENT="❌ Planning workflow failed. Status reverted to 'Ready for Plan'.

          Please check the GitHub Actions logs: \${{ github.server_url }}/\${{ github.repository }}/actions/runs/\${{ github.run_id }}"

          node scripts/linear-helper.mjs add-comment \\
            "\${{ matrix.ticket_id }}" \\
            "$COMMENT"
`;

const IMPLEMENT_WORKFLOW = `name: Linear Implement Plan

on:
  workflow_dispatch:
    inputs:
      num_tickets:
        description: 'Number of tickets to process'
        required: false
        default: '10'
        type: string

jobs:
  fetch-tickets:
    name: Fetch tickets for implementation
    runs-on: ubuntu-latest
    outputs:
      tickets: \${{ steps.get-tickets.outputs.tickets }}
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm install

      - name: Fetch tickets
        id: get-tickets
        env:
          LINEAR_API_KEY: \${{ secrets.LINEAR_API_KEY }}
        run: |
          # Get tickets in "Ready for Dev" status
          TICKETS=$(node scripts/linear-helper.mjs list-issues \\
            --status "Ready for Dev" \\
            --assignee "LinearLayer (Claude)" \\
            --limit "\${{ github.event.inputs.num_tickets }}")

          TICKET_IDS=$(echo "$TICKETS" | jq -r '.[].id')

          if [ -z "$TICKET_IDS" ]; then
            echo "No tickets found in 'Ready for Dev' status"
            echo "tickets=[]" >> $GITHUB_OUTPUT
            exit 0
          fi

          MATRIX_JSON=$(echo "$TICKET_IDS" | jq -R -s -c 'split("\\n") | map(select(length > 0))')
          echo "tickets=$MATRIX_JSON" >> $GITHUB_OUTPUT

          echo "Found tickets: $MATRIX_JSON"

  implement-plan:
    name: Implement \${{ matrix.ticket_id }}
    needs: fetch-tickets
    if: needs.fetch-tickets.outputs.tickets != '[]'
    runs-on: ubuntu-latest
    strategy:
      matrix:
        ticket_id: \${{ fromJson(needs.fetch-tickets.outputs.tickets) }}
      fail-fast: false
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4
        with:
          token: \${{ secrets.GITHUB_TOKEN }}
          fetch-depth: 0  # Fetch all history for branch operations

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm install

      - name: Get ticket details and branch
        id: ticket-info
        env:
          LINEAR_API_KEY: \${{ secrets.LINEAR_API_KEY }}
        run: |
          TICKET_JSON=$(node scripts/linear-helper.mjs get-issue \\
            "\${{ matrix.ticket_id }}" \\
            --output json)

          # Get branch name or generate one
          BRANCH_NAME=$(echo "$TICKET_JSON" | jq -r '.branchName // ""')

          if [ -z "$BRANCH_NAME" ]; then
            # Generate branch name from ticket ID and title
            TITLE=$(echo "$TICKET_JSON" | jq -r '.title')
            SLUG=$(echo "$TITLE" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]/-/g' | sed 's/--*/-/g' | cut -c1-50)
            BRANCH_NAME="\${{ matrix.ticket_id }}-$SLUG"
          fi

          echo "branch_name=$BRANCH_NAME" >> $GITHUB_OUTPUT
          echo "Branch: $BRANCH_NAME"

          # Save ticket details
          echo "$TICKET_JSON" | jq -r '.' > ticket-details.json

      - name: Create or checkout branch
        run: |
          BRANCH="\${{ steps.ticket-info.outputs.branch_name }}"

          git config user.name "LinearLayer Bot"
          git config user.email "linearbot@github.actions"

          # Check if branch exists remotely
          if git ls-remote --heads origin "$BRANCH" | grep -q "$BRANCH"; then
            echo "Branch exists remotely, checking out..."
            git fetch origin "$BRANCH"
            git checkout "$BRANCH"
          else
            echo "Creating new branch: $BRANCH"
            git checkout -b "$BRANCH"
          fi

      - name: Update ticket status to "In Dev"
        env:
          LINEAR_API_KEY: \${{ secrets.LINEAR_API_KEY }}
        run: |
          node scripts/linear-helper.mjs update-status \\
            "\${{ matrix.ticket_id }}" \\
            "In Dev"

      - name: Locate plan document
        id: plan-doc
        run: |
          # Find plan document for this ticket
          PLAN_DOC=$(find thoughts/shared/plans -name "*\${{ matrix.ticket_id }}*" -type f | head -1)

          if [ -z "$PLAN_DOC" ]; then
            echo "❌ No plan document found for \${{ matrix.ticket_id }}"
            echo "Expected: thoughts/shared/plans/*\${{ matrix.ticket_id }}*.md"
            echo "Please run plan workflow first."
            exit 1
          fi

          echo "plan_path=$PLAN_DOC" >> $GITHUB_OUTPUT
          echo "Found plan document: $PLAN_DOC"

      - name: Setup Claude Code
        env:
          ANTHROPIC_API_KEY: \${{ secrets.ANTHROPIC_API_KEY }}
        run: |
          echo "Setting up Claude Code..."

      - name: Run implement command
        id: implement
        env:
          ANTHROPIC_API_KEY: \${{ secrets.ANTHROPIC_API_KEY }}
        run: |
          # Prepare implementation prompt
          IMPLEMENT_PROMPT="Implement Linear ticket \${{ matrix.ticket_id }} according to the plan:

          ## Plan Document
          $(cat \${{ steps.plan-doc.outputs.plan_path }})

          Please implement the plan phase by phase:
          1. Execute each phase as specified
          2. Run automated verification (make test, make lint)
          3. Note any deviations from the plan
          4. Update plan checkboxes as you progress

          Important: This is running in CI, so manual verification will be handled separately."

          # Run Claude Code with /implement command
          echo "$IMPLEMENT_PROMPT" | claude /implement || {
            echo "Implementation command failed"
            exit 1
          }

          echo "Implementation completed"

      - name: Commit implementation changes
        id: commit
        run: |
          git config user.name "LinearLayer Bot"
          git config user.email "linearbot@github.actions"

          # Stage all changes
          git add -A

          # Check if there are changes to commit
          if git diff --cached --quiet; then
            echo "No changes to commit"
            echo "has_changes=false" >> $GITHUB_OUTPUT
          else
            # Create commit
            git commit -m "Implement \${{ matrix.ticket_id }}

            Auto-generated implementation from Linear workflow.
            Plan: \${{ steps.plan-doc.outputs.plan_path }}"

            git push origin "\${{ steps.ticket-info.outputs.branch_name }}"
            echo "has_changes=true" >> $GITHUB_OUTPUT
          fi

      - name: Create Pull Request
        id: create-pr
        if: steps.commit.outputs.has_changes == 'true'
        env:
          GH_TOKEN: \${{ secrets.GITHUB_TOKEN }}
        run: |
          # Get ticket details for PR description
          TICKET_TITLE=$(cat ticket-details.json | jq -r '.title')
          TICKET_URL=$(cat ticket-details.json | jq -r '.url')
          PLAN_DOC="\${{ steps.plan-doc.outputs.plan_path }}"
          REPO_URL="\${{ github.server_url }}/\${{ github.repository }}"

          # Create PR description
          PR_BODY="## Linear Ticket: \${{ matrix.ticket_id }}

          **Title**: $TICKET_TITLE
          **Link**: $TICKET_URL

          ## Implementation Plan

          This PR implements the plan defined in [$PLAN_DOC]($REPO_URL/blob/main/$PLAN_DOC)

          ## Changes

          Auto-generated implementation following the phased plan approach.

          ## Verification

          Please review:
          - [ ] Code follows plan specifications
          - [ ] Automated tests pass
          - [ ] Manual verification steps completed

          ---
          🤖 Auto-generated by LinearLayer workflow"

          # Create PR
          PR_URL=$(gh pr create \\
            --title "[\${{ matrix.ticket_id }}] $TICKET_TITLE" \\
            --body "$PR_BODY" \\
            --base main \\
            --head "\${{ steps.ticket-info.outputs.branch_name }}" \\
            --repo "\${{ github.repository }}")

          echo "pr_url=$PR_URL" >> $GITHUB_OUTPUT
          echo "Created PR: $PR_URL"

      - name: Add PR link to Linear ticket
        if: steps.commit.outputs.has_changes == 'true'
        env:
          LINEAR_API_KEY: \${{ secrets.LINEAR_API_KEY }}
        run: |
          PR_URL="\${{ steps.create-pr.outputs.pr_url }}"

          node scripts/linear-helper.mjs add-link \\
            "\${{ matrix.ticket_id }}" \\
            "$PR_URL" \\
            --title "Implementation PR"

      - name: Update ticket status to "Code Review"
        if: success() && steps.commit.outputs.has_changes == 'true'
        env:
          LINEAR_API_KEY: \${{ secrets.LINEAR_API_KEY }}
        run: |
          node scripts/linear-helper.mjs update-status \\
            "\${{ matrix.ticket_id }}" \\
            "Code Review"

      - name: Add comment with PR link
        if: success() && steps.commit.outputs.has_changes == 'true'
        env:
          LINEAR_API_KEY: \${{ secrets.LINEAR_API_KEY }}
        run: |
          PR_URL="\${{ steps.create-pr.outputs.pr_url }}"
          PLAN_DOC="\${{ steps.plan-doc.outputs.plan_path }}"
          BRANCH="\${{ steps.ticket-info.outputs.branch_name }}"

          COMMENT="✅ Implementation completed successfully!

          🔀 Pull Request: $PR_URL
          🌿 Branch: \\\`$BRANCH\\\`
          📋 Plan: $PLAN_DOC

          Status updated to 'Code Review'. Please review the PR and merge when ready."

          node scripts/linear-helper.mjs add-comment \\
            "\${{ matrix.ticket_id }}" \\
            "$COMMENT"

      - name: Revert status on failure
        if: failure()
        env:
          LINEAR_API_KEY: \${{ secrets.LINEAR_API_KEY }}
        run: |
          node scripts/linear-helper.mjs update-status \\
            "\${{ matrix.ticket_id }}" \\
            "Ready for Dev"

          COMMENT="❌ Implementation workflow failed. Status reverted to 'Ready for Dev'.

          Please check the GitHub Actions logs: \${{ github.server_url }}/\${{ github.repository }}/actions/runs/\${{ github.run_id }}"

          node scripts/linear-helper.mjs add-comment \\
            "\${{ matrix.ticket_id }}" \\
            "$COMMENT"
`;

async function createWorkflowFiles(targetDir = '.') {
  try {
    const workflowsDir = join(targetDir, '.github', 'workflows');
    const scriptsDir = join(targetDir, 'scripts');

    // Create directories
    await fs.mkdir(workflowsDir, { recursive: true });
    await fs.mkdir(scriptsDir, { recursive: true });
    console.log(`✓ Created directory: ${workflowsDir}`);
    console.log(`✓ Created directory: ${scriptsDir}\n`);

    // Check if package.json exists
    const packageJsonPath = join(targetDir, 'package.json');
    let packageJsonExists = false;
    try {
      await fs.access(packageJsonPath);
      packageJsonExists = true;
    } catch {
      // File doesn't exist
    }

    // Create or update package.json
    if (packageJsonExists) {
      console.log('⚠️  package.json already exists');
      console.log('   Please ensure it includes: "@linear/sdk": "^33.0.0"\n');
    } else {
      const packageJson = {
        name: "linear-automation",
        version: "1.0.0",
        description: "Linear ticket automation with humanlayer-clone plugin",
        type: "module",
        scripts: {
          "linear": "node scripts/linear-helper.mjs"
        },
        dependencies: {
          "@linear/sdk": "^33.0.0"
        },
        keywords: ["linear", "automation", "claude"],
        license: "Apache-2.0"
      };

      await fs.writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2));
      console.log('✓ Created: package.json\n');
    }

    // Copy linear-helper.mjs to user's scripts directory
    const pluginScriptsDir = dirname(__dirname);
    const sourceHelper = join(pluginScriptsDir, 'linear-helper.mjs');
    const targetHelper = join(scriptsDir, 'linear-helper.mjs');

    try {
      const helperContent = await fs.readFile(sourceHelper, 'utf-8');
      await fs.writeFile(targetHelper, helperContent);
      await fs.chmod(targetHelper, 0o755);
      console.log('✓ Created: scripts/linear-helper.mjs\n');
    } catch (err) {
      console.log('⚠️  Could not copy linear-helper.mjs from plugin');
      console.log('   You may need to copy it manually from the plugin directory\n');
    }

    // Write workflow files
    const files = [
      { name: 'linear-research-tickets.yml', content: RESEARCH_WORKFLOW },
      { name: 'linear-create-plan.yml', content: PLAN_WORKFLOW },
      { name: 'linear-implement-plan.yml', content: IMPLEMENT_WORKFLOW }
    ];

    for (const file of files) {
      const filePath = join(workflowsDir, file.name);
      await fs.writeFile(filePath, file.content);
      console.log(`✓ Created: .github/workflows/${file.name}`);
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ GitHub Actions Setup Complete!\n');

    console.log('Created files:');
    console.log('  - package.json (if not already present)');
    console.log('  - scripts/linear-helper.mjs');
    files.forEach(f => console.log(`  - .github/workflows/${f.name}`));

    console.log('\nNext steps:');
    console.log('1. Install dependencies: npm install');
    console.log('2. Setup Linear workflow states: node scripts/linear-helper.mjs setup-workflow');
    console.log('3. Configure GitHub Secrets (Settings → Secrets → Actions):');
    console.log('   - LINEAR_API_KEY');
    console.log('   - ANTHROPIC_API_KEY');
    console.log('4. Commit files: git add package.json scripts/ .github/workflows/ && git commit');
    console.log('5. Push and test: git push && gh workflow run linear-research-tickets.yml -f num_tickets=1');

  } catch (error) {
    console.error('Error setting up GitHub Actions:', error.message);
    process.exit(1);
  }
}

// CLI interface
const targetDir = process.argv[2] || '.';

console.log('🔧 Setting up GitHub Actions workflows for Linear automation...\n');
console.log(`Target directory: ${targetDir}\n`);

createWorkflowFiles(targetDir);
