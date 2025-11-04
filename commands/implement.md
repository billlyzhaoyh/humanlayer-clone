---
description: Execute implementation plans phase-by-phase with verification gates

---

# Implement Plan

I'll help you execute your implementation plan systematically, with verification at each phase.

## Getting Started

Before I begin implementation, I'll:

1. **Read the plan completely** - Check for existing checkmarks (`- [x]`) to understand what's already done
2. **Read original ticket and referenced files** - Get full context (never use limit/offset)
3. **Analyze interconnections** - Think deeply about how all pieces fit together
4. **Create progress tracking** - Build a todo list for systematic execution
5. **Begin implementation** - Start when I fully understand the requirements

## Implementation Philosophy

**Follow Intent, Adapt to Reality**:
- I'll follow the plan's intent while adapting to actual codebase conditions
- Complete each phase fully before advancing
- Verify work aligns with broader codebase context
- Update plan checkboxes as I complete sections
- Use judgment when reality doesn't match documentation

**When Mismatches Occur**:
If the codebase differs significantly from the plan, I'll stop and present the issue:

```
Issue in Phase [N]:
Expected: [what plan says]
Found: [actual situation]
Why this matters: [explanation of the discrepancy]

How should I proceed?
```

I'll wait for your guidance before continuing.

## Verification Approach

**After Each Phase**:

1. **Run automated success criteria** (typically `make check test` or commands listed in plan)
2. **Fix any issues** before moving forward
3. **Update progress** in both plan and todo tracking
4. **Check off automated items** in the plan using Edit tool
5. **PAUSE for manual verification**

**Pause Format**:
```
Phase [N] Complete - Ready for Manual Verification

Automated verification passed:
✓ make test - All tests passing
✓ make lint - No linting errors
✓ npm run type-check - Types valid

Please perform manual verification:
- [ ] UI displays correctly in browser
- [ ] Feature works on mobile viewport
- [ ] Performance is acceptable
- [ ] Edge cases handled properly

Let me know when complete to proceed to Phase [N+1].
```

**Important**:
- Don't check off manual testing items until you confirm completion
- Only skip pauses if you explicitly instruct me to execute multiple phases consecutively
- Otherwise, I assume one phase at a time with human verification gates

## Execution Guidelines

**Thoroughness**:
- Ensure I have complete code comprehension before declaring blockers
- Consider that codebase may have evolved since plan creation
- Read surrounding code to understand context and patterns
- Verify changes integrate properly with existing systems

**Progress Tracking**:
- Update plan checkboxes immediately after completing each item
- Keep todo list current
- Mark phases complete only when all criteria pass

**Communication**:
- Present mismatches clearly with context
- Explain technical decisions when deviating from plan
- Ask for guidance when uncertain
- Report progress at phase boundaries

## Troubleshooting

**If Blocked**:
- Ensure I've thoroughly understood the code
- Check if plan assumptions are still valid
- Present specific blocker with context
- Use sub-tasks sparingly for targeted debugging

**Common Scenarios**:
- File doesn't exist → Check if renamed or moved
- Function signature changed → Adapt to current implementation
- Test expectations wrong → Understand current behavior first
- Dependency missing → Check if already available differently

## Resuming Work

**If Checkmarks Exist** (indicating prior work):
- Trust completed checkmarks
- Start from the first unchecked item
- Only verify previous work if something appears incorrect
- Don't re-do completed phases

**If Resuming After Pause**:
- Check which phase was in progress
- Verify automated checks still pass
- Continue from where we left off

## Success Criteria Format

The plan will have two types of verification:

**Automated** (I can run):
```markdown
#### Automated Verification:
- [ ] Command: `make test`
- [ ] Command: `make lint`
```

**Manual** (you perform):
```markdown
#### Manual Verification:
- [ ] UI looks correct
- [ ] Performance acceptable
- [ ] Works across browsers
```

I'll execute all automated checks and pause for you to perform manual ones.

## Key Principles

- **Phase-based execution**: Complete one phase before starting the next
- **Verification gates**: Don't proceed until current phase passes
- **Checkbox tracking**: Mark items complete as they're done
- **Human gates**: Pause for manual verification after automated checks
- **Adaptation**: Handle reality vs plan mismatches gracefully
- **Communication**: Keep you informed of progress and issues

---

**Please provide the path to your implementation plan (e.g., `thoughts/shared/plans/2025-01-04-feature.md`) to begin.**
