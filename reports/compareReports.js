// compareReports.js
// Usage: from project root run: node reports/compareReports.js

const fs = require('fs');
const path = require('path');

const reportsDir = __dirname; // since file is inside reports/
const outJson = path.join(reportsDir, 'summary.json');
const outCsv = path.join(reportsDir, 'summary.csv');

const severityOrder = ['CRITICAL','HIGH','MEDIUM','LOW','UNKNOWN'];

// helpers
function safeJSON(filePath) {
  try {
    const txt = fs.readFileSync(filePath, 'utf8').trim();
    if (!txt) return null;
    return JSON.parse(txt);
  } catch (e) {
    console.error(`Failed to parse JSON ${filePath}:`, e.message);
    return null;
  }
}

function normSeverity(s) {
  if (!s) return 'UNKNOWN';
  const x = String(s).toUpperCase();
  if (x.includes('CRIT')) return 'CRITICAL';
  if (x.includes('HIGH')) return 'HIGH';
  if (x.includes('MED')) return 'MEDIUM';
  if (x.includes('LOW')) return 'LOW';
  return 'UNKNOWN';
}

function extractTrivyVulns(data) {
  if (!data) return [];
  // Trivy commonly: data.Results[].Vulnerabilities or sometimes data.Vulnerabilities
  const byResults = Array.isArray(data.Results)
    ? data.Results.flatMap(r => r.Vulnerabilities || [])
    : [];
  const topLevel = Array.isArray(data.Vulnerabilities) ? data.Vulnerabilities : [];
  const candidates = [...byResults, ...topLevel];

  // fallback: search recursively for objects that look like vulnerabilities (have "VulnerabilityID" or "vulnerability")
  if (candidates.length === 0) {
    const found = [];
    const walk = obj => {
      if (!obj || typeof obj !== 'object') return;
      if (Array.isArray(obj)) { obj.forEach(walk); return; }
      if (obj.VulnerabilityID || obj.vulnerabilityID || obj.vulnerability) {
        found.push(obj);
        return;
      }
      Object.values(obj).forEach(walk);
    };
    walk(data);
    return found;
  }
  return candidates;
}

function extractGrypeVulns(data) {
  if (!data) return [];
  // Grype commonly: data.matches[].vulnerability  OR data.matches[].vulnerability.id & severity
  if (Array.isArray(data.matches)) {
    return data.matches.map(m => {
      const v = m.vulnerability || m.vuln || m.vulnerability || {};
      // sometimes severity is at m.vulnerability.severity or m.vulnerability.severity
      return {
        id: v.id || v.vulnerabilityID || v.VulnerabilityID || null,
        severity: v.severity || v.severityName || v.Severity || null,
        package: (m.artifact && m.artifact.name) || (m.package && m.package.name) || null
      };
    });
  }
  // some grype outputs: top-level "vulnerabilities" array
  if (Array.isArray(data.vulnerabilities)) {
    return data.vulnerabilities.map(v => ({
      id: v.id || v.VulnerabilityID || null,
      severity: v.severity || v.Severity || null,
      package: v.pkgName || v.package || null
    }));
  }

  // fallback search
  const found = [];
  const walk = obj => {
    if (!obj || typeof obj !== 'object') return;
    if (Array.isArray(obj)) { obj.forEach(walk); return; }
    if (obj.id && obj.severity) {
      found.push({ id: obj.id, severity: obj.severity, package: obj.package || null });
      return;
    }
    if (obj.VulnerabilityID || obj.vulnerability) {
      const id = obj.VulnerabilityID || (obj.vulnerability && obj.vulnerability.id);
      const severity = obj.Severity || (obj.vulnerability && obj.vulnerability.severity);
      found.push({ id, severity, package: obj.package || null });
      return;
    }
    Object.values(obj).forEach(walk);
  };
  walk(data);
  return found;
}

function countBySeverity(list, keyId = 'VulnerabilityID') {
  const counts = { CRITICAL:0, HIGH:0, MEDIUM:0, LOW:0, UNKNOWN:0, TOTAL:0 };
  const setById = new Set();
  list.forEach(v => {
    // v might be a Trivy object (VulnerabilityID, Severity) or fallback shape
    const id = v.VulnerabilityID || v.id || v.vulnerabilityID || v.cve || null;
    const sev = normSeverity(v.Severity || v.severity || v.cvss || v.severityName || null);
    counts[sev] = (counts[sev] || 0) + 1;
    counts.TOTAL += 1;
    if (id) setById.add(id);
  });
  return { counts, ids: setById };
}

// main
const files = fs.readdirSync(reportsDir).filter(f => f.endsWith('.json'));
const services = {};

// find pairs by filename pattern: <service>-trivy.json or <service>-grype.json
const r = /^(.+)-(trivy|grype)\.json$/i;
files.forEach(f => {
  const m = f.match(r);
  if (!m) return;
  const svc = m[1];
  const kind = m[2].toLowerCase();
  services[svc] = services[svc] || {};
  services[svc][kind] = path.join(reportsDir, f);
});

const summary = {};
Object.entries(services).forEach(([svc, files]) => {
  const trivyFile = files.trivy;
  const grypeFile = files.grype;
  const svcSummary = { trivy: null, grype: null, common: null };

  if (trivyFile && fs.existsSync(trivyFile)) {
    const td = safeJSON(trivyFile);
    const vulnList = extractTrivyVulns(td);
    svcSummary.trivy = countBySeverity(vulnList, 'VulnerabilityID');
  } else {
    svcSummary.trivy = { counts: {CRITICAL:0,HIGH:0,MEDIUM:0,LOW:0,UNKNOWN:0,TOTAL:0}, ids: new Set() };
  }

  if (grypeFile && fs.existsSync(grypeFile)) {
    const gd = safeJSON(grypeFile);
    const vulnList = extractGrypeVulns(gd);
    svcSummary.grype = countBySeverity(vulnList, 'id');
  } else {
    svcSummary.grype = { counts: {CRITICAL:0,HIGH:0,MEDIUM:0,LOW:0,UNKNOWN:0,TOTAL:0}, ids: new Set() };
  }

  // compute intersection
  const trIds = svcSummary.trivy.ids;
  const grIds = svcSummary.grype.ids;
  const common = [...trIds].filter(id => grIds.has(id));
  svcSummary.common = { count: common.length, ids: common };

  // convert sets to arrays for JSON
  svcSummary.trivy.ids = [...trIds];
  svcSummary.grype.ids = [...grIds];

  summary[svc] = svcSummary;
});

// write summary JSON
fs.writeFileSync(outJson, JSON.stringify(summary, null, 2), 'utf8');

// also write a CSV summary (service, tool, critical, high, medium, low, unknown, total, commonCount)
const csvLines = ['service,tool,CRITICAL,HIGH,MEDIUM,LOW,UNKNOWN,TOTAL,commonWithOtherTool'];
Object.entries(summary).forEach(([svc, s]) => {
  const t = s.trivy.counts;
  csvLines.push([svc,'trivy',t.CRITICAL,t.HIGH,t.MEDIUM,t.LOW,t.UNKNOWN,t.TOTAL,s.common.count].join(','));
  const g = s.grype.counts;
  csvLines.push([svc,'grype',g.CRITICAL,g.HIGH,g.MEDIUM,g.LOW,g.UNKNOWN,g.TOTAL,s.common.count].join(','));
});
fs.writeFileSync(outCsv, csvLines.join('\n'), 'utf8');

// pretty print
console.log('=== Vulnerability Comparison Summary ===\n');
Object.entries(summary).forEach(([svc, s]) => {
  console.log(`Service: ${svc}`);
  console.log(`  Trivy: total=${s.trivy.counts.TOTAL} (C:${s.trivy.counts.CRITICAL} H:${s.trivy.counts.HIGH} M:${s.trivy.counts.MEDIUM} L:${s.trivy.counts.LOW})`);
  console.log(`  Grype: total=${s.grype.counts.TOTAL} (C:${s.grype.counts.CRITICAL} H:${s.grype.counts.HIGH} M:${s.grype.counts.MEDIUM} L:${s.grype.counts.LOW})`);
  console.log(`  Common vulnerability IDs found by both: ${s.common.count}`);
  if (s.common.count > 0) {
    console.log(`    sample common IDs: ${s.common.ids.slice(0,10).join(', ')}`);
  }
  console.log('');
});

console.log(`Summary written to: ${outJson}`);
console.log(`CSV written to: ${outCsv}`);
