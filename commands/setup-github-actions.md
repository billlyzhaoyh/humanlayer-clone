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
   - Runs `/research` command on tickets in "Research Needed" status
   - Commits research documents and updates Linear tickets

4. **`.github/workflows/linear-create-plan.yml`**
   - Automates planning phase
   - Creates implementation plans based on research
   - Runs `/plan` command on tickets in "Ready for Plan" status

5. **`.github/workflows/linear-implement-plan.yml`**
   - Automates implementation phase
   - Executes plans and creates pull requests
   - Runs `/implement` command on tickets in "Ready for Dev" status

## Why This Command Exists

When you install the humanlayer-clone plugin, you get the commands (`/research`, `/plan`, `/implement`) and agents, but:
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

If you haven't already, create the required Linear workflow states:

```bash
export LINEAR_API_KEY=your_linear_api_key
node scripts/linear-helper.mjs setup-workflow
```

Or run:
```bash
/setup-linear
```

### 3. Configure GitHub Secrets

Go to your repository: Settings → Secrets and variables → Actions

Add these secrets:

| Secret Name | Value | Where to Get It |
|-------------|-------|----------------|
| `LINEAR_API_KEY` | Your Linear API key | Linear → Settings → API → Personal API Keys |
| `ANTHROPIC_API_KEY` | Your Claude API key | https://console.anthropic.com/ |

**Note:** `GITHUB_TOKEN` is automatically provided by GitHub Actions.

### 4. Create "LinearLayer (Claude)" Bot User

In Linear:
- Go to Settings → Members
- Invite a new member: `linearbot@yourdomain.com`
- Set display name to "LinearLayer (Claude)"
- Assign to your team

### 5. Test the Workflows

**Create a test ticket:**
1. Create new issue in Linear
2. Assign to "LinearLayer (Claude)"
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
│ 2. Update → Research In Progress    │
│ 3. Run /research command             │
│ 4. Commit to thoughts/               │
│ 5. Update → Research In Review       │
│ 6. Add comment with link             │
└─────────────────────────────────────┘
              ↓
      (Manual Approval)
              ↓
┌─────────────────────────────────────┐
│  linear-create-plan.yml             │
├─────────────────────────────────────┤
│ 1. Fetch tickets (Ready for Plan)   │
│ 2. Update → Plan In Progress         │
│ 3. Locate research document          │
│ 4. Run /plan command                 │
│ 5. Commit to thoughts/               │
│ 6. Update → Plan In Review           │
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
│ 5. Run /implement command            │
│ 6. Commit implementation             │
│ 7. Create pull request               │
│ 8. Link PR to Linear                 │
│ 9. Update → Code Review              │
└─────────────────────────────────────┘
```

## Customizing the Workflows

The generated workflows can be customized for your needs:

### Change the Bot Name

Edit the workflow files and replace `"LinearLayer (Claude)"` with your bot's name:

```yaml
--assignee "Your Bot Name"
```

### Update Status Names

If your Linear workspace uses different status names, update them:

```yaml
--status "Your Custom Status Name"
```

**Important:** Status names are case-sensitive and must match exactly.

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
1. Verify tickets are assigned to "LinearLayer (Claude)"
2. Check status names match exactly (case-sensitive)
3. Test query locally:
   ```bash
   node scripts/linear-helper.mjs list-issues --status "Research Needed" --assignee "LinearLayer (Claude)"
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
You may need to:
1. Install Claude Code in the workflow
2. Use Claude API directly instead of CLI
3. Run on self-hosted runner with Claude Code installed

See workflow files for the "Setup Claude Code" step.

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
- **Plugin Commands:** `/research`, `/plan`, `/implement`

---

**Ready to create the GitHub Actions workflows? Let me know!**
