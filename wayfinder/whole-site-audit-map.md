# Wayfinder Map — Whole Site Audit (Simple English)

## Destination
We have a simple, honest list of everything that could be wrong across the whole app — logins, listings, marketplace, gigs, wallet, chats, alerts, push messages, admin pages, offline use, and the rest — with each problem explained plainly (what it is, why it hurts you, what we should do), sorted so you can say which to fix first. No fixes yet, just the map.

## Notes
- Covers the whole app: login/sign-up, listings, marketplace/discover, gigs, wallet, chats, alerts (notifications), push, admin, offline/PWA, and anything else we find
- Looks for: things that are broken, things that loop forever, two places fighting over the same data, old data popping back, things that leak memory, and anything a good app wouldn't do
- Skills every session should consult: `ui-ux-pro-max` for how it feels, `ponytail` for the simplest honest fix
- Mode: Planning only — we make the map and tickets, you pick the order, then we fix

## Decisions so far
<!-- one line per closed ticket, plain English gist + link -->

## Not yet specified
- Which problems actually lose you money or trust vs just messy code
- How bad each bug feels to a student using the app on a cheap phone with bad internet
- Whether any real user data has already been affected by these bugs

## Out of scope
- Fixing anything (that comes after you approve the map)
- Adding brand new features that aren't fixing a bug
- Re-designing how the app looks unless it's part of fixing a bug
