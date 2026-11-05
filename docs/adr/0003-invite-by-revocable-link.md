# Households are joined via revocable shareable links, not email invites

An invite is a link, also rendered as a QR code, that can be sent over any channel such as WhatsApp. The link is revocable and rotatable by any member, and accepting it requires signing in through it. Email invites were rejected because they need third-party email infrastructure and per-invite email volume on a free product.

## Considered Options

- Invite by email with a secure link (rejected): requires an email provider and sends one email per invite; the free tier is reserved for auth emails.
- Claim a household by name after sign-up (rejected): no privacy control, easy to join the wrong household.

## Consequences

- Anyone holding the link can join, so link revocation and member removal are mandatory features, not nice-to-haves.
- No email is sent for invites; the link itself is the whole mechanism.
