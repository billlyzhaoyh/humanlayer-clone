---
description: Research codebase with specialized sub-agents and structured documentation

---

I'm ready to research the codebase. Please provide your research question or area of interest, and I'll analyze it thoroughly by exploring relevant components and connections.

## Workflow Steps

### Step 1: Read Mentioned Files First
If you've referenced any files, tickets, or documents, I'll read them completely first (no pagination) to build foundational understanding in my main context before spawning sub-tasks.

### Step 2: Analyze & Decompose Query
I'll break down your research question into composable areas, identify relevant components and architectural patterns, and create a research plan using TodoWrite for tracking.

### Step 3: Spawn Parallel Sub-Agent Tasks
I'll launch specialized agents concurrently for efficient investigation:
- **codebase-locator**: Find WHERE components exist
- **codebase-analyzer**: Explain HOW code functions
- **codebase-pattern-finder**: Locate existing patterns
- **thoughts-locator**: Discover relevant documentation
- **thoughts-analyzer**: Extract insights from documents
- **web-search-researcher**: External resources (if requested)

**Critical**: All agents document as-is, never evaluate or critique.

### Step 4: Synthesize Findings
I'll wait for ALL sub-agents to complete, then compile findings from both codebase and thoughts. Live code is the source of truth. I'll include specific file paths and line numbers, and verify thoughts/ paths (removing "searchable/" while preserving structure).

### Step 5: Gather Metadata
I'll execute `${CLAUDE_PLUGIN_ROOT}/scripts/spec_metadata.sh` to obtain:
- Current commit hash
- Branch name
- Repository name
- Timestamp with timezone

### Step 6: Generate Research Document
I'll create a structured document with YAML frontmatter + markdown content:

```yaml
---
date: [ISO format with timezone]
researcher: Claude
git_commit: [Hash]
branch: [Branch name]
repository: [Repo name]
topic: "[Your question]"
tags: [research, codebase, components]
status: complete
last_updated: [YYYY-MM-DD]
last_updated_by: Claude
---
```

**Document Structure**:
- Research Question
- Summary
- Detailed Findings
- Code References (with file:line numbers)
- Architecture Documentation
- Historical Context (from thoughts/)
- Related Research
- Open Questions

**Filename format**: `thoughts/shared/research/YYYY-MM-DD-description.md`

**IMPORTANT**: Use the ACTUAL current date in YYYY-MM-DD format (e.g., if today is November 4, 2025, use `2025-11-04`). Do NOT use literal "YYYY-MM-DD".

### Step 7: Add GitHub Permalinks
I'll verify branch status and generate GitHub permalinks for code references:
- Check: `git branch --show-current`
- Format: `https://github.com/{owner}/{repo}/blob/{commit}/{file}#L{line}`
- Only add if on main branch or branch is pushed

### Step 8: Present Findings
I'll summarize the research concisely, include navigation references, and invite follow-up questions.

## Critical Constraints

**Documentation Mandate**:
- DO NOT suggest improvements or changes
- DO NOT perform root cause analysis
- DO NOT propose future enhancements
- DO NOT critique the implementation
- ONLY describe what exists, where it exists, and how it works

**Path Handling**:
- Transform `thoughts/searchable/X/Y/file.md` → `thoughts/X/Y/file.md`
- Preserve original directory structure (user/ vs shared/)

**File Reading**:
- Always read complete files without limit/offset parameters
- Process mentioned files before spawning sub-tasks

**Follow-up Protocol**:
- Append to existing document
- Update frontmatter `last_updated` fields
- Add new section: `## Follow-up Research [timestamp]`
- Spawn new agents as needed

## Key Principles

- Parallel sub-agent execution maximizes efficiency
- Fresh research each time (don't rely solely on existing docs)
- Concrete file paths + line numbers for developer reference
- Self-contained documents with complete context
- Temporal documentation of research moment
- Cross-component connection mapping

---

**Now, what would you like me to research?**
