# ADR 0005: Brevo Transactional Email with Single Verified Sender

## Status
Accepted

## Context
Crucible supports interviewer password reset flows (`/forgot-password` and `/reset-password`).
Sending password reset emails requires a transactional email provider. Traditional providers require a custom purchased domain and configured DNS records (DKIM, SPF, MX). Under the zero-cost mandate (zero dollars, no purchased domain), a service allowing single sender verification is required.

Verified Brevo (formerly Sendinblue) Free Plan Limits & Rules:
- **Daily Sending Volume**: **300 emails/day** at $0.
- **Single Sender Verification**: Brevo permits verifying an individual sender email address without purchasing or owning an entire domain.
- **DMARC & Anti-Spam Limitation**: If the verified single sender is a consumer freemail address (e.g. `@gmail.com`, `@yahoo.com`), major email providers (Google, Yahoo, Microsoft) apply strict DMARC alignment (`p=reject`). Emails sent via a third-party relay like Brevo with a `@gmail.com` From header will be rejected or placed in Spam folders by receiving mail exchangers unless the recipient's domain matches or SPF/DKIM are aligned.

## Decision
1. Implement `BrevoEmailService` using Brevo's HTTP API (`POST https://api.brevo.com/v3/smtp/email`) with `api-key` header authentication.
2. In production, require the user to configure:
   - `BREVO_API_KEY`: Brevo v3 API key.
   - `BREVO_SENDER_EMAIL`: The specific sender email verified in the Brevo dashboard.
   - `BREVO_SENDER_NAME`: Sender display name (e.g., `Crucible`).
3. Document delivery expectations:
   - The free plan works reliably when sending to the verified owner address or domains permitting unaligned third-party relay.
   - If sending to arbitrary recipient corporate inboxes with strict DMARC enforcement without a custom domain, emails may be rejected by the recipient's mail exchanger.
   - For local development and fallback visibility, password reset tokens and links are always logged to the application console output with clear debugging notices.

## Consequences
- 100% free transactional email service without domain purchase.
- Fallback console logging ensures password resets can always be completed in staging or testing even if Brevo credentials are not yet configured.
