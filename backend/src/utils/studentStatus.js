// src/utils/studentStatus.js — derive Student / Alumni / Fresher from matricNumber
// Matric format: RUN/<DEPT>/<YY>/<NUM> e.g. RUN/CMP/24/17209, Run/phs/22/11856
// YY is entry year (24 -> 2024). Duration per RUN NUC handbook.
// Alumni only from Jan 1 of year after gradYear (e.g. 2028 grad -> Alumni in 2029).
// Fresher (isFresher && !matric) is exception — shows FRESHER, not blocked like legacy SELLER.

// 5-year UTME programmes at Redeemer's University (per run.edu.ng Admission Requirements):
// - Law, Nursing (B.NSc), Physiotherapy, Medical Lab Science
// - Engineering: Mechanical, Civil, Computer, Chemical, Electrical/Electronics
// - Built Environment: Quantity Surveying, Surveying & Geo-Informatics, Building Tech, Estate Mgt, Urban & Regional Planning
// - Environmental Management & Toxicology
// Architecture is 4 years (exception in Built Environment).
// Aliases cover matric dept codes (e.g. CEE/CVE for Civil, ELE/EEE for Electrical).
const FIVE_YEAR_DEPTS = new Set([
  // Law
  "LAW",
  // Basic Medical Sciences — 5yr
  "NUR", "NSC", "BNS", "NSS", // Nursing Science
  "PHT", "BPT", // Physiotherapy (PHY/PHS is Physiology 4yr, not 5yr)
  "MLS", "MLD", "MLT", // Medical Laboratory Science
  // Engineering — 5yr
  "MEE", "MEC", // Mechanical
  "CEE", "CVE", "CIV", // Civil
  "EEE", "ELE", "EET", // Electrical/Electronics
  "CPE", "CEN", "COE", // Computer Engineering (CMP/CSC is Computer Science 4yr)
  "CHE", // Chemical Engineering
  // Built Environment — 5yr (ARC is 4yr, excluded)
  "QSV", "QSR", "BQS", // Quantity Surveying
  "SVG", "SUG", "GIM", // Surveying & Geo-Informatics
  "BLD", "BGT", "BCT", // Building Technology
  "ESM", "EVM", "EST", // Estate Management
  "URP", "URB", // Urban & Regional Planning
  // Natural Sciences — 5yr exception
  "EMT", "EVT", "EVS", // Environmental Management & Toxicology
]);

function parseMatric(matric) {
  if (!matric || typeof matric !== "string") return null;
  const m = matric.trim();
  if (!m) return null;
  if (m.toLowerCase() === "alumni") return { entryYear: null, dept: null, alumniLiteral: true };
  const parts = m.split("/").map((s) => s.trim()).filter(Boolean);
  if (parts.length < 3) return null;
  // RUN/<DEPT>/<YY>/...  -> dept = parts[1], yy = parts[2]
  // Tolerate extra / spaces and case
  let dept = null;
  let yearSeg = null;
  if (parts.length >= 3) {
    // first part is RUN-like, second is dept, third is year
    dept = parts[1] ? parts[1].toUpperCase() : null;
    yearSeg = parts[2];
  }
  const yy = parseInt(yearSeg, 10);
  if (Number.isNaN(yy) || yearSeg.length !== 2) return null;
  const yyyy = yy < 50 ? 2000 + yy : 1900 + yy;
  return { entryYear: yyyy, dept, yearSeg };
}

function getDurationYears(dept) {
  if (dept && FIVE_YEAR_DEPTS.has(dept.toUpperCase())) return 5;
  return 4;
}

function getAcademicStatus({ matricNumber, isFresher }) {
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
  if (curYear > gradYear) return "ALUMNI";
  return "STUDENT";
}

module.exports = { parseMatric, getDurationYears, getAcademicStatus };
