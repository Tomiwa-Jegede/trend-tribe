# JAMB Live Matriculation Check

Label: `wayfinder:build`
Parent: `wayfinder/fresher-seller-map.md`
Blocked by: Fresher Seller Data Model
Blocks: Registration Flow
Status: RESOLVED — ready to build

## Question
How do we confirm the JAMB year + reg number is really for Redeemers University without adding a paid API?

## Resolution
Reuse the public JAMB site `https://efacility.jamb.gov.ng/CheckMatriculationList` — no official API, just scraping the ASP.NET form.

Flow (server-side, 3 sec timeout, cached 24h by reg+year):
1. `GET` the page to get `__VIEWSTATE`, `__EVENTVALIDATION`, `__VIEWSTATEGENERATOR`
2. `POST` with `__EVENTTARGET=lnkSearch`, `ddlExamination=<yearValue>`, `txtRegNumber=<reg>` (yearValue: 36=2024, 35=2023, etc.)
3. Parse returned HTML for `Institution:` — if it contains `Redeemers University` and `Status` contains `Congratulations, you are on the Matriculation List` → pass, else fail
4. On success, allow fresher registration to continue to OTP; on fail, return 400 `JAMB record not found for Redeemers University`

Tested live:
- `2024 + 202441390932IF` → Redeemers University, Computer Science, Congratulations ✅
- `2024 + 202440567105CA` → Redeemers University, Computer Science, Congratulations ✅
- `2024 + 202440567105CF` → `You Did not Register for this Examination` ❌

Why this shape:
- Same trust as matric today but actually checks JAMB — no new paid provider, just scraping the page the user already knows.
- Cached by reg+year in memory/DB to avoid hitting JAMB on every retry and to survive JAMB downtime briefly.
- If JAMB site down (timeout/error), return 503 `Can't confirm Jamb Registration now try again later` — don't silently allow.

Verification:
- Valid RUN JAMB → 200 and fresher account created
- Invalid/non-RUN JAMB → 400 blocked before OTP
- JAMB site down → 503 with retry, not 500

Assets: none (decision only)
