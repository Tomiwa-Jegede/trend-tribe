// src/utils/studentStatus.js — mirrors backend/src/utils/studentStatus.js (keep in sync)
const FIVE_YEAR_DEPTS = new Set([
  "LAW",
  "NUR", "NSC", "BNS", "NSS",
  "PHT", "BPT",
  "MLS", "MLD", "MLT",
  "MEE", "MEC",
  "CEE", "CVE", "CIV",
  "EEE", "ELE", "EET",
  "CPE", "CEN", "COE",
  "CHE",
  "QSV", "QSR", "BQS",
  "SVG", "SUG", "GIM",
  "BLD", "BGT", "BCT",
  "ESM", "EVM", "EST",
  "URP", "URB",
  "EMT", "EVT", "EVS",
]);

export function parseMatric(matric) {
  if (!matric || typeof matric !== "string") return null;
  const m = matric.trim();
  if (!m) return null;
  if (m.toLowerCase() === "alumni") return { entryYear: null, dept: null, alumniLiteral: true };
  const parts = m.split("/").map((s) => s.trim()).filter(Boolean);
  if (parts.length < 3) return null;
  let dept = parts[1] ? parts[1].toUpperCase() : null;
  let yearSeg = parts[2];
  const yy = parseInt(yearSeg, 10);
  if (Number.isNaN(yy) || yearSeg.length !== 2) return null;
  const yyyy = yy < 50 ? 2000 + yy : 1900 + yy;
  return { entryYear: yyyy, dept, yearSeg };
}

export function getDurationYears(dept) {
  if (dept && FIVE_YEAR_DEPTS.has(dept.toUpperCase())) return 5;
  return 4;
}

export function getAcademicStatus({ matricNumber, isFresher }) {
  // Fresher exception: no matric yet -> FRESHER badge, not blocked like legacy SELLER
  if (isFresher && !matricNumber) return "FRESHER";
  if (!matricNumber) return null;
  if (String(matricNumber).trim().toLowerCase() === "alumni") return "ALUMNI";
  const parsed = parseMatric(matricNumber);
  if (!parsed) return null;
  if (parsed.alumniLiteral) return "ALUMNI";
  if (!parsed.entryYear) return null;
  const duration = getDurationYears(parsed.dept);
  const gradYear = parsed.entryYear + duration;
  const now = new Date();
  const curYear = now.getFullYear();
  // 2028 grad -> stays STUDENT through 2028, flips 2029-01-01
  if (curYear > gradYear) return "ALUMNI";
  return "STUDENT";
}
