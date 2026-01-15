#!/bin/bash
input=$(cat)
url=$(echo "$input" | jq -r '.tool_input.url // empty')
prompt=$(echo "$input" | jq -r '.tool_input.prompt // empty' | tr '[:upper:]' '[:lower:]')

# wcurl alias with browser-like headers (add to ~/.zshrc):
# alias wcurl='curl -sL --compressed -H "User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36" -H "Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8" -H "Accept-Language: en-US,en;q=0.9" -H "Cache-Control: no-cache" -H "Sec-Fetch-Dest: document" -H "Sec-Fetch-Mode: navigate" -H "Sec-Fetch-Site: none" -H "Sec-Fetch-User: ?1" -H "Upgrade-Insecure-Requests: 1"'
# mcurl() { wcurl "$1" | pnpx mdream --preset minimal; }

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

# suggest mcurl for HTML->markdown conversion
if [[ -n "$url" ]]; then
  deny "IMPORTANT - For HTML pages use: mcurl $url"
fi
