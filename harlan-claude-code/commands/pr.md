---
description: Create a PR with conventional commit template
---

Create a pull request following this exact template format:

**Title:** Use conventional commits format (feat:, fix:, docs:, chore:, etc.)

**Body:**
```
### 🔗 Linked issue

<!-- Link any related issues, e.g. "Resolves #123" -->

### ❓ Type of change

<!-- keep all of these just tick which ones are relevant -->

- [ ] 📖 Documentation (updates to the documentation or readme)
- [ ] 🐞 Bug fix (a non-breaking change that fixes an issue)
- [ ] 👌 Enhancement (improving an existing functionality)
- [ ] ✨ New feature (a non-breaking change that adds functionality)
- [ ] 🧹 Chore (updates to the build process or auxiliary tools and libraries)
- [ ] ⚠️ Breaking change (fix or feature that would cause existing functionality to change)

### 📚 Description

<!-- 2-3 plain sentences: what problem existed, then what we did. No labels, no checkboxes. -->

<!-- Optional, If relevant, show minimal code example demonstrating the change -->

### ⚠️ Breaking Changes <!-- Optional -->

<!-- If breaking, list what changed and migration steps -->

### 📝 Migration <!-- Optional -->

<!-- If migration needed, show before/after code examples -->
```

**Checklist:**
- [ ] Check the appropriate type box
- [ ] Link issues (check commits, branch name, or search repo for related issues)
- [ ] Description: background (problem) → how (solution)
- [ ] Code example if change affects API/usage
- [ ] Breaking changes: list what changed + before/after migration

Be concise. Write like a human, not a robot. Skip fluff and marketing speak.
