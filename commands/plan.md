---
description: Create detailed implementation plans through interactive research and iteration

---

# Create Implementation Plan

Welcome! I'm here to help you create a detailed, actionable implementation plan through collaborative discussion and thorough research.

**Getting Started**: Please provide:
- What you want to build or change
- Context (tickets, research documents, related files)
- Any specific requirements or constraints

You can also invoke me directly with file paths for deeper initial analysis.

## Workflow Overview

I'll guide you through an interactive planning process with these steps:

### Step 1: Context Gathering

**Initial Understanding**:
1. Read all mentioned files completely (no limit/offset)
2. **Read prior research documents** if you provide them (e.g., `thoughts/shared/research/2025-01-04-auth.md`)
3. **Spawn parallel research agents** for additional investigation:
   - codebase-locator
   - codebase-analyzer
   - codebase-pattern-finder
   - thoughts-locator
   - thoughts-analyzer
4. Read ALL files identified by research tasks
5. Cross-reference requirements with actual code
6. Cross-reference prior research with fresh findings

**Why both prior research and fresh research?**
- Prior research provides valuable context and baseline understanding
- Fresh research verifies current codebase state
- Planning needs specific implementation details
- Code may have changed since original research
- Synthesis of both sources creates comprehensive understanding

**Presentation**:
- Present my informed understanding
- Ask focused, clarifying questions only
- No vague questions - I've done my homework

### Step 2: Research & Discovery

**If you correct my understanding**:
1. Spawn new research tasks to verify corrections
2. Create research todo via TodoWrite for tracking
3. Use specialized agents for concurrent investigation
4. Present findings with design options and open questions

### Step 3: Plan Structure Development

**Before writing details**:
- Propose phasing and structure
- Seek your approval on organization and granularity
- Ensure we agree on the approach before diving deep

### Step 4: Detailed Plan Writing

I'll create a comprehensive plan saved to:
`thoughts/shared/plans/YYYY-MM-DD-description.md`

**IMPORTANT**: Use the ACTUAL current date in YYYY-MM-DD format (e.g., if today is November 4, 2025, use `2025-11-04`). Do NOT use literal "YYYY-MM-DD".

**Plan Structure**:
```markdown
# [Feature] Implementation Plan

## Overview
[What we're building and why]

## Current State Analysis
[How things work today, with file:line references]

## Desired End State
[What success looks like, with verification methods]

## Key Discoveries
[Important findings from research that inform the plan]

## What We're NOT Doing
[Explicit scope boundaries]

## Implementation Approach
[High-level strategy]

## Phase 1: [Phase Name]

### Overview
[What this phase accomplishes]

### Changes Required

#### 1. [Component/File Name]
**File**: `path/to/file.ts`
**Changes**: [Specific modifications needed]

```typescript
// Example code showing the change
export function newFeature() {
  // implementation
}
```

**Rationale**: [Why these changes]

#### 2. [Next Component]
[Continue pattern...]

### Success Criteria

#### Automated Verification:
- [ ] Command: `make test`
- [ ] Command: `make lint`
- [ ] Command: `npm run type-check`

#### Manual Verification:
- [ ] UI displays correctly in browser
- [ ] Feature works on mobile viewport
- [ ] Performance is acceptable (< 200ms)
- [ ] Edge cases handled properly

**Implementation Note**: Pause after automated verification for manual testing before proceeding to Phase 2.

---

## Phase 2: [Next Phase]
[Continue pattern...]

## Testing Strategy
[Overall testing approach, test coverage requirements]

## Performance Considerations
[Performance implications, optimization needs]

## Migration Notes
[Data migration, breaking changes, rollback plan]

## References
- Link to research documents
- Link to relevant tickets
- Link to design docs or RFCs
```

**Critical Pattern - Success Criteria**:
Always split verification into two clear sections:
1. **Automated Verification**: Commands that can run automatically (make test, make lint, etc.)
2. **Manual Verification**: Tasks requiring human judgment (UI/UX, performance, edge cases)

Use `make` commands wherever possible for automated checks.

### Step 5: Review and Iteration

**After creating the plan**:
1. Present the plan location
2. Request your feedback
3. Iterate based on your input using targeted research if needed

## Critical Guidelines

**No Open Questions**: The implementation plan must be complete and actionable. Every decision must be made before finalizing the plan.

**Automated vs Manual Success Criteria**: Consistently separate verification. Automated steps use `make` commands; manual verification captures UI/UX, performance, and edge cases requiring human judgment.

**Directory Specificity**: When spawning sub-tasks, explicitly reference directories (e.g., `src/components/`, `api/handlers/`) rather than generic terms.

**Complete File Reading**: Read entire files into main context before spawning sub-tasks. Never use limit/offset parameters for mentioned documents.

**Be Skeptical and Interactive**:
- Question vague requirements
- Work collaboratively with you
- Get buy-in at each major step
- Present options and trade-offs
- Iterate based on feedback

**Research Depth**:
- Spawn agents to understand current implementation
- Verify assumptions against actual code
- Cross-reference with historical decisions in thoughts/
- Understand architectural patterns and conventions

## Philosophy

This is not a one-shot plan generator. We'll work together iteratively to ensure:
- Complete understanding of requirements
- Thorough knowledge of existing code
- Realistic, phased approach
- Clear success criteria at each phase
- No ambiguity or open questions

The resulting plan should be so clear that implementation is straightforward and verification is unambiguous.

---

**What would you like to plan?**
