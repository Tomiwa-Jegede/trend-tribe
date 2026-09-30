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
  // Exactly 4 segments: RUN/<DEPT>/<YY>/<NUM>. No filtering of empty
  // segments — "RUN/CMP/24/" and "RUN//24/12345" must be rejected, not
  // silently collapsed into a shorter-but-valid split.
  const parts = m.split("/").map((s) => s.trim());
  if (parts.length !== 4) return null;
  if (parts[0].toUpperCase() !== "RUN") return null;
  const dept = parts[1];
  if (!dept) return null;
  const yearSeg = parts[2];
  if (!/^\d{2}$/.test(yearSeg)) return null;
  // 4th segment is the student's unique number — digits only
  if (!/^\d+$/.test(parts[3])) return null;
  const yy = parseInt(yearSeg, 10);
  const yyyy = yy < 50 ? 2000 + yy : 1900 + yy;
  return { entryYear: yyyy, dept: dept.toUpperCase(), yearSeg };
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
