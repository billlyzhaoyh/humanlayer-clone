---
description: Setup Linear workspace with required workflow states for automation

---

# Setup Linear Integration

I'll help you set up your Linear workspace with the workflow states required for the humanlayer-clone automation.

## What This Command Does

This command will:

1. **Create Workflow States** - Adds 9 required states to your Linear team:
   - Research phase: Research Needed, Research In Progress, Research In Review
   - Planning phase: Ready for Plan, Plan In Progress, Plan In Review
   - Implementation phase: Ready for Dev, In Dev, Code Review

2. **Configure Colors & Types** - Each state gets appropriate colors and types (backlog, unstarted, started)

3. **Add Descriptions** - Each state includes a description explaining its purpose

4. **Skip Existing States** - Won't duplicate states that already exist

## Prerequisites

Before running this command, ensure you have:

1. **LINEAR_API_KEY environment variable set**
   ```bash
   export LINEAR_API_KEY=your_api_key_here
   ```
   Get your API key from: Linear → Settings → API → Personal API Keys

2. **Admin permissions** in your Linear workspace to create workflow states

3. **Team name** (if you have multiple teams)

## Running the Setup

I'll now run the Linear workflow setup script for you.

**If you have one team:**
```bash
node scripts/linear-helper.mjs setup-workflow
```

**If you have multiple teams:**
```bash
node scripts/linear-helper.mjs setup-workflow --team "Your Team Name"
```

Let me check your Linear configuration and run the setup...

---

## Running Setup

I'm going to execute the setup-workflow command. This will:
- Connect to your Linear workspace using LINEAR_API_KEY
- Detect your team(s)
- Create the required workflow states
- Show you what was created or skipped

**Important**: Make sure your LINEAR_API_KEY environment variable is set before I run this.

Would you like me to proceed with the setup?

If yes, I'll run:
```bash
node scripts/linear-helper.mjs setup-workflow
```

Or specify a team:
```bash
node scripts/linear-helper.mjs setup-workflow --team "Engineering"
```

---

## After Setup

Once the workflow states are created, you'll need to:

### 1. Create or Configure "LinearLayer (Claude)" Bot User

**Option A: Create a new user**
- Go to Linear → Settings → Members
- Invite a new member with email like `linearbot@yourdomain.com`
- Set display name to "LinearLayer (Claude)"
- Assign to your team

**Option B: Use existing user**
- Rename an existing bot/test user to "LinearLayer (Claude)"
- Ensure it has access to your team

### 2. Configure GitHub Secrets

Add these secrets to your repository (Settings → Secrets → Actions):

```bash
LINEAR_API_KEY=your_linear_api_key
ANTHROPIC_API_KEY=your_claude_api_key
```

### 3. Test the Setup

**Verify workflow states:**
```bash
node scripts/linear-helper.mjs list-states
```

**Create a test ticket:**
1. Create a new issue in Linear
2. Assign to "LinearLayer (Claude)"
3. Set status to "Research Needed"

**Run the research workflow:**
```bash
gh workflow run linear-research-tickets.yml -f num_tickets=1
```

### 4. Workflow Architecture

Your Linear workflow will now follow this progression:

```
┌─────────────────┐
│ Research Phase  │
└─────────────────┘
Research Needed
      ↓ (automated)
Research In Progress
      ↓ (automated)
Research In Review
      ↓ (manual approval)

┌─────────────────┐
│ Planning Phase  │
└─────────────────┘
Ready for Plan
      ↓ (automated)
Plan In Progress
      ↓ (automated)
Plan In Review
      ↓ (manual approval)

┌──────────────────────┐
│ Implementation Phase │
└──────────────────────┘
Ready for Dev
      ↓ (automated)
In Dev
      ↓ (automated)
Code Review
      ↓ (manual merge)
Done
```

**Automated transitions** are handled by GitHub Actions workflows.

**Manual gates** require human review:
- Research In Review → Ready for Plan (approve research quality)
- Plan In Review → Ready for Dev (approve implementation plan)

## Troubleshooting

### "LINEAR_API_KEY not found"
```bash
export LINEAR_API_KEY=lin_api_...
```

### "Multiple teams found"
Specify your team:
```bash
node scripts/linear-helper.mjs setup-workflow --team "Engineering"
```

List available teams:
```bash
node scripts/linear-helper.mjs list-states
```

### "Permission denied"
Ensure your API key has admin permissions to create workflow states.

### States already exist
The script will skip existing states. You can:
- Manually delete conflicting states in Linear
- Or use the existing states (they'll work even with different names if you update workflows)

## Next Steps

After setup is complete:

1. ✅ Read the [Linear Automation section in README.md](../README.md#linear-automation)
2. ✅ Review [workflow documentation](.github/workflows/README.md)
3. ✅ Configure GitHub repository secrets
4. ✅ Create test ticket and run research workflow
5. ✅ Monitor workflow execution in GitHub Actions

---

**Ready to proceed with setup? Let me know!**
