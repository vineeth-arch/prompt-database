---
name: "email-design"
description: "Email marketing design with layout patterns, subject line formulas, and deliverability rules. Covers welcome sequences, promotional emails, transactional templates, and mobile optimization. Use for: email marketing, newsletter design, drip campaigns, email templates, transactional emails. Triggers: email design, email template, email marketing, newsletter design, email layout, email campaign, drip campaign, welcome email, promotional email, transactional email, email subject line, email header image, email banner"
---

# Email Design

Design high-converting marketing emails with AI-generated visuals via [inference.sh](https://inference.sh) CLI or AI Gateway API.

## Quick Start

> Option A: inference.sh CLI (`infsh`) — requires `npx skills add inference-sh/skills@agent-tools`
> Option B: AI Gateway API (`generate-image` skill) — available by default with `AI_GATEWAY_API_KEY`

```bash
# Option A: Using infsh
infsh login
infsh app run infsh/html-to-image --input '{
  "html": "<div style=\"width:600px;height:250px;background:linear-gradient(135deg,#667eea,#764ba2);display:flex;align-items:center;justify-content:center;font-family:system-ui;color:white;text-align:center\"><div><h1 style=\"font-size:36px;margin:0\">Spring Sale — 30% Off</h1><p style=\"font-size:18px;opacity:0.9\">This weekend only</p></div></div>"
}'

# Option B: Using AI Gateway API (generate-image skill)
python3 /home/node/.claude/skills/generate-image/scripts/generate_image.py \
  "email header banner, gradient purple to blue, text Spring Sale 30% Off, 600x250, clean modern design" \
  --output ./tmp/email-header.png --format b64_json
```

## CRITICAL: Image Embedding for Emails

**Images in HTML emails MUST use one of these methods. Local file paths will NOT work.**

### Method 1: Base64 Data URI (Recommended for this environment)

This is the most reliable method when you don't have a public image hosting service. Works in Gmail, Apple Mail, Yahoo Mail, and most modern email clients.

**Step 1: Generate the image**
```bash
python3 /home/node/.claude/skills/generate-image/scripts/generate_image.py \
  "your image prompt here" \
  --output ./tmp/email-image.png --format b64_json
```

**Step 2: Convert to base64 data URI for embedding**
```bash
# Convert local image file to base64 data URI string
BASE64_IMG=$(python3 -c "
import base64, sys
with open('./tmp/email-image.png', 'rb') as f:
    data = base64.b64encode(f.read()).decode('utf-8')
print(f'data:image/png;base64,{data}')
")
```

**Step 3: Use the data URI in your HTML email**
```html
<img src="data:image/png;base64,iVBORw0KGgoAAAANSUh..."
     alt="Descriptive alt text"
     width="600"
     style="display:block;max-width:100%;height:auto;border:0;">
```

### Method 2: Public URL (Best compatibility)

If `infsh` returns a CDN URL, or you have access to image hosting, use the URL directly:

```html
<img src="https://cdn.example.com/email-banner.png"
     alt="Descriptive alt text"
     width="600"
     style="display:block;max-width:100%;height:auto;border:0;">
```

### Method 3: CSS-Only Design (No images needed - Best deliverability)

For banners and headers, use pure HTML/CSS instead of images. This guarantees display across ALL email clients:

```html
<!-- Pure HTML/CSS header - works everywhere, no image loading issues -->
<table cellpadding="0" cellspacing="0" border="0" width="100%"
       style="background:linear-gradient(135deg,#667eea,#764ba2);">
  <tr>
    <td align="center" style="padding:40px 20px;">
      <h1 style="color:#ffffff;font-family:Arial,sans-serif;font-size:36px;margin:0;font-weight:bold;">
        Spring Sale — 30% Off
      </h1>
      <p style="color:#ffffff;font-family:Arial,sans-serif;font-size:18px;margin:8px 0 0;opacity:0.9;">
        This weekend only
      </p>
    </td>
  </tr>
</table>
```

### NEVER Do This

```html
<!-- WRONG: Local file path - recipient cannot access your filesystem -->
<img src="./tmp/email-image.png">
<img src="/home/user/images/banner.png">
<img src="file:///path/to/image.png">

<!-- WRONG: Raw binary data - will show garbled text -->
<img src="PNG binary data here...">
```

### Complete End-to-End Example: Generate Image + Send Email

```bash
# Step 1: Generate header image
python3 /home/node/.claude/skills/generate-image/scripts/generate_image.py \
  "professional email header banner for wellness shop spring sale, warm colors, clean design" \
  --output ./tmp/email-header.png --format b64_json

# Step 2: Build HTML email with base64 embedded image
BASE64_IMG=$(python3 -c "
import base64
with open('./tmp/email-header.png', 'rb') as f:
    print(base64.b64encode(f.read()).decode('utf-8'))
")

# Step 3: Construct and send the HTML email
HTML_BODY="<html><body style='margin:0;padding:0;background:#f4f4f4;'>
<table cellpadding='0' cellspacing='0' border='0' width='100%'>
<tr><td align='center' style='padding:20px 0;'>
<table cellpadding='0' cellspacing='0' border='0' width='600' style='background:#ffffff;'>
<tr><td>
<img src='data:image/png;base64,${BASE64_IMG}' alt='Spring Sale Banner' width='600' style='display:block;max-width:100%;height:auto;border:0;'>
</td></tr>
<tr><td style='padding:30px 40px;font-family:Arial,sans-serif;'>
<h1 style='color:#333;font-size:24px;margin:0 0 16px;'>Special Spring Offer</h1>
<p style='color:#666;font-size:16px;line-height:1.5;margin:0 0 24px;'>Shop our exclusive wellness collection with 30% off all items this weekend.</p>
<table cellpadding='0' cellspacing='0' border='0'>
<tr><td align='center' bgcolor='#22c55e' style='border-radius:6px;'>
<a href='https://example.com/shop' target='_blank' style='font-size:16px;font-family:Arial,sans-serif;color:#ffffff;text-decoration:none;padding:12px 24px;display:inline-block;font-weight:bold;'>Shop Now</a>
</td></tr></table>
</td></tr>
<tr><td style='padding:20px 40px;border-top:1px solid #eee;font-family:Arial,sans-serif;font-size:12px;color:#999;text-align:center;'>
<p>You received this because you subscribed. <a href='#' style='color:#999;'>Unsubscribe</a></p>
</td></tr>
</table>
</td></tr></table>
</body></html>"

# Step 4: Send the email
bash /home/node/.claude/skills/capymail/scripts/send_email.sh \
  --to "recipient@example.com" \
  --subject "Spring Sale — 30% Off This Weekend" \
  --html "$HTML_BODY"
```

### Image Embedding Compatibility Table

| Method | Gmail | Apple Mail | Outlook | Yahoo | Mobile |
|--------|-------|------------|---------|-------|--------|
| **Public URL** | Yes | Yes | Yes | Yes | Yes |
| **Base64 data URI** | Yes | Yes | Partial* | Yes | Yes |
| **CSS-only (no image)** | Yes | Yes | Yes | Yes | Yes |
| **Local file path** | No | No | No | No | No |

*Outlook desktop may not display base64 images larger than ~30KB. Keep images optimized.

### Base64 Image Size Guidelines

| Image Size (original) | Base64 Size (~33% larger) | Recommendation |
|-----------------------|---------------------------|----------------|
| < 50KB | < 67KB | Safe for all clients |
| 50-100KB | 67-133KB | Works in Gmail/Apple Mail, may clip in Outlook |
| > 100KB | > 133KB | Consider CSS-only design or public URL instead |
| > 102KB total email | - | Gmail clips entire email — avoid |


## Email Width & Layout

| Constraint | Value | Why |
|-----------|-------|-----|
| **Max width** | 600px | Gmail, Outlook rendering standard |
| **Mobile width** | 320-414px | Responsive fallback |
| **Single column** | Preferred | Better mobile rendering |
| **Two column** | Use sparingly | Breaks on many clients |
| **Image width** | 600px max, 300px for 2-col | Retina: provide 2x (1200px) |
| **Font size (body)** | 14-16px | Below 14px is hard to read on mobile |
| **Font size (heading)** | 22-28px | Must be scannable |
| **Line height** | 1.5 | Readability on all devices |

### The Inverted Pyramid Layout

The most effective email layout funnels attention to a single CTA:

```
┌──────────────────────────────────┐
│           HEADER IMAGE           │  ← Brand/visual hook
│          (600 x 200-300)         │
├──────────────────────────────────┤
│                                  │
│     Headline (one line)          │  ← What's this about
│                                  │
│     2-3 sentences of body copy   │  ← Why should I care
│     explaining the value.        │
│                                  │
│        ┌──────────────┐          │
│        │   CTA BUTTON  │         │  ← One clear action
│        └──────────────┘          │
│                                  │
├──────────────────────────────────┤
│     Footer: Unsubscribe link     │
└──────────────────────────────────┘
```

## Subject Lines

### Formulas That Work

| Formula | Example | Open Rate Impact |
|---------|---------|-----------------|
| Number + benefit | "5 ways to cut your build time in half" | High |
| Question | "Are you still deploying on Fridays?" | High |
| How-to | "How to automate your reports in 3 steps" | Medium-High |
| Urgency (genuine) | "Last day: 30% off annual plans" | High (if real) |
| Personalized | "[Name], your weekly report is ready" | Very High |
| Curiosity gap | "The one feature our users can't stop talking about" | Medium-High |

### Rules

| Rule | Value |
|------|-------|
| **Length** | 30-50 characters (mobile truncates at ~35) |
| **Preview text** | First 40-100 chars after subject — design this intentionally |
| **Emoji** | Max 1, at start or end, test with your audience |
| **ALL CAPS** | Never — triggers spam filters |
| **Spam trigger words** | Avoid: "free", "act now", "limited time", "click here" in subject |
| **Personalization** | [First name] in subject lifts open rates 20%+ |

### Preview Text

The preview text appears after the subject line in the inbox. Don't waste it.

```
❌ "View this email in your browser" (default, wasted space)
❌ "Having trouble viewing this?" (no one cares)

✅ Subject: "5 ways to cut build time"
   Preview: "Number 3 saved us 6 hours per week"

✅ Subject: "Your monthly report is ready"
   Preview: "Revenue up 23% — here's what drove it"
```

## Email Types

### Welcome Email (Automated, Day 0)

| Element | Content |
|---------|---------|
| Subject | "Welcome to [Product] — here's what's next" |
| Header | Brand image or product screenshot |
| Body | 3-4 sentences: what they signed up for, what to expect, one quick win |
| CTA | "Complete your setup" or "Try your first [action]" |
| Timing | Immediately after signup |

### Promotional / Campaign

| Element | Content |
|---------|---------|
| Subject | Benefit-focused, urgency if real |
| Header | Hero image showing the offer/outcome |
| Body | Problem → solution → offer → deadline |
| CTA | "Get 30% Off" or "Start Free Trial" |
| Urgency | Real deadline, not fake scarcity |

### Product Update / Changelog

| Element | Content |
|---------|---------|
| Subject | "New: [Feature name] is here" |
| Header | Screenshot or visual of the feature |
| Body | What's new, why it matters, how to use it |
| CTA | "Try [feature]" |

### Transactional (Receipts, Confirmations)

| Rule | Why |
|------|-----|
| Clear purpose in subject | "Your order #1234 is confirmed" |
| Minimal design | Don't confuse with marketing |
| Key info above the fold | Order number, amount, date |
| No promotional content (mostly) | CAN-SPAM allows some, but keep minimal |

## Header Image Design

### Option A: CSS-Only Headers (Recommended - No image loading issues)

CSS-only headers guarantee display across all email clients. Use this approach when possible:

```html
<!-- Welcome email header - pure HTML/CSS -->
<table cellpadding="0" cellspacing="0" border="0" width="100%"
       style="background:linear-gradient(135deg,#2d3436,#636e72);">
  <tr>
    <td style="padding:40px;font-family:Arial,sans-serif;color:#ffffff;">
      <p style="font-size:14px;text-transform:uppercase;letter-spacing:2px;opacity:0.7;margin:0;">Welcome to</p>
      <h1 style="font-size:42px;margin:8px 0 0;font-weight:800;color:#ffffff;">DataFlow</h1>
      <p style="font-size:18px;opacity:0.8;margin-top:4px;color:#ffffff;">Your data, automated</p>
    </td>
  </tr>
</table>

<!-- Sale / promotional header - pure HTML/CSS -->
<table cellpadding="0" cellspacing="0" border="0" width="100%"
       style="background:linear-gradient(135deg,#e74c3c,#c0392b);">
  <tr>
    <td align="center" style="padding:40px 20px;font-family:Arial,sans-serif;color:#ffffff;text-align:center;">
      <p style="font-size:20px;opacity:0.9;margin:0;color:#ffffff;">This Weekend Only</p>
      <h1 style="font-size:72px;margin:8px 0;font-weight:900;color:#ffffff;">30% OFF</h1>
      <p style="font-size:18px;opacity:0.8;color:#ffffff;">All annual plans. Ends Sunday.</p>
    </td>
  </tr>
</table>
```

### Option B: AI-Generated Header Images

When you need photo-realistic or complex visual headers, generate images and embed them properly:

```bash
# Step 1: Generate image using infsh (if authenticated)
infsh app run infsh/html-to-image --input '{
  "html": "<div style=\"width:600px;height:250px;background:linear-gradient(135deg,#667eea,#764ba2);display:flex;align-items:center;justify-content:center;font-family:system-ui;color:white;text-align:center\"><div><h1 style=\"font-size:36px;margin:0\">Spring Sale</h1></div></div>"
}' --save ./tmp/infsh-result.json

# Extract the image URL from infsh output and use it in <img src="URL">
# OR save the image locally and convert to base64 (see "Image Embedding for Emails" section)

# Alternative: Generate with AI Gateway API
python3 /home/node/.claude/skills/generate-image/scripts/generate_image.py \
  "clean modern email header banner, abstract flowing data visualization, dark blue gradient, tech aesthetic, minimal, no text" \
  --output ./tmp/email-header.png --format b64_json

# Convert to base64 for embedding
BASE64_IMG=$(python3 -c "
import base64
with open('./tmp/email-header.png', 'rb') as f:
    print(base64.b64encode(f.read()).decode('utf-8'))
")

# Use in HTML: <img src="data:image/png;base64,${BASE64_IMG}" alt="Header" width="600">
```

**IMPORTANT**: After generating any image, you MUST embed it using one of the methods described in the "Image Embedding for Emails" section above. Never use local file paths in email HTML.

## CTA Buttons

| Rule | Value |
|------|-------|
| **Width** | 200-300px, not full width |
| **Height** | 44-50px minimum (tap target) |
| **Color** | High contrast with background |
| **Text** | Action verb + outcome: "Start Free Trial" |
| **Shape** | Rounded corners (4-8px border-radius) |
| **Placement** | Above the fold, repeated at bottom for long emails |
| **Quantity** | ONE primary CTA per email |

### Bulletproof Buttons

HTML buttons render differently across email clients. Use the "bulletproof button" technique (VML for Outlook, HTML/CSS for everything else):

```html
<!-- Bulletproof button (works everywhere including Outlook) -->
<table cellpadding="0" cellspacing="0" border="0">
  <tr>
    <td align="center" bgcolor="#22c55e" style="border-radius:6px;">
      <a href="https://yoursite.com/action" target="_blank"
         style="font-size:16px;font-family:sans-serif;color:#ffffff;
                text-decoration:none;padding:12px 24px;display:inline-block;
                font-weight:bold;">
        Start Free Trial
      </a>
    </td>
  </tr>
</table>
```

## Mobile Optimization

| Rule | Why |
|------|-----|
| Single column layout | Multi-column breaks on mobile |
| Font minimum 14px | Smaller is unreadable |
| CTA button minimum 44px tall | Apple/Android tap target |
| Images scale to 100% width | Prevent horizontal scroll |
| Stack elements vertically | Side-by-side breaks on narrow screens |
| Test on Gmail app, Apple Mail, Outlook | The big 3 email clients |

**60%+ of emails are opened on mobile.** Design mobile-first.

## Deliverability Checklist

| Factor | Rule |
|--------|------|
| Image-to-text ratio | Max 40% images, 60% text (spam filters flag image-heavy emails) |
| Alt text on images | Always — images blocked by default in many clients |
| Unsubscribe link | Required by law (CAN-SPAM, GDPR) — make it easy to find |
| From name | Recognizable person or brand name |
| Reply-to | Real address, not no-reply@ (hurts deliverability) |
| List hygiene | Remove bounces, clean inactive subscribers quarterly |
| SPF/DKIM/DMARC | Technical authentication — set up once, critical for inbox |

## Common Mistakes

| Mistake | Problem | Fix |
|---------|---------|-----|
| **Local file paths in img src** | **Images show as broken/garbled in recipient's email** | **Use base64 data URI, public URL, or CSS-only design** |
| **Raw binary in img src** | **Shows garbled text instead of image** | **Must base64-encode and use `data:image/png;base64,...` format** |
| No preview text | Shows "View in browser" or random code | Set preview text intentionally |
| Image-only emails | Blocked images = blank email + spam risk | 60%+ text, alt text on images |
| Multiple CTAs | Decision paralysis, lower click rate | One primary CTA per email |
| Tiny text | Unreadable on mobile | Minimum 14px body, 22px headings |
| no-reply@ sender | Hurts deliverability, feels impersonal | Use real reply address |
| No mobile testing | Broken layout for 60%+ of readers | Test on Gmail app + Apple Mail |
| Missing unsubscribe | Illegal (CAN-SPAM) + spam complaints | Clear unsubscribe link in footer |
| Over-designing | Email clients render CSS inconsistently | Simple layouts, inline styles |
| Fake urgency | Erodes trust, trains users to ignore | Only use real deadlines |
| **Oversized base64 images** | **Gmail clips emails > 102KB** | **Keep images < 50KB, prefer CSS-only headers** |

## Related Skills

```bash
npx skills add inference-sh/skills@landing-page-design
npx skills add inference-sh/skills@ai-image-generation
npx skills add inference-sh/skills@prompt-engineering
```

Browse all apps: `infsh app list`

## MANUAL MIGRATION REQUIRED

Claude `allowed-tools` was preserved as prompt guidance, not a Codex permission boundary.

You're allowed to use these tools:

- Bash(infsh *)
- Bash(python3 *generate_image*)
- Bash(python3 *send_email*)
- Bash(bash *send_email*)
- Bash(send-email *)
