# Ticket — Admin Loopholes

## Question
Admin has `DELETE /profit/clear` irreversible `deleteMany({})` with no audit/backup, `GET /reports` no pagination, and `POST /messages/broadcast` `createMany` no chunking (10k users → 65k param limit). Should we add `x-cron-secret` + backup, paginate reports, and chunk `createMany`?

Label: wayfinder:grilling
Status: open
