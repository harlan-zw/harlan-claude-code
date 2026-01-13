#!/bin/bash
input=$(cat)
url=$(echo "$input" | jq -r '.tool_input.url // empty')
prompt=$(echo "$input" | jq -r '.tool_input.prompt // empty' | tr '[:upper:]' '[:lower:]')

deny() {
  cat <<EOF
{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"$1"}}
EOF
  exit 0
}

# skip if prompt requests raw/html
if [[ "$prompt" =~ (raw|html|source) ]]; then
  exit 0
fi

# skip if already using r.jina.ai
if [[ "$url" =~ ^https?://r\.jina\.ai ]]; then
  exit 0
fi

# skip non-HTML resources (json, xml, md, txt, pdf, images, etc)
if [[ "$url" =~ \.(json|xml|md|txt|pdf|png|jpg|jpeg|gif|svg|webp|csv|yaml|yml)($|\?) ]]; then
  exit 0
fi

# GitHub blob URLs → suggest raw URL instead
if [[ "$url" =~ ^https?://github\.com/([^/]+)/([^/]+)/blob/(.+)$ ]]; then
  raw_url="https://raw.githubusercontent.com/${BASH_REMATCH[1]}/${BASH_REMATCH[2]}/${BASH_REMATCH[3]}"
  deny "GitHub blob URL returns HTML. Use raw URL: curl -sL '$raw_url'"
fi

# GitHub tree URLs (directories) → no raw equivalent
if [[ "$url" =~ ^https?://github\.com/([^/]+)/([^/]+)/tree/ ]]; then
  deny "GitHub tree URL is a directory listing (HTML). Use GitHub API or clone the repo instead."
fi

# skip API endpoints (likely return json)
if [[ "$url" =~ /api/ ]] || [[ "$url" =~ api\. ]]; then
  exit 0
fi

# suggest mdream for HTML->markdown conversion
if [[ -n "$url" ]]; then
  deny "IMPORTANT - For HTML pages use: curl -sL '$url' | pnpx mdream --preset minimal"
fi
