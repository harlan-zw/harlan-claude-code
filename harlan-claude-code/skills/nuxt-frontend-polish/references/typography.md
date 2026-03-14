# Typography

Font choices and scale that create character and hierarchy.

---

## Font Selection

See gotchas in `nuxt-frontend-design-system` for banned font list and rationale.

### Recommended Pairings

| Style | Display | Body |
|-------|---------|------|
| Editorial | Playfair Display | IBM Plex Sans |
| Technical | JetBrains Mono | Atkinson Hyperlegible |
| Playful | Bricolage Grotesque | Nunito |
| Luxury | Instrument Serif | Satoshi |
| Geometric | Syne | Manrope |
| Industrial | Archivo Black | Outfit |
| Minimal | Crimson Pro | Source Sans 3 |

### Pairing Rules
- High contrast = interesting: serif + monospace, display + geometric sans
- Use weight extremes: 100/200 vs 800/900 (not 400 vs 600)
- Size jumps of 3x+ (not 1.5x) — timid contrast looks unintentional

---

## Setup in Nuxt

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  fonts: {
    families: [
      { name: 'Instrument Serif', provider: 'google' },
      { name: 'Satoshi', provider: 'google' }
    ]
  }
})
```

```css
/* app/assets/css/main.css */
@theme {
  --font-display: 'Instrument Serif', serif;
  --font-sans: 'Satoshi', sans-serif;
  --font-mono: 'JetBrains Mono', monospace;
}
```

Use in templates:
```html
<h1 class="font-display text-5xl font-bold">Headline</h1>
<p class="font-sans text-base text-muted">Body text</p>
<code class="font-mono text-sm">code</code>
```

---

## Type Scale

Intentional scale with clear hierarchy:

```css
@theme {
  /* Display — hero headlines */
  --font-size-display: 4rem;      /* 64px */
  --font-size-display-sm: 3rem;   /* 48px */

  /* Headings */
  --font-size-h1: 2.5rem;         /* 40px */
  --font-size-h2: 2rem;           /* 32px */
  --font-size-h3: 1.5rem;         /* 24px */
  --font-size-h4: 1.25rem;        /* 20px */

  /* Body */
  --font-size-body-lg: 1.125rem;  /* 18px */
  --font-size-body: 1rem;         /* 16px */
  --font-size-body-sm: 0.875rem;  /* 14px */
  --font-size-caption: 0.75rem;   /* 12px */
}
```

---

## Line Height

```css
/* Tight for headings */
h1, h2 { line-height: 1.1; }

/* Comfortable for body */
p, li { line-height: 1.6; }

/* Generous for small text */
.caption { line-height: 1.5; }
```

---

## Letter Spacing

```css
/* Tight for large display text */
.display { letter-spacing: -0.02em; }

/* Wide for uppercase labels */
.label { letter-spacing: 0.05em; text-transform: uppercase; }

/* Default for body */
p { letter-spacing: 0; }
```

---

## Text Gradients

For hero headlines:

```css
.text-gradient {
  @apply bg-gradient-to-r from-primary-500 via-accent-500 to-secondary-500 bg-clip-text text-transparent;
}
```
