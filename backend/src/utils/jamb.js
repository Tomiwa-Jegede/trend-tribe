// src/utils/jamb.js — Live JAMB matriculation check via efacility
// Scrapes https://efacility.jamb.gov.ng/CheckMatriculationList
// Returns { isRun, institution, programme, fullName, statusText }

const JAMB_URL = "https://efacility.jamb.gov.ng/CheckMatriculationList";

// Simple in-memory cache 24h to avoid hammering JAMB
const cache = new Map(); // key -> { data, expiresAt }
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

function getCached(key) {
  const hit = cache.get(key);
  if (hit && hit.expiresAt > Date.now()) return hit.data;
  if (hit) cache.delete(key);
  return null;
}
function setCached(key, data) {
  cache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
}

function extractInput(html, id) {
  const re = new RegExp(`<input[^>]+id=["']${id}["'][^>]*value=["']([^"']*)["']`, "i");
  const m = html.match(re);
  if (m) return m[1];
  // alternative: name attribute
  const re2 = new RegExp(`<input[^>]+name=["']${id}["'][^>]*value=["']([^"']*)["']`, "i");
  const m2 = html.match(re2);
  return m2 ? m2[1] : "";
}

function extractInstitution(html) {
  // Look for Institution: <span>...</span>
  const m = html.match(/Institution:\s*<span[^>]*>([^<]+)<\/span>/i);
  return m ? m[1].trim() : "";
}
function extractProgramme(html) {
  const m = html.match(/Programme:\s*<span[^>]*>([^<]+)<\/span>/i);
  return m ? m[1].trim() : "";
}
function extractName(html) {
  const m = html.match(/<h1[^>]*>([^<]+)<\/h1>\s*<p>\s*<strong>Status:/i);
  return m ? m[1].trim() : "";
}
function extractStatus(html) {
  const m = html.match(/<strong>Status:\s*<\/strong>\s*<b[^>]*>([^<]+)<\/b>/i);
  return m ? m[1].trim() : "";
}

function findExamValue(html, year) {
  // <option value="36">2024 Unified Tertiary...
  const re = new RegExp(`<option\\s+value="(\\d+)"[^>]*>\\s*${year}\\s+Unified`, "i");
  const m = html.match(re);
  return m ? m[1] : null;
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 10000) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(t);
  }
}

async function verifyJamb({ regNumber, examYear }) {
  const reg = String(regNumber || "").trim().toUpperCase();
  const year = parseInt(examYear, 10);
  if (!reg || !year) throw new Error("JAMB reg number and exam year required");
  const cacheKey = `${year}-${reg}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  let getHtml;
  try {
    const res = await fetchWithTimeout(JAMB_URL, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        Accept: "text/html",
      },
    }, 10000);
    if (!res.ok) throw new Error(`JAMB site returned ${res.status}`);
    getHtml = await res.text();
  } catch (err) {
    if (err.name === "AbortError") throw Object.assign(new Error("Can't confirm Jamb Registration now try again later"), { status: 503 });
    throw Object.assign(new Error("Can't confirm Jamb Registration now try again later"), { status: 503, cause: err });
  }

  const viewState = extractInput(getHtml, "__VIEWSTATE");
  const eventValidation = extractInput(getHtml, "__EVENTVALIDATION");
  const viewStateGen = extractInput(getHtml, "__VIEWSTATEGENERATOR");
  if (!viewState || !eventValidation) {
    throw Object.assign(new Error("Can't confirm Jamb Registration now try again later"), { status: 503 });
  }
  const examValue = findExamValue(getHtml, String(year));
  if (!examValue) {
    throw Object.assign(new Error("Invalid JAMB exam year"), { status: 400 });
  }

  const body = new URLSearchParams({
    __EVENTTARGET: "lnkSearch",
    __EVENTARGUMENT: "",
    __VIEWSTATE: viewState,
    __VIEWSTATEGENERATOR: viewStateGen,
    __EVENTVALIDATION: eventValidation,
    ddlExamination: examValue,
    txtRegNumber: reg,
  });

  let postHtml;
  try {
    const res2 = await fetchWithTimeout(JAMB_URL, {
      method: "POST",
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Content-Type": "application/x-www-form-urlencoded",
        Referer: JAMB_URL,
        Origin: "https://efacility.jamb.gov.ng",
      },
      body: body.toString(),
    }, 10000);
    if (!res2.ok) throw new Error(`JAMB site returned ${res2.status}`);
    postHtml = await res2.text();
  } catch (err) {
    if (err.name === "AbortError") throw Object.assign(new Error("Can't confirm Jamb Registration now try again later"), { status: 503 });
    if (err.status === 503) throw err;
    throw Object.assign(new Error("Can't confirm Jamb Registration now try again later"), { status: 503, cause: err });
  }

  // Check for not registered message
  if (/You Did not Register for this Examination/i.test(postHtml)) {
    const result = { isRun: false, institution: "", programme: "", fullName: "", statusText: "You Did not Register for this Examination", raw: postHtml.slice(0, 2000) };
    setCached(cacheKey, result);
    return result;
  }

  const institution = extractInstitution(postHtml);
  const programme = extractProgramme(postHtml);
  const fullName = extractName(postHtml);
  const statusText = extractStatus(postHtml);

  // If no institution found but page still shows form, likely invalid reg
  if (!institution && !statusText) {
    // Try to detect any error
    const hasResult = /JAMB Matriculation List/i.test(postHtml) && /Your Personal And Admission Details/i.test(postHtml);
    if (!hasResult) {
      const result = { isRun: false, institution: "", programme, fullName, statusText: "Not found on matriculation list", raw: postHtml.slice(0, 2000) };
      setCached(cacheKey, result);
      return result;
    }
  }

  const isRun = /Redeemers University/i.test(institution);
  const result = { isRun, institution, programme, fullName, statusText };
  setCached(cacheKey, result);
  return result;
}

module.exports = { verifyJamb, _cache: cache };
