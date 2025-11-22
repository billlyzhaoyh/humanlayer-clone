---
description: Initialize thoughts directory structure and workspace for humanlayer-clone plugin

---

# Setup Workspace

I'll initialize the thoughts directory structure needed for the research, planning, and implementation workflows.

## What I'll Create

```
thoughts/
├── shared/           # Team-shared documents
│   ├── research/    # Research documents from /research command
│   ├── plans/       # Implementation plans from /plan command
│   ├── images/      # Images from /research command
└── global/          # Cross-repository thoughts
```

## Steps

1. **Check if thoughts/ already exists**
   - If it does, I'll show current structure and ask if you want to reinitialize

2. **Create directory structure**
   - Create all necessary subdirectories
   - Set appropriate permissions

3. **Create README**
   - Add `thoughts/README.md` explaining the structure
   - Include examples of what goes where

4. **Add gitkeep files**
   - Add `gitkeep` files to all subdirectories

## Running Setup

Just invoke this command:
```bash
/setup
```

Let me set up your workspace now!

---

## Implementation

I'll execute the following:

1. Check if `thoughts/` exists
2. If not, create the structure
3. Create a helpful README in thoughts/
4. Add gitkeep files to all subdirectories
5. Confirm completion

Would you like me to proceed?
