---
description: Update existing implementation plans based on feedback and discoveries

---

# Iterate on Implementation Plan

I'll help you update an existing implementation plan based on new information, feedback, or discoveries.

## Overview

This command is for making targeted updates to existing plans rather than creating new ones from scratch. Use this when you need to:

- Incorporate feedback from code review
- Add phases based on new discoveries
- Adjust success criteria
- Refine implementation details
- Update based on changed requirements
- Fix errors or gaps in the original plan

## Workflow

### Step 1: Locate and Read Plan

I'll:
1. Find the plan you want to update (usually in `thoughts/shared/plans/`)
2. Read it completely to understand current state
3. Check for any completed checkboxes to preserve progress
4. Note the plan structure and existing decisions

### Step 2: Understand Requested Changes

I'll:
1. Listen to what you want to change and why
2. Ask clarifying questions if the request is ambiguous
3. Confirm my understanding before making edits
4. Determine if this requires new research or just editing

### Step 3: Research (If Necessary)

**Only if truly needed**, I'll:
- Spawn research agents to understand new requirements
- Read additional files mentioned
- Verify assumptions against current codebase

**Note**: I prefer surgical edits over deep research unless changes require new understanding.

### Step 4: Make Updates

I'll make targeted changes:

**Surgical Edits** (preferred):
- Add/remove/modify specific phases
- Update success criteria
- Refine technical details
- Add new sections
- Preserve existing structure and progress

**Structural Changes** (when needed):
- Reorder phases
- Split complex phases
- Merge related phases
- Reorganize sections

**What I Preserve**:
- YAML frontmatter (updating `last_updated` fields)
- Completed checkboxes (`- [x]`)
- Overall plan structure unless explicitly changing
- File:line references (unless code has moved)
- Links to research and tickets

### Step 5: Review Changes

After updating:
1. Show you what changed
2. Explain rationale for modifications
3. Request feedback
4. Iterate if needed

## Guidelines

**Confirm Before Changing**:
- I'll explain what I understand you want
- Wait for confirmation before editing
- Ask questions if request is unclear

**Maintain Structure**:
- Keep phase numbering consistent
- Preserve success criteria format (Automated/Manual split)
- Maintain file:line reference patterns
- Don't break existing links

**Update Metadata**:
- Update `last_updated` date in YAML frontmatter
- Update `last_updated_by` to Claude
- Preserve original date and researcher

**Respect Progress**:
- Never remove completed checkboxes
- Don't renumber completed phases
- If restructuring, note which old phases map to new

**Be Efficient**:
- Make targeted edits, not wholesale rewrites
- Only research if changes require new understanding
- Don't re-research what's already documented
- Focus on what's changing

## Common Update Patterns

### Add a New Phase
```markdown
## Phase 3.5: Database Migration (NEW)
[Insert between existing phases with clear numbering]
```

### Update Success Criteria
```markdown
#### Automated Verification:
- [x] Command: `make test` (COMPLETED)
- [ ] Command: `make integration-test` (ADDED)
```

### Refine Implementation Details
```markdown
#### 2. Update API Handler (REFINED)
**File**: `src/api/handler.ts`
**Changes**: [More specific details added]

// Updated code example
```

### Add Discovery Section
```markdown
## Key Discoveries (UPDATED)
- [Existing discoveries]
- **NEW**: Found that authentication middleware must be updated
```

## When NOT to Use This Command

- Creating a brand new plan → Use `/plan` instead
- Major architectural change → Consider new `/research` + `/plan`
- Plan is completely wrong → Start fresh with `/plan`
- Just checking plan status → Just read the file

## Example Usage

```
/iterate-plan thoughts/shared/plans/2025-01-04-auth.md

Add a new phase for database migration between phases 2 and 3.
Also update phase 4's success criteria to include performance tests.
```

---

**Which plan would you like to update, and what changes do you want to make?**
