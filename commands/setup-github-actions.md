---
description: Setup GitHub Actions workflows for Linear ticket automation

---

# Setup GitHub Actions Workflows

I'll help you set up GitHub Actions workflows for automating Linear ticket progression through the Research → Plan → Implementation lifecycle.

## What This Command Does

This command creates all the necessary files for GitHub Actions automation in your repository:

1. **`package.json`** (if not already present)
   - Declares `@linear/sdk` dependency
   - Required for GitHub Actions to install Linear SDK

2. **`scripts/linear-helper.mjs`**
   - Copy of the Linear API helper script
   - Used by workflows to interact with Linear

3. **`.github/workflows/linear-research-tickets.yml`**
   - Automates research phase for Linear tickets
   - Runs `/humanlayer-clone:research` command on tickets in "Research Needed" status
   - Commits research documents and updates Linear tickets

4. **`.github/workflows/linear-create-plan.yml`**
   - Automates planning phase
   - Creates implementation plans based on research
   - Runs `/humanlayer-clone:plan` command on tickets in "Ready for Plan" status

5. **`.github/workflows/linear-implement-plan.yml`**
   - Automates implementation phase
   - Executes plans and creates pull requests
   - Runs `/humanlayer-clone:implement` command on tickets in "Ready for Dev" status

## Why This Command Exists

When you install the humanlayer-clone plugin, you get the commands (`/humanlayer-clone:research`, `/humanlayer-clone:plan`, `/humanlayer-clone:implement`) and agents, but:
- GitHub Actions workflow files aren't included (not part of plugin structure)
- `package.json` isn't included (plugins don't install npm dependencies)
- `scripts/linear-helper.mjs` needs to be in your repository (not the plugin)

This command copies all necessary files from the plugin to your repository so GitHub Actions can use them.

## Prerequisites

Before running this command:

1. **Plugin installed** in your project
2. **Git repository** initialized
3. **Node.js and npm** installed

After running this command, you'll also need:

4. **GitHub Secrets configured** (LINEAR_API_KEY, ANTHROPIC_API_KEY)
5. **Linear workspace setup** with required workflow states
6. **"LinearLayer (Claude)" bot user** created in Linear

## Running the Setup

I'll now create the GitHub Actions workflow files in your repository.

```bash
node scripts/setup-github-actions.mjs
```

This will create:
- `package.json` (if not present)
- `scripts/linear-helper.mjs`
- `.github/workflows/linear-research-tickets.yml`
- `.github/workflows/linear-create-plan.yml`
- `.github/workflows/linear-implement-plan.yml`

---

## Executing Setup

Let me run the setup script for you...

Would you like me to proceed with creating the GitHub Actions workflows?

If yes, I'll execute:
```bash
node scripts/setup-github-actions.mjs .
```

This will create all necessary workflow files in your `.github/workflows/` directory.

---

## After Setup

Once the workflows are created, complete these steps:

### 1. Install Dependencies

```bash
npm install
```

This installs the `@linear/sdk` package needed by the workflows.

### 2. Setup Linear Workspace

The workflows expect these Linear statuses to exist:
- "Research Needed"
- "Research in Progress"
- "Research in Review"
- "Ready for Plan"
- "Plan in Progress"
- "Plan in Review"
- "Ready for Dev"
- "In Dev"
- "Code Review"

If you need to create these statuses, you can use:
```bash
export LINEAR_API_KEY=your_linear_api_key
node scripts/linear-helper.mjs setup-workflow
```

Or run the `/setup-linear` command if available.

### 3. Configure GitHub Secrets

Go to your repository: Settings → Secrets and variables → Actions

Add these secrets:

| Secret Name | Value | Where to Get It |
|-------------|-------|----------------|
| `LINEAR_API_KEY` | Your Linear API key | Linear → Settings → API → Personal API Keys |
| `ANTHROPIC_API_KEY` | Your Claude API key | https://console.anthropic.com/ |

**Note:** `GITHUB_TOKEN` is automatically provided by GitHub Actions.

### 4. Setup Linear Assignee

The workflows filter tickets by assignee. You can either:

**Option A: Use your personal account**
- The workflows are currently configured to use "Yanhong Zhao"
- Update the assignee in the workflow files to match your Linear username

**Option B: Create a bot user** (recommended for teams)
- Go to Linear Settings → Members
- Invite a new member: `linearbot@yourdomain.com`
- Set display name to "LinearLayer (Claude)"
- Assign to your team
- Update the workflow files to use this bot name as the assignee

### 5. Test the Workflows

**Create a test ticket:**
1. Create new issue in Linear
2. Assign to the user configured in your workflows (default: "Yanhong Zhao")
3. Set status to "Research Needed"

**Run the research workflow:**
```bash
gh workflow run linear-research-tickets.yml -f num_tickets=1
```

**Monitor execution:**
```bash
gh run list --workflow=linear-research-tickets.yml
gh run watch <run-id>
```

## Workflow Architecture

Your GitHub Actions will follow this automation flow:

```
┌─────────────────────────────────────┐
│  linear-research-tickets.yml       │
├─────────────────────────────────────┤
│ 1. Fetch tickets (Research Needed)  │
│ 2. Update → Research in Progress    │
│ 3. Run /humanlayer-clone:research    │
│ 4. Commit to thoughts/               │
│ 5. Update → Research in Review       │
│ 6. Add comment with link             │
└─────────────────────────────────────┘
              ↓
      (Manual Approval)
              ↓
┌─────────────────────────────────────┐
│  linear-create-plan.yml             │
├─────────────────────────────────────┤
│ 1. Fetch tickets (Ready for Plan)   │
│ 2. Update → Plan in Progress         │
│ 3. Locate research document          │
│ 4. Run /humanlayer-clone:plan        │
│ 5. Commit to thoughts/               │
│ 6. Update → Plan in Review           │
│ 7. Add comment with link             │
└─────────────────────────────────────┘
              ↓
      (Manual Approval)
              ↓
┌─────────────────────────────────────┐
│  linear-implement-plan.yml          │
├─────────────────────────────────────┤
│ 1. Fetch tickets (Ready for Dev)    │
│ 2. Create/checkout git branch        │
│ 3. Update → In Dev                   │
│ 4. Locate plan document              │
│ 5. Run /humanlayer-clone:implement   │
│ 6. Commit implementation             │
│ 7. Create pull request               │
│ 8. Link PR to Linear                 │
│ 9. Update → Code Review              │
└─────────────────────────────────────┘
```

## Customizing the Workflows

The generated workflows can be customized for your needs:

### Change the Assignee Name

The workflows currently use `"Yanhong Zhao"` as the assignee. To use a different assignee (like a bot account), edit the workflow files and update:

```yaml
--assignee "Your Bot Name"
```

For example, to use a bot account named "LinearLayer (Claude)":

```yaml
--assignee "LinearLayer (Claude)"
```

### Update Status Names

If your Linear workspace uses different status names, update them in the workflow files:

```yaml
--status "Your Custom Status Name"
```

**Important:** Status names are case-sensitive and must match exactly. The workflows use:
- Research: "Research Needed" → "Research in Progress" → "Research in Review" → "Ready for Plan"
- Planning: "Ready for Plan" → "Plan in Progress" → "Plan in Review" → "Ready for Dev"
- Implementation: "Ready for Dev" → "In Dev" → "Code Review"

### Change Base Branch

To target a different branch for PRs (e.g., `develop`):

```yaml
--base develop \
```

### Adjust Ticket Limits

Change the default number of tickets processed:

```yaml
default: '5'  # Instead of '10'
```

## Triggering Workflows

### Manual Trigger (Recommended)

```bash
# Research workflow
gh workflow run linear-research-tickets.yml -f num_tickets=10

# Planning workflow
gh workflow run linear-create-plan.yml -f num_tickets=5

# Implementation workflow
gh workflow run linear-implement-plan.yml -f num_tickets=2
```

### Via GitHub UI

1. Go to repository → Actions tab
2. Select workflow from left sidebar
3. Click "Run workflow" button
4. Enter number of tickets
5. Click "Run workflow"

### Scheduled Runs (Optional)

To run automatically, add a schedule trigger to the workflow:

```yaml
on:
  workflow_dispatch:
    # ... existing inputs ...
  schedule:
    - cron: '0 9 * * 1-5'  # 9 AM weekdays
```

## Troubleshooting

### Workflows not appearing

**Cause:** Workflows need to be committed to the default branch.

**Fix:**
```bash
git add .github/workflows/
git commit -m "Add Linear automation workflows"
git push origin main
```

### "LINEAR_API_KEY not found"

**Cause:** Secret not configured.

**Fix:**
1. Go to Settings → Secrets → Actions
2. Add `LINEAR_API_KEY` with your API key
3. Re-run workflow

### "No tickets found"

**Cause:** No tickets match the filters.

**Fix:**
1. Verify tickets are assigned to the correct user (check assignee in workflow files)
2. Check status names match exactly (case-sensitive: "Research in Review" not "Research In Review")
3. Test query locally:
   ```bash
   node scripts/linear-helper.mjs list-issues --status "Research Needed" --assignee "Your Assignee Name"
   ```

### "Research document not found"

**Cause:** Planning/implementation workflow can't find prior document.

**Fix:**
1. Ensure research workflow completed successfully first
2. Check `thoughts/shared/research/` directory exists
3. Verify filename includes ticket ID

### Claude Code not available in CI

**Cause:** Claude Code CLI not installed in GitHub Actions runner.

**Fix:**
The workflows install Claude Code CLI automatically:
```bash
npm install -g @anthropic-ai/claude-code
```

They also configure it with the required API settings in the "Setup Claude Code" step. Make sure your `Z_AI_API_KEY` secret is properly configured if you're using a custom API endpoint.

## How the Workflows Execute Commands

The workflows run Claude Code commands with the `--permission-mode acceptEdits` flag to automatically accept file changes in CI:

```bash
echo "$PROMPT" | claude /humanlayer-clone:research --permission-mode acceptEdits
echo "$PROMPT" | claude /humanlayer-clone:plan --permission-mode acceptEdits
echo "$PROMPT" | claude /humanlayer-clone:implement --permission-mode acceptEdits
```

This allows the workflows to run fully automated without requiring manual approval of edits.

## Linear Helper Commands

The workflows use `scripts/linear-helper.mjs` to interact with Linear. Here are the commands used:

### List Issues
```bash
node scripts/linear-helper.mjs list-issues \
  --status "Research Needed" \
  --assignee "Yanhong Zhao" \
  --limit "10"
```
Returns JSON array of issues matching the filters.

### Get Issue Details
```bash
# Text format for prompts
node scripts/linear-helper.mjs get-issue <ISSUE_ID> --output text

# JSON format for parsing
node scripts/linear-helper.mjs get-issue <ISSUE_ID> --output json
```

### Update Issue Status
```bash
node scripts/linear-helper.mjs update-status <ISSUE_ID> "New Status"
```

### Add Link to Issue
```bash
node scripts/linear-helper.mjs add-link <ISSUE_ID> <URL> --title "Link Title"
```

### Add Comment
```bash
node scripts/linear-helper.mjs add-comment <ISSUE_ID> "Comment text"
```

### Download Images
```bash
node scripts/linear-helper.mjs download-images <ISSUE_ID> --output-dir thoughts/shared/images
```

## Monitoring

### View Workflow Runs

```bash
# List recent runs
gh run list --workflow=linear-research-tickets.yml

# Watch a specific run
gh run watch <run-id>

# View logs
gh run view <run-id> --log

# View logs for specific job
gh run view <run-id> --log --job=<job-id>
```

### Linear Comments

Each workflow adds comments to Linear tickets with:
- Links to research/plan/PR
- Status updates
- Error messages (if failed)

Check Linear ticket comments for execution details.

## Next Steps

After setting up GitHub Actions:

1. ✅ Review generated workflow files in `.github/workflows/`
2. ✅ Commit workflows to your repository
3. ✅ Configure GitHub Secrets
4. ✅ Setup Linear workspace with `/setup-linear`
5. ✅ Create test ticket and run research workflow
6. ✅ Monitor execution and verify results

## Learn More

- **Main Documentation:** README.md → Linear Automation section
- **Linear CLI:** `node scripts/linear-helper.mjs --help`
- **Plugin Commands:** `/humanlayer-clone:research`, `/humanlayer-clone:plan`, `/humanlayer-clone:implement`

---

**Ready to create the GitHub Actions workflows? Let me know!**
