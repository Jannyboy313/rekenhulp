# Ideas

Backlog of feature ideas. Not part of the roadmap and not specced: an idea becomes work only when
the user says so, and then goes through the normal spec iteration first. An idea that moves onto
the roadmap moves into the spec (§12) and leaves this file.

## Notifications

Daily reminders for people who installed the PWA.

Known constraints (from the discussion of 2026-10-27):

- Reliable route is Web Push: needs a server that stores subscriptions and sends the pushes. This
  conflicts with "no accounts, no database, no network calls" and the static `dist/`.
- Serverless alternatives (Periodic Background Sync, Notification Triggers) are Chromium-only or
  removed, and give no guaranteed daily time.
- Storing a reminder time is persistence, which is out of scope until v7 (spec §12).
- Cheap alternative: a calendar reminder (`.ics` download).
