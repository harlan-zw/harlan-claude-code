---
name: tweet
description: Draft, iterate, and polish tweets. Wraps screenshots in terminal window chrome for sharing.
user_invocable: true
---

# Tweet Skill

Help the user draft, refine, and finalize tweets for posting. When screenshots are provided, wrap them in a macOS-style terminal window for polished sharing.

## Input

`$ARGUMENTS` may contain:
- Raw tweet text to refine
- A file path to a screenshot to wrap
- Both text and screenshot path
- Nothing (interactive mode - ask what they want to tweet about)

## Step 1: Analyze Input

Determine what the user provided:
- **Text only** → go to Step 2
- **Screenshot only** → go to Step 3
- **Both** → do Step 2 and Step 3 in parallel
- **Nothing** → ask what they want to tweet about

## Step 2: Tweet Text Iteration

### Initial Review

Read the draft and identify:
- Character count (280 limit, flag if over)
- Grammar/spelling issues
- Clarity problems
- Weak opening (first 5 words matter most in timeline)
- Missing context that makes the tweet confusing to outsiders
- Unnecessary filler words or hedging language

### Generate Variations

Produce **3 variations** plus the fixed original:

1. **Fixed original** - Same voice/intent, just fix obvious issues (grammar, spelling, awkward phrasing)
2. **Punchy** - Shorter, more direct, removes hedging. Frontload the hook.
3. **Expanded** - Adds context or a concrete example if the original is too vague
4. **Hot take** - Reframes as a stronger opinion or contrarian angle

For each variation show:
- The tweet text
- Character count
- What changed and why

### Rules for Good Tweets
- No hashtags unless the user explicitly includes them
- No emojis unless the user's draft already uses them
- Don't start with "I" if possible
- Avoid corporate/marketing speak ("excited to announce", "thrilled to share")
- Match the user's voice - if they're casual, stay casual
- If referencing code/tech, be specific not vague
- Thread-style (1/n) only if user asks for it

### Iterate

After showing variations, ask which direction they prefer or if they want to mix elements. Keep iterating until they're happy with the final version.

## Step 3: Screenshot Wrapping

When the user provides a screenshot (file path or mentions wrapping an image):

### 3a. Read the Screenshot

Use the Read tool to view the screenshot and understand its content. Check:
- Is it a terminal/CLI screenshot? Use terminal window chrome.
- Is it a browser/web screenshot? Use browser window chrome.
- Dimensions - needed for the wrapper

### 3b. Generate and Run the Wrapper Script

Create a temporary Node.js script based on `templates/wrap-screenshot.mjs`. Customize:
- `INPUT_PATH` - the screenshot file path
- `OUTPUT_PATH` - same directory, append `-twitter` before extension (e.g., `img.png` → `img-twitter.png`)
- `TITLE` - contextual title for the window bar based on screenshot content:
  - Terminal screenshots: `claude — ~/project` or similar
  - Browser screenshots: URL or page title
  - Generic: filename or brief description

The template outputs at **1600x900** (Twitter-optimal 16:9). The screenshot is scaled to fit inside the window and the window floats centered on the canvas. This prevents Twitter from cropping the image in timeline.

Run the script:

```bash
node /path/to/scratchpad/wrap-screenshot.mjs
```

Dependencies (`sharp`, `@resvg/resvg-js`) should be available globally or in the project. If not, install to scratchpad:

```bash
cd /path/to/scratchpad && npm init -y && npm install sharp @resvg/resvg-js
```

### 3c. Verify Output

Read the output image to verify it looks correct. Show the user the result.

## Step 4: Final Output

Present the final tweet text (if applicable) and the wrapped screenshot path (if applicable). Offer to:
- Make further adjustments
- Generate additional variations
- Wrap more screenshots
