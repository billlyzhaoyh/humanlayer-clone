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
        run: npm install --prefix scripts

      - name: Fetch tickets
        id: get-tickets
        env:
          LINEAR_API_KEY: \${{ secrets.LINEAR_API_KEY }}
        run: |
          # Get tickets in "Research Needed" status assigned to "Yanhong Zhao"
          TICKETS=$(node scripts/linear-helper.mjs list-issues \\
            --status "Research Needed" \\
            --assignee "Yanhong Zhao" \\
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
    permissions:
      contents: write
      pull-requests: write
    strategy:
      matrix:
        ticket_id: \${{ fromJson(needs.fetch-tickets.outputs.tickets) }}
      fail-fast: false
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4
        with:
          fetch-depth: 0  # Fetch all history for branch operations

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm install --prefix scripts

      - name: Install Claude Code CLI
        run: npm install -g @anthropic-ai/claude-code

      - name: Setup Claude Code
        env:
          Z_AI_API_KEY: \${{ secrets.Z_AI_API_KEY }}
        run: |
          mkdir -p ~/.claude
          cat > ~/.claude/settings.json << EOF
          {
            "env": {
              "ANTHROPIC_AUTH_TOKEN": "$Z_AI_API_KEY",
              "ANTHROPIC_BASE_URL": "https://api.z.ai/api/anthropic",
              "API_TIMEOUT_MS": "3000000",
              "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC": 1
            }
          }
          EOF

      - name: Install human-layer-clone plugin
        run: |
          claude /plugin marketplace add billlyzhaoyh/humanlayer-clone
          claude /plugin install humanlayer-clone@billlyzhaoyh

      - name: Update ticket status to "Research in Progress"
        env:
          LINEAR_API_KEY: \${{ secrets.LINEAR_API_KEY }}
        run: |
          node scripts/linear-helper.mjs update-status \\
            "\${{ matrix.ticket_id }}" \\
            "Research in Progress"

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

          # Also get branch name if exists and save full JSON for PR
          TICKET_JSON=$(node scripts/linear-helper.mjs get-issue \\
            "\${{ matrix.ticket_id }}" \\
            --output json)

          # Save ticket JSON for PR description
          echo "$TICKET_JSON" | jq -r '.' > ticket-details.json

          BRANCH_NAME=$(echo "$TICKET_JSON" | jq -r '.branchName // ""')

          # Generate branch name if not set: research/KIN-5 format
          if [ -z "$BRANCH_NAME" ]; then
            BRANCH_NAME="research/\${{ matrix.ticket_id }}"
          else
            # Ensure branch name starts with research/ prefix
            if [[ ! "$BRANCH_NAME" =~ ^research/ ]]; then
              BRANCH_NAME="research/$BRANCH_NAME"
            fi
          fi

          echo "branch_name=$BRANCH_NAME" >> $GITHUB_OUTPUT
          echo "Ticket details saved to ticket-details.txt"

      - name: Download ticket images
        env:
          LINEAR_API_KEY: \${{ secrets.LINEAR_API_KEY }}
        run: |
          mkdir -p thoughts/shared/images
          node scripts/linear-helper.mjs download-images \\
            "\${{ matrix.ticket_id }}" \\
            --output-dir thoughts/shared/images || echo "No images to download"

      - name: Create research directory structure
        run: |
          # Create all necessary directories with proper permissions
          mkdir -p thoughts/shared/research
          mkdir -p thoughts/shared/plans
          mkdir -p thoughts/shared/images
          # Ensure directories are writable
          chmod -R 755 thoughts/shared

      - name: Run research command
        id: research
        run: |
          # Prepare research prompt
          RESEARCH_PROMPT="Research Linear ticket \${{ matrix.ticket_id }}:

          $(cat ticket-details.txt)

          Please conduct deep codebase research to understand:
          1. Current implementation relevant to this ticket
          2. Related components and dependencies
          3. Existing patterns we should follow
          4. Technical context needed for planning

          Create research document: thoughts/shared/research/$(date +%Y-%m-%d)-\${{ matrix.ticket_id }}-$(echo '\${{ matrix.ticket_id }}' | tr '[:upper:]' '[:lower:]').md"

          # Run Claude Code with /research command
          echo "$RESEARCH_PROMPT" | claude /humanlayer-clone:research \\
            --permission-mode acceptEdits || {
            echo "Research command failed"
            exit 1
          }

          # Find the created research document
          RESEARCH_DOC=$(find thoughts/shared/research -name "*\${{ matrix.ticket_id }}*" -type f | head -1)
          echo "research_doc=$RESEARCH_DOC" >> $GITHUB_OUTPUT

      - name: Prepare PR description
        id: pr-description
        run: |
          # Get ticket details for PR description
          TICKET_TITLE=$(cat ticket-details.json | jq -r '.title')
          TICKET_URL=$(cat ticket-details.json | jq -r '.url')
          RESEARCH_DOC="\${{ steps.research.outputs.research_doc }}"
          REPO_URL="\${{ github.server_url }}/\${{ github.repository }}"
          BRANCH="\${{ steps.ticket-info.outputs.branch_name }}"

          # Create PR title and description
          PR_TITLE="[\${{ matrix.ticket_id }}] Research: $TICKET_TITLE"
          PR_BODY="## Linear Ticket: \${{ matrix.ticket_id }}

          **Title**: $TICKET_TITLE
          **Link**: $TICKET_URL

          ## Research Document

          This PR contains research findings for the ticket.
          Research document: [$RESEARCH_DOC]($REPO_URL/blob/$BRANCH/$RESEARCH_DOC)

          ## Review

          Please review the research findings and move the ticket to 'Ready for Plan' when approved.

          ---
          🤖 Auto-generated by LinearLayer workflow"

          # Save to files for use in PR creation
          echo "$PR_BODY" > pr-body.txt
          echo "$PR_TITLE" > pr-title.txt
          echo "pr_title=$PR_TITLE" >> $GITHUB_OUTPUT

      - name: Create Pull Request
        id: create-pr
        uses: peter-evans/create-pull-request@v7
        with:
          token: \${{ github.token }}
          commit-message: "Research for \${{ matrix.ticket_id }}"
          committer: LinearLayer Bot <linearbot@github.actions>
          author: \${{ github.actor }} <\${{ github.actor_id }}+\${{ github.actor }}@users.noreply.github.com>
          branch: \${{ steps.ticket-info.outputs.branch_name }}
          title: \${{ steps.pr-description.outputs.pr_title }}
          body-path: pr-body.txt
          add-paths: |
            thoughts/shared/research/*.md
            thoughts/shared/images/

      - name: Reinstall helper dependencies
        if: steps.create-pr.outputs.pull-request-operation == 'created' || steps.create-pr.outputs.pull-request-operation == 'updated'
        run: npm install --prefix scripts

      - name: Update ticket status to "Research in Review"
        if: steps.create-pr.outputs.pull-request-operation == 'created' || steps.create-pr.outputs.pull-request-operation == 'updated'
        env:
          LINEAR_API_KEY: \${{ secrets.LINEAR_API_KEY }}
        run: |
          node scripts/linear-helper.mjs update-status \\
            "\${{ matrix.ticket_id }}" \\
            "Research in Review"

      - name: Add PR link to Linear ticket
        if: steps.create-pr.outputs.pull-request-operation == 'created' || steps.create-pr.outputs.pull-request-operation == 'updated'
        env:
          LINEAR_API_KEY: \${{ secrets.LINEAR_API_KEY }}
        run: |
          PR_URL="\${{ steps.create-pr.outputs.pull-request-url }}"

          node scripts/linear-helper.mjs add-link \\
            "\${{ matrix.ticket_id }}" \\
            "$PR_URL" \\
            --title "Research PR"

      - name: Add comment with research link
        if: steps.create-pr.outputs.pull-request-operation == 'created' || steps.create-pr.outputs.pull-request-operation == 'updated'
        env:
          LINEAR_API_KEY: \${{ secrets.LINEAR_API_KEY }}
        run: |
          RESEARCH_DOC="\${{ steps.research.outputs.research_doc }}"
          PR_URL="\${{ steps.create-pr.outputs.pull-request-url }}"
          BRANCH="\${{ steps.create-pr.outputs.pull-request-branch }}"
          REPO_URL="\${{ github.server_url }}/\${{ github.repository }}"

          COMMENT="✅ Research completed successfully!

          🔀 Pull Request: $PR_URL
          📄 Research document: [$RESEARCH_DOC]($REPO_URL/blob/$BRANCH/$RESEARCH_DOC)

          Status updated to 'Research in Review'. Please review the PR and move to 'Ready for Plan' when approved."

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
        run: npm install --prefix scripts

      - name: Fetch tickets
        id: get-tickets
        env:
          LINEAR_API_KEY: \${{ secrets.LINEAR_API_KEY }}
        run: |
          # Get tickets in "Ready for Plan" status
          TICKETS=$(node scripts/linear-helper.mjs list-issues \\
            --status "Ready for Plan" \\
            --assignee "Yanhong Zhao" \\
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
    permissions:
      contents: write
      pull-requests: write
    strategy:
      matrix:
        ticket_id: \${{ fromJson(needs.fetch-tickets.outputs.tickets) }}
      fail-fast: false
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm install --prefix scripts

      - name: Install Claude Code CLI
        run: npm install -g @anthropic-ai/claude-code

      - name: Setup Claude Code
        env:
          Z_AI_API_KEY: \${{ secrets.Z_AI_API_KEY }}
        run: |
          mkdir -p ~/.claude
          cat > ~/.claude/settings.json << EOF
          {
            "env": {
              "ANTHROPIC_AUTH_TOKEN": "$Z_AI_API_KEY",
              "ANTHROPIC_BASE_URL": "https://api.z.ai/api/anthropic",
              "API_TIMEOUT_MS": "3000000",
              "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC": 1
            }
          }
          EOF

      - name: Install human-layer-clone plugin
        run: |
          claude /plugin marketplace add billlyzhaoyh/humanlayer-clone
          claude /plugin install humanlayer-clone@billlyzhaoyh

      - name: Update ticket status to "Plan in Progress"
        env:
          LINEAR_API_KEY: \${{ secrets.LINEAR_API_KEY }}
        run: |
          node scripts/linear-helper.mjs update-status \\
            "\${{ matrix.ticket_id }}" \\
            "Plan in Progress"

      - name: Get ticket details
        id: ticket-info
        env:
          LINEAR_API_KEY: \${{ secrets.LINEAR_API_KEY }}
        run: |
          # Get ticket details in text format
          TICKET_INFO=$(node scripts/linear-helper.mjs get-issue \\
            "\${{ matrix.ticket_id }}" \\
            --output text)
          echo "$TICKET_INFO" > ticket-details.txt

          # Also get branch name if exists and save full JSON for PR
          TICKET_JSON=$(node scripts/linear-helper.mjs get-issue \\
            "\${{ matrix.ticket_id }}" \\
            --output json)

          # Save ticket JSON for PR description
          echo "$TICKET_JSON" | jq -r '.' > ticket-details.json

          BRANCH_NAME=$(echo "$TICKET_JSON" | jq -r '.branchName // ""')

          # Generate branch name if not set: plan/KIN-5 format
          if [ -z "$BRANCH_NAME" ]; then
            BRANCH_NAME="plan/\${{ matrix.ticket_id }}"
          else
            # Ensure branch name starts with plan/ prefix
            if [[ ! "$BRANCH_NAME" =~ ^plan/ ]]; then
              BRANCH_NAME="plan/$BRANCH_NAME"
            fi
          fi

          echo "branch_name=$BRANCH_NAME" >> $GITHUB_OUTPUT
          echo "Ticket details saved to ticket-details.txt"

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

      - name: Create plans directory structure
        run: |
          # Create all necessary directories with proper permissions
          mkdir -p thoughts/shared/research
          mkdir -p thoughts/shared/plans
          mkdir -p thoughts/shared/images
          # Ensure directories are writable
          chmod -R 755 thoughts/shared

      - name: Run plan command
        id: plan
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

          # Run Claude Code with /humanlayer-clone:plan command
          echo "$PLAN_PROMPT" | claude /humanlayer-clone:plan \\
            --permission-mode acceptEdits || {
            echo "Plan command failed"
            exit 1
          }

          # Find the created plan document
          PLAN_DOC=$(find thoughts/shared/plans -name "*\${{ matrix.ticket_id }}*" -type f | head -1)
          echo "plan_doc=$PLAN_DOC" >> $GITHUB_OUTPUT

      - name: Prepare PR description
        id: pr-description
        run: |
          # Get ticket details for PR description
          TICKET_TITLE=$(cat ticket-details.json | jq -r '.title')
          TICKET_URL=$(cat ticket-details.json | jq -r '.url')
          PLAN_DOC="\${{ steps.plan.outputs.plan_doc }}"
          RESEARCH_DOC="\${{ steps.research-doc.outputs.research_path }}"
          REPO_URL="\${{ github.server_url }}/\${{ github.repository }}"
          BRANCH="\${{ steps.ticket-info.outputs.branch_name }}"

          # Create PR title and description
          PR_TITLE="[\${{ matrix.ticket_id }}] Plan: $TICKET_TITLE"
          PR_BODY="## Linear Ticket: \${{ matrix.ticket_id }}

          **Title**: $TICKET_TITLE
          **Link**: $TICKET_URL

          ## Implementation Plan

          This PR contains the implementation plan for the ticket.
          Plan document: [$PLAN_DOC]($REPO_URL/blob/$BRANCH/$PLAN_DOC)

          ## Research Document

          Based on research findings:
          Research document: [$RESEARCH_DOC]($REPO_URL/blob/$BRANCH/$RESEARCH_DOC)

          ## Review

          Please review the plan and move the ticket to 'Ready for Dev' when approved.

          ---
          🤖 Auto-generated by LinearLayer workflow"

          # Save to files for use in PR creation
          echo "$PR_BODY" > pr-body.txt
          echo "$PR_TITLE" > pr-title.txt
          echo "pr_title=$PR_TITLE" >> $GITHUB_OUTPUT

      - name: Create Pull Request
        id: create-pr
        uses: peter-evans/create-pull-request@v7
        with:
          token: \${{ github.token }}
          commit-message: "Plan for \${{ matrix.ticket_id }}"
          committer: LinearLayer Bot <linearbot@github.actions>
          author: \${{ github.actor }} <\${{ github.actor_id }}+\${{ github.actor }}@users.noreply.github.com>
          branch: \${{ steps.ticket-info.outputs.branch_name }}
          title: \${{ steps.pr-description.outputs.pr_title }}
          body-path: pr-body.txt
          add-paths: |
            thoughts/shared/plans/*.md

      - name: Reinstall helper dependencies
        if: steps.create-pr.outputs.pull-request-operation == 'created' || steps.create-pr.outputs.pull-request-operation == 'updated'
        run: npm install --prefix scripts

      - name: Update ticket status to "Plan in Review"
        if: steps.create-pr.outputs.pull-request-operation == 'created' || steps.create-pr.outputs.pull-request-operation == 'updated'
        env:
          LINEAR_API_KEY: \${{ secrets.LINEAR_API_KEY }}
        run: |
          node scripts/linear-helper.mjs update-status \\
            "\${{ matrix.ticket_id }}" \\
            "Plan in Review"

      - name: Add PR link to Linear ticket
        if: steps.create-pr.outputs.pull-request-operation == 'created' || steps.create-pr.outputs.pull-request-operation == 'updated'
        env:
          LINEAR_API_KEY: \${{ secrets.LINEAR_API_KEY }}
        run: |
          PR_URL="\${{ steps.create-pr.outputs.pull-request-url }}"

          node scripts/linear-helper.mjs add-link \\
            "\${{ matrix.ticket_id }}" \\
            "$PR_URL" \\
            --title "Plan PR"

      - name: Add comment with plan link
        if: steps.create-pr.outputs.pull-request-operation == 'created' || steps.create-pr.outputs.pull-request-operation == 'updated'
        env:
          LINEAR_API_KEY: \${{ secrets.LINEAR_API_KEY }}
        run: |
          PLAN_DOC="\${{ steps.plan.outputs.plan_doc }}"
          RESEARCH_DOC="\${{ steps.research-doc.outputs.research_path }}"
          PR_URL="\${{ steps.create-pr.outputs.pull-request-url }}"
          BRANCH="\${{ steps.create-pr.outputs.pull-request-branch }}"
          REPO_URL="\${{ github.server_url }}/\${{ github.repository }}"

          COMMENT="✅ Implementation plan created successfully!

          🔀 Pull Request: $PR_URL
          📋 Plan document: [$PLAN_DOC]($REPO_URL/blob/$BRANCH/$PLAN_DOC)
          📄 Research document: [$RESEARCH_DOC]($REPO_URL/blob/$BRANCH/$RESEARCH_DOC)

          Status updated to 'Plan in Review'. Please review the PR and move to 'Ready for Dev' when approved."

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
        run: npm install --prefix scripts

      - name: Fetch tickets
        id: get-tickets
        env:
          LINEAR_API_KEY: \${{ secrets.LINEAR_API_KEY }}
        run: |
          # Get tickets in "Ready for Dev" status
          TICKETS=$(node scripts/linear-helper.mjs list-issues \\
            --status "Ready for Dev" \\
            --assignee "Yanhong Zhao" \\
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
    permissions:
      contents: write
      pull-requests: write
    strategy:
      matrix:
        ticket_id: \${{ fromJson(needs.fetch-tickets.outputs.tickets) }}
      fail-fast: false
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4
        with:
          fetch-depth: 0  # Fetch all history for branch operations

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm install --prefix scripts

      - name: Install Claude Code CLI
        run: npm install -g @anthropic-ai/claude-code

      - name: Setup Claude Code
        env:
          Z_AI_API_KEY: \${{ secrets.Z_AI_API_KEY }}
        run: |
          mkdir -p ~/.claude
          cat > ~/.claude/settings.json << EOF
          {
            "env": {
              "ANTHROPIC_AUTH_TOKEN": "$Z_AI_API_KEY",
              "ANTHROPIC_BASE_URL": "https://api.z.ai/api/anthropic",
              "API_TIMEOUT_MS": "3000000",
              "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC": 1
            }
          }
          EOF

      - name: Install human-layer-clone plugin
        run: |
          claude /plugin marketplace add billlyzhaoyh/humanlayer-clone
          claude /plugin install humanlayer-clone@billlyzhaoyh

      - name: Get ticket details and branch
        id: ticket-info
        env:
          LINEAR_API_KEY: \${{ secrets.LINEAR_API_KEY }}
        run: |
          TICKET_JSON=$(node scripts/linear-helper.mjs get-issue \\
            "\${{ matrix.ticket_id }}" \\
            --output json)

          # Get branch name or generate one
          BRANCH_NAME_RAW=$(echo "$TICKET_JSON" | jq -r '.branchName // ""')
          # Strip owner prefix if Linear stored branch as owner/branch
          BRANCH_NAME=$(echo "$BRANCH_NAME_RAW" | sed 's#.*/##')

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

      - name: Run implement command
        id: implement
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

          # Run Claude Code with /humanlayer-clone:implement command
          echo "$IMPLEMENT_PROMPT" | claude /humanlayer-clone:implement \\
            --permission-mode acceptEdits || {
            echo "Implementation command failed"
            exit 1
          }

          echo "Implementation completed"

      - name: Prepare PR description
        id: pr-description
        run: |
          # Get ticket details for PR description
          TICKET_TITLE=$(cat ticket-details.json | jq -r '.title')
          TICKET_URL=$(cat ticket-details.json | jq -r '.url')
          PLAN_DOC="\${{ steps.plan-doc.outputs.plan_path }}"
          REPO_URL="\${{ github.server_url }}/\${{ github.repository }}"
          BRANCH="\${{ steps.ticket-info.outputs.branch_name }}"

          PR_TITLE="[\${{ matrix.ticket_id }}] Implement: $TICKET_TITLE"
          PR_BODY="## Linear Ticket: \${{ matrix.ticket_id }}

          **Title**: $TICKET_TITLE
          **Link**: $TICKET_URL

          ## Plan

          Following plan: [$PLAN_DOC]($REPO_URL/blob/$BRANCH/$PLAN_DOC)

          ## Summary

          Auto-generated implementation following the approved plan.

          ## Verification

          - [ ] Automated tests (make test, make lint)
          - [ ] Manual verification steps from plan

          ---
          🤖 Auto-generated by LinearLayer workflow"

          echo "$PR_BODY" > pr-body.txt
          echo "$PR_TITLE" > pr-title.txt
          echo "pr_title=$PR_TITLE" >> $GITHUB_OUTPUT

      - name: Create Pull Request
        id: create-pr
        uses: peter-evans/create-pull-request@v7
        with:
          token: \${{ github.token }}
          commit-message: "Implement \${{ matrix.ticket_id }}"
          committer: LinearLayer Bot <linearbot@github.actions>
          author: \${{ github.actor }} <\${{ github.actor_id }}+\${{ github.actor }}@users.noreply.github.com>
          branch: \${{ steps.ticket-info.outputs.branch_name }}
          title: \${{ steps.pr-description.outputs.pr_title }}
          body-path: pr-body.txt

      - name: Reinstall helper dependencies
        if: steps.create-pr.outputs.pull-request-operation == 'created' || steps.create-pr.outputs.pull-request-operation == 'updated'
        run: npm install --prefix scripts

      - name: Add PR link to Linear ticket
        if: steps.create-pr.outputs.pull-request-operation == 'created' || steps.create-pr.outputs.pull-request-operation == 'updated'
        env:
          LINEAR_API_KEY: \${{ secrets.LINEAR_API_KEY }}
        run: |
          PR_URL="\${{ steps.create-pr.outputs.pull-request-url }}"

          node scripts/linear-helper.mjs add-link \\
            "\${{ matrix.ticket_id }}" \\
            "$PR_URL" \\
            --title "Implementation PR"

      - name: Update ticket status to "Code Review"
        if: steps.create-pr.outputs.pull-request-operation == 'created' || steps.create-pr.outputs.pull-request-operation == 'updated'
        env:
          LINEAR_API_KEY: \${{ secrets.LINEAR_API_KEY }}
        run: |
          node scripts/linear-helper.mjs update-status \\
            "\${{ matrix.ticket_id }}" \\
            "Code Review"

      - name: Add comment with PR link
        if: steps.create-pr.outputs.pull-request-operation == 'created' || steps.create-pr.outputs.pull-request-operation == 'updated'
        env:
          LINEAR_API_KEY: \${{ secrets.LINEAR_API_KEY }}
        run: |
          PR_URL="\${{ steps.create-pr.outputs.pull-request-url }}"
          PLAN_DOC="\${{ steps.plan-doc.outputs.plan_path }}"
          BRANCH="\${{ steps.create-pr.outputs.pull-request-branch }}"
          REPO_URL="\${{ github.server_url }}/\${{ github.repository }}"

          COMMENT="✅ Implementation completed successfully!

          🔀 Pull Request: $PR_URL
          🌿 Branch: \\\`$BRANCH\\\`
          📋 Plan: [$PLAN_DOC]($REPO_URL/blob/$BRANCH/$PLAN_DOC)

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
