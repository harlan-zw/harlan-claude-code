---
description: Build frontend with Nuxt UI v4+. Trigger on "build page", "landing page", "dashboard", "setup design tokens", "polish", "refine", "add motion", "fix UX", "looks generic". Full lifecycle: design system setup, page building, polish.
user_invocable: true
argument-hint: "[component/page/area]"
model: opus
effort: max
---

# Nuxt Frontend Design

Full lifecycle frontend skill: setup, build, polish. Detects the right phase automatically.

## Project State

!`if [ -f nuxt.config.ts ]; then echo "IS_NUXT=true"; else echo "IS_NUXT=false"; fi`
!`bash -c 'F=""; if [ -f app.config.ts ]; then F="app.config.ts"; fi; if [ -f app/app.config.ts ]; then F="app/app.config.ts"; fi; if [ -n "$F" ] && grep -q "colors:" "$F" 2>/dev/null; then echo "HAS_COLORS=true"; else echo "HAS_COLORS=false"; fi'`
!`bash -c 'for f in app/assets/css/main.css app/css/main.css app/css/global.css app/assets/css/global.css; do if [ -f "$f" ] && grep -q "@theme" "$f" 2>/dev/null; then echo "HAS_THEME=true"; exit 0; fi; done; echo "HAS_THEME=false"'`
!`if [ -f .claude/context/design-guidelines.md ]; then echo "HAS_GUIDELINES=true"; else echo "HAS_GUIDELINES=false"; fi`
!`bash -c 'OUT=$(ls -t .claude/context/jobs/ 2>/dev/null | head -10); if [ -n "$OUT" ]; then echo "$OUT"; else echo "NO_JOBS"; fi'`
!`bash -c 'JOB=$(ls -t .claude/context/jobs/ 2>/dev/null | head -1); if [ -n "$JOB" ]; then echo "LATEST_JOB=$JOB"; if [ -f ".claude/context/jobs/$JOB/build-handoff.json" ]; then echo "PRIOR_BUILD=true"; jq -r "\"PRIOR_BUILD_DATE=\" + (.created // \"unknown\")" ".claude/context/jobs/$JOB/build-handoff.json" 2>/dev/null; else echo "PRIOR_BUILD=false"; fi; else echo "PRIOR_BUILD=false"; fi'`
!`bash -c 'JOB=$(ls -t .claude/context/jobs/ 2>/dev/null | head -1); if [ -n "$JOB" ] && [ -f ".claude/context/jobs/$JOB/review-report.md" ]; then echo "PRIOR_REVIEW=true"; grep -m1 "^verdict:" ".claude/context/jobs/$JOB/review-report.md" 2>/dev/null; else echo "PRIOR_REVIEW=false"; fi'`
!`bash -c 'JOB=$(ls -t .claude/context/jobs/ 2>/dev/null | head -1); if [ -n "$JOB" ] && [ -f ".claude/context/jobs/$JOB/build-progress.md" ]; then printf "PAGES_BUILT="; grep -c "^## " ".claude/context/jobs/$JOB/build-progress.md" 2>/dev/null; else echo "PAGES_BUILT=0"; fi'`
!`if command -v dev-browser >/dev/null 2>&1; then echo "DEV_BROWSER=true"; else echo "DEV_BROWSER=false"; fi`
!`bash -c 'OUT=$(find app/pages -name "*.vue" 2>/dev/null | head -10); if [ -n "$OUT" ]; then echo "$OUT"; else echo "NO_PAGES"; fi'`
!`bash -c 'OUT=$(ls "${CLAUDE_SKILL_DIR}/references/themes/" 2>/dev/null | sed "s/.md$//"); if [ -n "$OUT" ]; then echo "$OUT"; else echo "NO_THEMES"; fi'`
!`bash -c 'F=""; if [ -f app.config.ts ]; then F="app.config.ts"; fi; if [ -f app/app.config.ts ]; then F="app/app.config.ts"; fi; if [ -n "$F" ] && grep -q "colors:" "$F" 2>/dev/null; then N=$(grep -E "neutral:" "$F" 2>/dev/null | head -1 | sed "s/.*neutral:[[:space:]]*['"'"'\"]//" | sed "s/['"'"'\"].*//" ); if [ -n "$N" ]; then echo "$N"; else echo "NO_NEUTRAL"; fi; else echo "NO_NEUTRAL"; fi'`

## Phase Detection

`$ARGUMENTS` = the text the user provided after the skill invocation, e.g. `/nuxt-frontend-design frost landing page` → `$ARGUMENTS` = "frost landing page"

**Guard**: If IS_NUXT=false, tell the user this skill requires a Nuxt project (`nuxt.config.ts`) and stop.

Using the injected project state above, determine the phase. Parse `$ARGUMENTS` for BOTH a theme name AND an action (build/polish/page name). A single invocation like `/nuxt-frontend-design frost landing page` means: ensure frost theme (Phase 1 if needed), then build landing page (Phase 2).

```
Check: HAS_COLORS=true AND HAS_THEME=true AND HAS_GUIDELINES=true? -> if all false or mixed: Phase 1 (Setup)
  Mixed state (one true, others false) means CORRUPTED setup -> Phase 1 (repair)
Check: $ARGUMENTS names a specific theme AND design system is incomplete or uses a different theme?
  -> Phase 1 with that theme. If design system already uses that theme, skip to next check.
Check: PRIOR_REVIEW=true with FAIL verdict?
  -> Read the FULL `{JOB_DIR}/review-report.md` (not just the verdict line). For each [HARD REJECT] and [RUBRIC] item, fix the issue at the referenced file:line. After fixing all items, re-emit the handoff with updated contract_criteria_status.
Check: $ARGUMENTS asks to build new pages?                         -> Phase 2 (Build)
Check: $ARGUMENTS asks to refine/polish?                           -> Phase 3 (Polish)
Check: existing pages need improvement?                            -> Phase 3 (Polish)
Default (no arguments, design system exists):                      -> Phase 3 (audit existing pages)
```

**Hard prerequisite:** Phase 2 requires a complete design system (all three: HAS_COLORS, HAS_THEME, HAS_GUIDELINES). If any is missing, run Phase 1 first. Tell the user: "Design system incomplete. Setting it up first."

**Cross-phase rule:** If Phase 1 was completed in THIS conversation, do not proceed to Phase 2 in the same conversation. Emit the handoff and tell the user: "Design system ready. Start a new conversation and run `/nuxt-frontend-design {page}` to build with fresh context."

## Job ID

Every Phase 2 or Phase 3 invocation gets a unique job ID. This namespaces all build artifacts so parallel design jobs don't collide.

**Generate the job ID:**
```bash
JOB_ID="$(echo "$ARGUMENTS" | tr ' ' '-' | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9-]//g' | cut -c1-20)-$(date +%m%d-%H%M)"
mkdir -p ".claude/context/jobs/$JOB_ID"
```

This produces IDs like `landing-page-0331-1423` or `dashboard-0331-1445`. Tell the user the job ID immediately: "Job ID: `{JOB_ID}`"

**Repair pass**: if PRIOR_REVIEW has a FAIL verdict and `$ARGUMENTS` contains a job ID matching an existing job directory, reuse that job ID instead of generating a new one. Read the review report from that job's directory.

**Phase 1 only**: no job ID needed (design system artifacts are shared, not job-scoped).

All job-specific artifacts go to `.claude/context/jobs/{JOB_ID}/`:
- `build-contract.md`
- `build-progress.md`
- `build-handoff.json`

Design system artifacts remain shared at `.claude/context/`:
- `design-guidelines.md`

Use `JOB_DIR=.claude/context/jobs/{JOB_ID}` throughout.

---

## Pre-Implementation: Define Acceptance Criteria

Before writing any code in Phase 2 or Phase 3, your FIRST response must be the contract. Do not open any `.vue` files or write any component code until the user approves.

Run `mkdir -p {JOB_DIR}` then emit to `{JOB_DIR}/build-contract.md`:

1. **What will be built**: list every component, page, and interaction
2. **Testable behaviors**: assign each criterion a stable ID (C1, C2, ...). Use this format:
   `[C1] GIVEN [state/context], WHEN [user action], THEN [observable result]`
   Each criterion must be verifiable by a single browser action or grep. Rewrite any criterion that requires subjective judgment.
   Minimums per page:
   - 5 interaction assertions (clicks, submits, toggles, navigation, hover states)
   - 3 state assertions (loading, empty, error as separate items)
   - 2 responsive assertions (specific behavior at 375px AND 768px)
   - 1 dark mode assertion
   - 1 accessibility assertion (tab order, aria labels, or screen reader)
   - 1 SSR assertion (HTML contains expected content before hydration)
3. **Design expectations**: which theme tokens apply, expected visual weight, layout structure. Include the design principle from the guidelines and note how the page should express it.
4. **Out of scope**: what this does NOT include

**Show the contract to the user and get approval before building.** The user may add criteria, adjust scope, or flag missing requirements. For unambiguous requests (single page, explicit requirements), emit the contract as documentation but proceed immediately.

This file becomes the review skill's grading rubric. Skip this step only for single-file cosmetic changes.

---

## Phase 1: Design System Setup

Establish the visual foundation. Only needed when no design system exists or a new theme is requested.

### Design Philosophy

Commit to a specific aesthetic direction that serves the content before coding. During Phase 1, define a single design principle as a tradeoff statement: "We prioritize X over Y" (e.g., "We prioritize readability over visual impact" or "We prioritize tactile depth over minimalism"). Record this in the design guidelines.

### What to set up

1. **Color palette**: primary, neutral, accent via `app.config.ts`
2. **Typography**: font selection, registration via Nuxt Fonts, `--font-*` in `@theme`
3. **Icon system**: icon collection matching the aesthetic via `@nuxt/icon`
4. **Semantic overrides**: `--ui-bg`, `--ui-text`, `--ui-radius`, etc. for light/dark
5. **Component theming**: global overrides via `app.config.ts` slots/variants
6. **Extended colors**: registering custom theme colors in `nuxt.config.ts`

**Principle: Override, Don't Invent.** Always use Nuxt UI's existing design tokens (`bg-muted`, `text-default`, `--ui-bg`, `--ui-radius`, etc.) and Tailwind's built-in utilities (`shadow-md`, `rounded-xl`). Customize the design system by **overriding** these tokens in `app.config.ts` and `main.css`, not by creating new custom tokens. Only introduce a genuinely new `@theme` token when no existing Nuxt UI or Tailwind token covers the concept. If you find yourself naming a new token, first check whether an existing `--ui-*` variable or Tailwind utility already serves that purpose.

### References

- [design-system.md](references/design-system.md): Full setup guide (colors, fonts, tokens, component theming)
- [themes/{name}.md](references/themes/): Complete theme implementation files

Available themes: frost, clay, blueprint, nebula, zen, neon, teenage-engineering, kinetic-paper, flow, devtool. See `references/themes/` for the full list (injected above).

### Theme Selection

Read EXACTLY ONE theme file: `${CLAUDE_SKILL_DIR}/references/themes/{chosen-theme}.md`. Never read multiple theme files for comparison. If the user didn't specify a theme, default to `frost` for dark mode projects, `zen` for light mode. Only ask if the choice is genuinely ambiguous.

### After Setup: Emit Design Guidelines

**Always** emit a design guidelines file after writing `app.config.ts`, `main.css`, and `nuxt.config.ts`:

1. Read the template: [templates/design-guidelines.md](templates/design-guidelines.md)
2. Fill in every section based on the decisions you just made, **no placeholders**
3. Write to `.claude/context/design-guidelines.md` in the target project
4. Verify: `grep -c 'placeholder\|TODO\|{' .claude/context/design-guidelines.md` must return 0

If modifying an existing design system, **update** the existing guidelines file.

### Setup Recovery

If Phase 1 fails mid-setup (build error, malformed config):
1. Do NOT continue to Phase 2
2. Read the error output and fix the config issue
3. Verify all three indicators pass: `colors:` in app.config.ts, `@theme` in main.css, design-guidelines.md exists with no placeholders
4. Never emit a design-guidelines.md with unfilled template sections

### Setup Gotchas

- **Font selection**: avoid the top 5 most common web fonts (Inter, Roboto, Open Sans, Lato, Montserrat) and system-ui. Choose fonts that reinforce the design principle.
- **Button visibility**: Buttons MUST have visible backgrounds. Set `colors.primary` + `button.defaultVariants.variant: 'solid'` in `app.config.ts`.
- **No fake UI**: If it looks interactive, wire it up. Prefer realistic placeholder content (avatar services like ui-avatars.com) over empty or broken images.

---

## Phase 2: Build Pages

Compose pages and UI patterns with Nuxt UI v4+ components. **Requires a design system** (run Phase 1 first if none exists).

### Artifact Cleanup

Stale artifact cleanup is no longer needed. Each job gets its own directory under `.claude/context/jobs/{JOB_ID}/`, so previous jobs' artifacts cannot collide.

### Build Recovery

If `{JOB_DIR}/build-progress.md` exists but `{JOB_DIR}/build-handoff.json` does not, a previous build was interrupted. Read `build-progress.md` to determine which pages completed and which contract criteria remain. Resume from the last incomplete page rather than starting over.

### Read the Foundation

Read these files if not already in context from Phase 1:

```
.claude/context/design-guidelines.md  -> aesthetic intent, component rules, avoid list, custom utilities
app/assets/css/main.css               -> @theme tokens, --ui-* overrides, custom classes
app.config.ts                         -> colors, component theme overrides, defaultVariants
nuxt.config.ts                        -> fonts, colorMode, ui.theme.colors
```

Use the project's semantic tokens, fonts, and component overrides. Never hardcode colors, shadows, or radii that bypass the design system. When you need a design variation, override an existing Nuxt UI token rather than introducing a new custom token.

### References

Load ONLY the reference matching what you're building. Do not load more than one reference file before writing code. Load additional references only after the first page is written and you need a new component type.

| Building... | Reference |
|-------------|-----------|
| Landing / marketing page | [pages/landing.md](references/pages/landing.md) |
| Dashboard / admin | [pages/dashboard.md](references/pages/dashboard.md) |
| Forms | [components/forms.md](references/components/forms.md) |
| Data tables | [components/tables.md](references/components/tables.md) |
| Navigation | [components/navigation.md](references/components/navigation.md) |
| Feedback / overlays | [components/feedback.md](references/components/feedback.md) |

### Build Gotchas

- **v4 component renames**: `ButtonGroup` -> `UFieldGroup`, `PageMarquee` -> `UMarquee`. Old names silently render nothing.
- **`UPageHero` needs a parent section**: wrap in `UPageSection` or a max-width container.
- **Form validation timing**: `UForm` with Zod validates on blur by default. Set `validate-on="input"` for inline.
- **`UTable` empty state**: without an explicit `empty` slot, an empty table shows nothing.
- **Dark mode**: semantic tokens adapt automatically. Hardcoded `bg-white` or `text-black` breaks dark mode.
- **Error handling**: every async operation (data fetch, form submit, API call) must have both loading AND error states. Missing error handling is a hard rejection in review.
- **Z-index and overflow**: elements hidden by overflow or z-index stacking are a hard rejection. Test overlays, dropdowns, and sticky headers.
- **SSR content**: pages must render meaningful content server-side. Wrap client-only animations in `ClientOnly`, not entire page sections.

---

## Phase 3: Polish

Refine existing interfaces. Audit against the project's own design system, not generic best practices.

If `$ARGUMENTS` names a specific area (typography, motion, color, etc.), skip to that area's reference.

### Read the Foundation

Read the foundation files listed in Phase 2's "Read the Foundation" section (if not already in context from Phase 1).

### Audit Foundation Tokens

Check that the design system is complete. Missing tokens cause inconsistency downstream.

| Token category | Where defined | What to check |
|----------------|---------------|---------------|
| Colors | `app.config.ts` `colors` | `primary` and `neutral` set? Additional theme colors registered? |
| Fonts | `@theme` `--font-*` | At least `--font-sans` defined? Display/mono if used? |
| Semantic overrides | `:root` / `.dark` `--ui-*` | `--ui-bg`, `--ui-text`, `--ui-border` customized? |
| Component overrides | `app.config.ts` `ui.*` | Key components themed? `defaultVariants` set? |
| Unnecessary tokens | `@theme` | Custom tokens that duplicate Tailwind builtins or Nuxt UI `--ui-*` variables? Remove them and use the existing token instead. New tokens should only exist when no Nuxt UI or Tailwind equivalent covers the concept. |

**If tokens are missing**: fix them first.

### Audit Consistency

Scan `.vue` files for violations:

| Violation | Fix |
|-----------|-----|
| Hardcoded colors (`bg-slate-100`) | -> semantic tokens (`bg-muted`) |
| Inconsistent shadows/radii | -> pick one per component type via `app.config.ts` |
| Banned fonts | -> project's `--font-sans` / `--font-display` |
| Mixed spacing | -> consistent rhythm |
| Inline styles | -> Tailwind class or semantic token |
| Raw HTML elements | -> Nuxt UI components |
| Guideline violations | -> follow documented constraints |

### Audit Confirmation

After completing the token and consistency audits, present findings to the user before making any changes. Format as a numbered list with categories:

```
**Audit findings:**

Token issues (will fix):
1. Hardcoded `bg-slate-100` in HeroSection.vue:42 → should use `bg-muted`
2. ...

Aesthetic observations (need your input):
3. Hero text feels small for a landing page → increase size? [intentional / fix]
4. Cards all use identical treatment → add hierarchy? [intentional / fix]
5. ...
```

**Rules:**
- **Token/consistency violations** (hardcoded colors, wrong fonts, broken dark mode): present as "will fix" since these are objectively wrong per the design system
- **Aesthetic judgments** (sizing, hierarchy, rhythm, visual weight): present as observations requiring user input. Never assume these are problems.
- **Already decided**: before presenting, read `## Design Decisions` in `.claude/context/design-guidelines.md`. Any observation already covered by an existing decision is settled. Do not re-ask. Only present NEW aesthetic observations the user hasn't ruled on yet. If all aesthetic observations are already covered, skip straight to fixing token issues and then Elevate.
- Wait for user response before proceeding. The user will mark each aesthetic item as "intentional" or "fix".

**After confirmation**, update `.claude/context/design-guidelines.md`:
1. Add new "intentional" choices to `## Design Decisions` (append, don't duplicate existing entries)
2. Remove any stale entries in `## Design Decisions` that the user just marked as "fix" (they've changed their mind)
3. If no `## Design Decisions` section exists yet, create it

Example:

```markdown
## Design Decisions
- Hero uses text-3xl intentionally: minimal aesthetic for utility tool
- Cards use uniform treatment: flat hierarchy is intentional
```

Only fix items the user approved. Skip everything marked "intentional".

### Elevate

Only after foundation and consistency are solid AND audit confirmation is complete. Read references based on symptoms:

| Symptom | Reference |
|---------|-----------|
| Feels flat/static | [polish/interactions.md](references/polish/interactions.md) |
| No entrance animations | [polish/motion.md](references/polish/motion.md) |
| Typography feels generic | [polish/typography.md](references/polish/typography.md) |
| Layout cramped or boring | [polish/spatial.md](references/polish/spatial.md) |
| Colors dull or inconsistent | [polish/color.md](references/polish/color.md) |
| Not responsive enough | [polish/responsive.md](references/polish/responsive.md) |
| Copy unclear or generic | [polish/ux-writing.md](references/polish/ux-writing.md) |

When asked to "make it better" or "polish everything":
1. Read `interactions.md` + `motion.md` + `color.md` (highest impact areas)
2. Only read `spatial.md`, `typography.md`, `responsive.md`, `ux-writing.md` if the initial audit reveals issues in those areas

### Visual Verification Loop (if DEV_BROWSER=true)

Polish is visual by definition. When dev-browser is available, verify changes instead of guessing.

**Before polishing**: capture a baseline screenshot of affected pages.

```bash
dev-browser --headless <<'SCRIPT'
const page = await browser.getPage("baseline");
await page.goto("http://localhost:{port}/{route}");
await page.waitForLoadState("networkidle");
const screenshot = await page.screenshot({ fullPage: true });
await saveScreenshot(screenshot, "{route}-before-polish");
SCRIPT
```

**After each polish area** (motion, interactions, responsive, color): re-capture and compare.

```bash
dev-browser --headless <<'SCRIPT'
const page = await browser.getPage("verify");
await page.goto("http://localhost:{port}/{route}");
await page.waitForLoadState("networkidle");

// Verify motion: trigger entrance animations by scrolling
await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" }));
await page.waitForTimeout(1000);
await page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" }));
await page.waitForTimeout(1000);

// Verify interactions: hover key elements
const buttons = await page.locator("button:visible").all();
for (const btn of buttons.slice(0, 5)) {
  await btn.hover();
  await page.waitForTimeout(200);
}

// Verify responsive: check at mobile breakpoint
await page.setViewportSize({ width: 375, height: 812 });
await page.waitForTimeout(500);
const mobile = await page.screenshot({ fullPage: true });
await saveScreenshot(mobile, "{route}-after-polish-mobile");

// Reset to desktop
await page.setViewportSize({ width: 1280, height: 720 });
const desktop = await page.screenshot({ fullPage: true });
await saveScreenshot(desktop, "{route}-after-polish-desktop");

console.log(JSON.stringify({ verified: true }));
SCRIPT
```

This is mechanical verification only. Do not use screenshots for qualitative self-assessment ("this looks good"). Use them to confirm: animations trigger, hover states change visually, responsive layout holds at 375px. If something breaks, fix it before continuing.

If dev-browser is not installed, skip this step.

### Polish Rules

- **Keep what works**: don't change what's already distinctive
- **"Same product, elevated execution"**: not "This is different"
- **No wholesale replacement** when refinement would work
- **No scope creep**: polish what's there, don't add features
- **Over-polishing kills distinctiveness**: pick 1-2 areas to elevate, leave the rest

### Polish Gotchas

- **Motion-v SSR hydration**: use `ClientOnly` wrapper or `onMounted` for entrance animations
- **OKLCH browser support**: provide fallback via `@supports` for older Safari
- **Font loading flash**: register fonts via Nuxt Fonts, not CSS `@import`
- **Container queries**: need `container-type: inline-size` on the parent
- **Don't refactor while polishing**: polish is visual refinement, not code cleanup

### After Polish: Emit Handoff

After completing Phase 3 changes, follow the same "After Implementation: Emit Handoff" steps below. The review step applies to polish work too, not just new page builds. Skip only for trivially verifiable changes (single file, purely cosmetic token swaps with no new components, routes, or interactions).

---

## Reka UI

For components not covered by Nuxt UI, or where Nuxt UI is too prescriptive, use [Reka UI](https://reka-ui.com/docs/overview/installation): unstyled, accessible Vue primitives you can style with Tailwind.

## Long Task Protocol

For builds spanning multiple pages or phases:

1. **Checkpoint after each page**: write `{JOB_DIR}/build-progress.md` BEFORE starting the next page. Use `## {Page Name}` as the heading for each entry (this format is counted by the injected `PAGES_BUILT`). List files created/modified, contract criteria satisfied (by ID), and criteria remaining. You cannot open a new page file until this is written.
2. **Browser sanity check** (if DEV_BROWSER=true): after writing the checkpoint, run a quick mechanical verification. This is NOT qualitative self-evaluation, only pass/fail structural checks. Fix any failures before proceeding to the next page.

    ```bash
    dev-browser --headless <<'SCRIPT'
    const page = await browser.getPage("sanity");
    await page.goto("http://localhost:{port}/{route}");
    await page.waitForLoadState("networkidle");

    const errors = [];
    page.on("console", msg => { if (msg.type() === "error") errors.push(msg.text()); });

    const html = await page.content();
    const hasNuxtError = html.includes("nuxt-error");
    const hasContent = (await page.locator("#__nuxt").all()).length > 0;

    // Quick responsive check
    await page.setViewportSize({ width: 375, height: 812 });
    await page.waitForTimeout(500);
    const overflows = await page.evaluate(() =>
      document.documentElement.scrollWidth > window.innerWidth
    );

    const screenshot = await page.screenshot({ fullPage: true });
    await saveScreenshot(screenshot, "{page}-sanity");

    console.log(JSON.stringify({ hasNuxtError, hasContent, consoleErrors: errors, mobileOverflows: overflows }));
    SCRIPT
    ```

    **Pass criteria**: `hasContent: true`, `hasNuxtError: false`, zero console errors, `mobileOverflows: false`. If any fail, fix the issue before continuing. Log results to `build-progress.md` under the page heading as `Browser check: PASS` or `Browser check: FAIL (reason)`.

    If dev-browser is not installed, skip this step. Do not attempt qualitative assessment of your own visual output.

3. **Intermediate review**: after the first page in a multi-page build, suggest: "Page 1 complete. For best results, run `/nuxt-frontend-review {JOB_ID}` now before continuing to page 2." This catches systemic issues (wrong tokens, broken shared components) before they propagate.
4. **Cross-page consistency check**: before starting page N+1, re-read the files from page N. Confirm: same number of states handled, same level of interaction detail, same use of design tokens. If page N+1 scope feels smaller than page N, that is context degradation. Stop and emit the handoff.
5. **Scope gate**: the injected `PAGES_BUILT` count is your source of truth.
   - If PAGES_BUILT >= 2 and next page is complex (forms, tables, multi-step flows): STOP. Emit handoff.
   - If PAGES_BUILT >= 3: STOP unconditionally. Emit handoff.
   - Tell the user: "Start a new conversation and run `/nuxt-frontend-design {next page}` to continue."
6. **No silent scope reduction**: if you cannot confirm every contract criterion is met, flag incomplete items explicitly in `{JOB_DIR}/build-progress.md` and the handoff artifact.

## After Implementation: Emit Handoff

Before finishing, capture the current git state and write `{JOB_DIR}/build-handoff.json`. **`dev_port`**: record the port the dev server is running on (check `nuxt.config.ts` for `devServer.port`, or detect from the running process). This tells the review skill exactly where to verify.

```json
{
  "schema_version": 3,
  "job_id": "{JOB_ID}",
  "created": "<ISO 8601 date from `date -u +%Y-%m-%dT%H:%M:%SZ`>",
  "git_hash": "<current HEAD hash from `git rev-parse HEAD`>",
  "dev_port": 3000,
  "pages_changed": ["app/pages/index.vue"],
  "components_created": ["app/components/StatsCard.vue"],
  "routes_to_test": ["/", "/dashboard"],
  "design_system_changes": false,
  "design_guidelines_path": ".claude/context/design-guidelines.md",
  "theme_name": "frost",
  "contract_path": "{JOB_DIR}/build-contract.md",
  "contract_criteria_status": {
    "C1": "met",
    "C2": "met",
    "C3": "partial"
  },
  "self_assessment": {
    "confidence": "medium",
    "weakest_area": "Mobile nav transition feels abrupt",
    "hardest_decision": "Used ghost buttons on sidebar; solid felt too heavy"
  },
  "has_client_animations": true,
  "known_limitations": ["Chart uses placeholder data"],
  "next_steps": ["Add real chart data integration"],
  "dark_mode_relevant": true
}
```

**Self-assessment honesty rule**: do not rate confidence higher than your weakest area justifies. If `weakest_area` describes something that would be a hard rejection criterion (broken feature, missing state, layout break), confidence must be "low".

After emitting the handoff, summarize what was written: "Wrote build contract (N criteria), handoff (confidence: X, weakest: Y), and progress tracker to `.claude/context/jobs/{JOB_ID}/`."

Then tell the user to run the review with the job ID:

```
/nuxt-frontend-review {JOB_ID}
```

**Skip the review for trivially verifiable changes** where ALL of these are true: single file changed, purely cosmetic (colors, spacing, copy), no new components/routes/interactions, no structural layout changes. For skipped reviews, still verify the dev server runs and curl the affected route.
