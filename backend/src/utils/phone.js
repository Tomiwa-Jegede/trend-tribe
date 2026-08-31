const { parsePhoneNumberFromString } = require("libphonenumber-js");

// Normalizes any Nigerian phone number input (e.g. "08012345678",
// "+2348012345678", "2348012345678") into a consistent digits-only
// format with country code, no "+" — ready for wa.me/ links and
// consistent DB storage.
// Returns null if the input isn't a valid Nigerian number.
function normalizeWhatsapp(rawNumber) {
  if (!rawNumber || typeof rawNumber !== "string") return null;

  const trimmed = rawNumber.trim();
  if (!trimmed) return null;

  const phoneNumber = parsePhoneNumberFromString(trimmed, "NG");

  if (!phoneNumber || !phoneNumber.isValid()) return null;

  // phoneNumber.number is E.164 format, e.g. "+2348012345678"
  return phoneNumber.number.replace("+", "");
}

module.exports = { normalizeWhatsapp };
