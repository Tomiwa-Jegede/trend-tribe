// Internally, tokenBalance is stored as an integer count of QUARTER-token
// units (1 whole token = 4 units) to avoid floating-point rounding errors
// from repeated fractional deductions. This helper converts a raw unit
// count into the token value shown to users. Never send raw units to the
// frontend — always pass through toDisplayTokens() first.
const TOKEN_UNIT = 4;

const toDisplayTokens = (units) => units / TOKEN_UNIT;

module.exports = { TOKEN_UNIT, toDisplayTokens };
