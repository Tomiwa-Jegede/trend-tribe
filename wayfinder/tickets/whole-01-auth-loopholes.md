# Ticket — Auth Loopholes

## Question
Auth has `requestSellerUpgrade` email hijack (stores OTP on User but sends to runEmail without verifying equality), `matricNumber` dup not checked, `login` `identifier.toLowerCase()` crash on number, `resetToken` stored plaintext, and `resendRegistrationOtp` missing validators. Which to fix now and how — hash reset tokens, store `pendingRunEmail`, add `findUnique` for matric, and `isString` validator?

Label: wayfinder:grilling
Status: open
Blocks: whole-06-frontend-auth
