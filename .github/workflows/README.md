# GitHub Actions Workflows for Linear Integration

This directory contains GitHub Actions workflows that automate Linear ticket progression through the Research → Plan → Implementation lifecycle using the humanlayer-clone plugin.

## Overview

Three workflows work together to automate the complete ticket lifecycle:

1. **linear-research-tickets.yml** - Research phase
2. **linear-create-plan.yml** - Planning phase
3. **linear-implement-plan.yml** - Implementation phase

Each workflow:
- Fetches tickets from Linear by status
- Processes tickets in parallel using matrix strategy
- Updates ticket status at each stage
- Commits results to the repository
- Adds comments to Linear with links and status updates
- Handles failures gracefully by reverting status

## Prerequisites

### 1. Linear Workspace Configuration

Create the following workflow states in your Linear workspace (in order):

**Research Phase:**
- `research needed` - Initial state for tickets requiring research
- `research in progress` - Research workflow is running
- `research in review` - Research complete, awaiting approval

**Planning Phase:**
- `ready for plan` - Research approved, ready for planning
- `plan in progress` - Planning workflow is running
- `plan in review` - Plan complete, awaiting approval

**Implementation Phase:**
- `ready for dev` - Plan approved, ready for implementation
- `in dev` - Implementation workflow is running
- `code review` - PR created, awaiting review

**Important:** Status names are case-sensitive and must match exactly.

### 2. Linear Bot User

Create a user or bot in Linear named **"LinearLayer (Claude)"** (or customize in workflow files):
- Assign tickets to this user for automation
- Workflows filter by this assignee
- Bot should have permissions to update tickets and add comments

### 3. GitHub Repository Secrets

Add the following secrets to your repository:

**Required:**
- `LINEAR_API_KEY` - Your Linear API key
  - Generate at: Settings → API → Personal API Keys
  - Needs read/write access to issues

**Required for Claude Code:**
- `Z_AI_API_KEY` - Z.ai API key to run Claude Code commands
  - Used to run /research, /plan, /implement commands
  - Get from: https://z.ai/
  - I am trying to save money here but equally it will be easy to use the official Claude API if needed.

### 4. Repository Setup

```bash
# Install dependencies
npm install

# Ensure thoughts directories exist
mkdir -p thoughts/shared/{research,plans,images}

# Verify Linear CLI works
export LINEAR_API_KEY=your_key_here
node scripts/linear-helper.mjs list-issues --status "research needed"
```

## Workflow Details

### 1. Research Tickets Workflow

**File:** `linear-research-tickets.yml`

**Purpose:** Automates deep codebase research for Linear tickets

**Trigger:**
```bash
gh workflow run linear-research-tickets.yml
gh workflow run linear-research-tickets.yml -f num_tickets=5
```

**Parameters:**
- `num_tickets` (optional, default: 10) - Maximum tickets to process

**Process:**
1. **Fetch Tickets**
   - Queries Linear for tickets in "research needed" status
   - Filters by assignee "LinearLayer (Claude)"
   - Limits to `num_tickets` parameter

2. **For Each Ticket (Parallel):**
   - Update Linear status → "research in progress"
   - Fetch ticket details (title, description, comments)
   - Download any images → `thoughts/shared/images/`
   - Run `/research` command with ticket context
   - Expected output: `thoughts/shared/research/YYYY-MM-DD-[TICKET-ID]-*.md`
   - Commit research document to repository
   - On success: Update status → "research in review"
   - On failure: Revert status → "research needed"
   - Add comment to Linear with research link or error

**Output:**
- Research documents in `thoughts/shared/research/`
- Git commits with message "Research for [TICKET-ID]"
- Linear comments with links to research documents

### 2. Create Plan Workflow

**File:** `linear-create-plan.yml`

**Purpose:** Creates implementation plans based on research

**Trigger:**
```bash
gh workflow run linear-create-plan.yml
gh workflow run linear-create-plan.yml -f num_tickets=3
```

**Parameters:**
- `num_tickets` (optional, default: 10) - Maximum tickets to process

**Process:**
1. **Fetch Tickets**
   - Queries Linear for tickets in "ready for plan" status
   - Filters by assignee "LinearLayer (Claude)"

2. **For Each Ticket (Parallel):**
   - Update Linear status → "plan in progress"
   - Fetch ticket details
   - **Locate research document** → `thoughts/shared/research/*[TICKET-ID]*.md`
   - Fail if research not found (run research workflow first)
   - Run `/plan` command with ticket + research document
   - Expected output: `thoughts/shared/plans/YYYY-MM-DD-[TICKET-ID]-*.md`
   - Commit plan document to repository
   - On success: Update status → "plan in review"
   - On failure: Revert status → "ready for plan"
   - Add comment with links to both plan and research documents

**Output:**
- Plan documents in `thoughts/shared/plans/`
- Git commits with message "Plan for [TICKET-ID]"
- Linear comments linking plan to research

**Important:** Research workflow must complete successfully before running planning workflow.

### 3. Implement Plan Workflow

**File:** `linear-implement-plan.yml`

**Purpose:** Implements approved plans and creates pull requests

**Trigger:**
```bash
gh workflow run linear-implement-plan.yml
gh workflow run linear-implement-plan.yml -f num_tickets=2
```

**Parameters:**
- `num_tickets` (optional, default: 10) - Maximum tickets to process

**Process:**
1. **Fetch Tickets**
   - Queries Linear for tickets in "ready for dev" status
   - Filters by assignee "LinearLayer (Claude)"

2. **For Each Ticket (Parallel):**
   - Fetch ticket details including `branchName` from Linear
   - Create or checkout git branch
     - Use Linear's suggested branch name if available
     - Otherwise generate: `[TICKET-ID]-description`
   - Update Linear status → "in dev"
   - **Locate plan document** → `thoughts/shared/plans/*[TICKET-ID]*.md`
   - Fail if plan not found (run plan workflow first)
   - Run `/implement` command with plan
   - Commit implementation changes to branch
   - Push branch to origin
   - Create Pull Request via `gh pr create`
     - Title: `[TICKET-ID] Ticket Title`
     - Body: Links to ticket, plan, and verification checklist
     - Base: `main`, Head: feature branch
   - Add PR link to Linear ticket
   - On success: Update status → "code review"
   - On failure: Revert status → "ready for dev"
   - Add comment with PR link or error

**Output:**
- Implementation commits on feature branch
- Pull request created and linked
- Linear ticket updated with PR URL

**Important:**
- Plan workflow must complete successfully first
- Creates one PR per ticket
- PRs target `main` branch (customize if needed)

## Usage Examples

### Complete Lifecycle for One Ticket

```bash
# 1. Assign ticket to "LinearLayer (Claude)" in Linear
# 2. Set ticket status to "research needed"

# 3. Run research (processes up to 10 tickets)
gh workflow run linear-research-tickets.yml

# 4. Review research in Linear comments
# 5. Manually update ticket status to "ready for plan" in Linear

# 6. Run planning
gh workflow run linear-create-plan.yml

# 7. Review plan in Linear comments
# 8. Manually update ticket status to "ready for dev" in Linear

# 9. Run implementation
gh workflow run linear-implement-plan.yml

# 10. Review PR and merge
```

### Batch Processing

```bash
# Process 20 tickets at once (each workflow runs in parallel)
gh workflow run linear-research-tickets.yml -f num_tickets=20

# After review, process plans
gh workflow run linear-create-plan.yml -f num_tickets=20

# After approval, implement
gh workflow run linear-implement-plan.yml -f num_tickets=20
```

### Monitoring

```bash
# List recent workflow runs
gh run list --workflow=linear-research-tickets.yml

# Watch specific run
gh run watch <run-id>

# View logs
gh run view <run-id> --log
```

## Customization

### Change Assignee Filter

Edit the workflow files and replace `"LinearLayer (Claude)"` with your bot name:

```yaml
# In all three workflow files
--assignee "Your Bot Name"
```

### Change Status Names

If your Linear workspace uses different status names, update them in the workflows:

```yaml
# Research workflow
--status "your-research-status"

# Plan workflow
--status "your-plan-status"

# Implement workflow
--status "your-dev-status"
```

### Change Base Branch

To target a different branch for PRs (e.g., `develop`):

```yaml
# In linear-implement-plan.yml
--base develop \
```

### Adjust Parallelism

Workflows use GitHub Actions matrix strategy with `fail-fast: false`, processing all tickets even if some fail. To limit parallelism, adjust the `num_tickets` parameter.

## Troubleshooting

### "LINEAR_API_KEY not found"

**Cause:** Secret not configured in repository

**Fix:**
1. Go to repository Settings → Secrets → Actions
2. Add `LINEAR_API_KEY` with your Linear API key
3. Re-run workflow

### "No tickets found"

**Cause:** No tickets match the status and assignee filter

**Fix:**
1. Verify tickets are assigned to "LinearLayer (Claude)"
2. Check ticket status matches exactly (case-sensitive)
3. Run test query locally:
   ```bash
   node scripts/linear-helper.mjs list-issues --status "research needed" --assignee "LinearLayer (Claude)"
   ```

### "Status 'X' not found"

**Cause:** Status name doesn't match Linear workflow states

**Fix:**
1. Check exact status names in Linear (Settings → Workflows)
2. Update workflow files with correct case-sensitive names
3. Verify status is in the correct team workflow

### "Research/Plan document not found"

**Cause:** Prior workflow step didn't complete successfully

**Fix:**
1. Check previous workflow run logs
2. Ensure research completed before planning
3. Ensure planning completed before implementation
4. Verify `thoughts/shared/{research,plans}/` directories contain documents
5. Check filename includes ticket ID: `*[TICKET-ID]*.md`

### "PR creation failed"

**Cause:** Branch conflicts or insufficient permissions

**Fix:**
1. Check if branch already has a PR
2. Verify `GITHUB_TOKEN` has PR creation permissions
3. Check for merge conflicts on branch
4. Review workflow logs for specific error

### Claude Code command not found

**Cause:** Claude Code CLI not available in CI environment

**Fix:**
The workflows assume `claude` command is available. You may need to:
1. Install Claude Code in CI (add installation step)
2. Use Claude API directly instead of CLI
3. Run workflows on self-hosted runner with Claude Code installed

## Architecture Notes

### Why Parallel Matrix Strategy?

Workflows use matrix strategy to process multiple tickets concurrently:

```yaml
strategy:
  matrix:
    ticket_id: ${{ fromJson(needs.fetch-tickets.outputs.tickets) }}
  fail-fast: false
```

**Benefits:**
- Faster processing (10 tickets in parallel vs sequential)
- One failure doesn't block others (`fail-fast: false`)
- Each ticket gets its own job log

**Considerations:**
- May hit API rate limits with high `num_tickets`
- Each job uses separate runner (GitHub Actions concurrency limits apply)

### Why Commit Thoughts to Repository?

Unlike manual workflows (where `thoughts/` is gitignored), automation commits research and plans:

**Benefits:**
- Audit trail of AI-generated research/plans
- Easy linking from Linear to specific documents
- Version history shows ticket progression
- Team can review research/plans in PRs

**Alternative:** Keep thoughts local and upload as Linear attachments (requires workflow modification)

### Status Flow Design

The workflow uses a strict linear progression:

```
research needed → research in progress → research in review
                                         ↓ (manual approval)
ready for plan → plan in progress → plan in review
                                    ↓ (manual approval)
ready for dev → in dev → code review → done
```

**Manual gates:**
- "research in review" → "ready for plan"
- "plan in review" → "ready for dev"

These require human review and are not automated by design.

## Best Practices

1. **Start Small:** Test with `num_tickets: 1` before batch processing
2. **Review Research:** Always review research quality before approving for planning
3. **Approve Plans:** Review implementation plans before moving to development
4. **Monitor First Runs:** Watch workflow logs closely during initial setup
5. **Iterate on Prompts:** Customize research/plan prompts in workflows for your codebase
6. **Branch Cleanup:** Periodically clean up merged branches
7. **Status Consistency:** Maintain consistent status names across team workflows

## Support

For issues with:
- **Plugin commands** (`/research`, `/plan`, `/implement`) - see main README.md
- **Linear API** - check Linear API documentation
- **GitHub Actions** - check workflow logs and GitHub Actions documentation
- **Workflow customization** - open issue in repository

## License

Apache-2.0 (same as parent project)
