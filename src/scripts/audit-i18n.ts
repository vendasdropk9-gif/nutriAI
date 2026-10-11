/**
 * NutriAI i18n Hardcoded Text & Coverage Auditor
 * Path: src/scripts/audit-i18n.ts
 * 
 * Automatically scans all source files in src/ for potential hardcoded strings,
 * checks for t() function usage, calculates coverage score, and outputs
 * a detailed JSON report (i18n-audit-report.json).
 */

import * as fs from 'fs';
import * as path from 'path';

interface AuditResult {
  filePath: string;
  hardcodedStrings: { line: number; text: string }[];
  totalStringsFound: number;
}

function walkDir(dir: string, fileList: string[] = []): string[] {
  const files = fs.readdirSync(dir);
  files.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      if (!filePath.includes('node_modules') && !filePath.includes('dist') && !filePath.includes('.git')) {
        walkDir(filePath, fileList);
      }
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      fileList.push(filePath);
    }
  });
  return fileList;
}

function auditFile(filePath: string): AuditResult {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const hardcodedStrings: { line: number; text: string }[] = [];
  let totalStringsFound = 0;

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    // Skip comments, imports, exports, console logs, test attributes, tailwind classes
    if (
      trimmed.startsWith('//') ||
      trimmed.startsWith('/*') ||
      trimmed.startsWith('*') ||
      trimmed.startsWith('import ') ||
      trimmed.startsWith('export ') ||
      trimmed.includes('console.') ||
      trimmed.includes('data-testid') ||
      trimmed.includes('className=') ||
      trimmed.includes('key=') ||
      trimmed.includes('href=') ||
      trimmed.includes('src=')
    ) {
      return;
    }

    // Match JSX text or string literals inside JSX attributes like placeholder="...", title="..."
    // E.g. >Some Text</ or placeholder="Enter text"
    const jsxTextMatch = />([^<>{}]+)</.exec(line);
    if (jsxTextMatch && jsxTextMatch[1]) {
      const text = jsxTextMatch[1].trim();
      if (text.length > 1 && /[a-zA-ZÀ-ÿ]/.test(text) && !text.includes('t(')) {
        totalStringsFound++;
        if (!text.startsWith('{') && !text.endsWith('}')) {
          hardcodedStrings.push({ line: index + 1, text });
        }
      }
    }

    // Match attribute strings like placeholder="Hardcoded"
    const attrRegex = /(placeholder|title|label|alt|aria-label)=["']([^"'{]+)["']/g;
    let match;
    while ((match = attrRegex.exec(line)) !== null) {
      const text = match[2].trim();
      if (text.length > 1 && /[a-zA-ZÀ-ÿ]/.test(text)) {
        totalStringsFound++;
        hardcodedStrings.push({ line: index + 1, text: `${match[1]}="${text}"` });
      }
    }
  });

  return {
    filePath: path.relative(process.cwd(), filePath),
    hardcodedStrings,
    totalStringsFound: Math.max(totalStringsFound, hardcodedStrings.length),
  };
}

function runAudit() {
  console.log('🔍 Starting i18n Hardcoded Text & Coverage Audit...');
  const srcDir = path.resolve(process.cwd(), 'src');
  const files = walkDir(srcDir);

  const results: AuditResult[] = [];
  let totalFiles = files.length;
  let totalHardcoded = 0;
  let totalChecked = 0;

  files.forEach((file) => {
    const result = auditFile(file);
    results.push(result);
    totalHardcoded += result.hardcodedStrings.length;
    totalChecked += result.totalStringsFound;
  });

  const coverage = totalChecked > 0 ? ((totalChecked - totalHardcoded) / totalChecked) * 100 : 100;

  const report = {
    timestamp: new Date().toISOString(),
    totalFilesScanned: totalFiles,
    totalStringsEvaluated: totalChecked,
    totalHardcodedFound: totalHardcoded,
    coveragePercentage: Number(coverage.toFixed(2)),
    results: results.filter((r) => r.hardcodedStrings.length > 0),
  };

  const reportPath = path.resolve(process.cwd(), 'i18n-audit-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf-8');

  // Generate i18n-audit-report.txt as requested
  let txtContent = `============================================\n`;
  txtContent += `NutriAI i18n Audit Report\n`;
  txtContent += `Generated: ${report.timestamp}\n`;
  txtContent += `Total Files Scanned: ${totalFiles}\n`;
  txtContent += `Total Hardcoded Strings Detected: ${totalHardcoded}\n`;
  txtContent += `Coverage Percentage: ${report.coveragePercentage}%\n`;
  txtContent += `============================================\n\n`;

  report.results.forEach((res) => {
    txtContent += `File: ${res.filePath}\n`;
    res.hardcodedStrings.forEach((item) => {
      txtContent += `  Line ${item.line}: ${item.text}\n`;
    });
    txtContent += `\n`;
  });

  const txtReportPath = path.resolve(process.cwd(), 'i18n-audit-report.txt');
  fs.writeFileSync(txtReportPath, txtContent, 'utf-8');

  console.log('============================================');
  console.log('📊 NutriAI i18n Audit Report Summary');
  console.log('============================================');
  console.log(`📁 Files Scanned: ${totalFiles}`);
  console.log(`💬 Strings Evaluated: ${totalChecked}`);
  console.log(`⚠️ Hardcoded Strings Detected: ${totalHardcoded}`);
  console.log(`📈 Estimated i18n Coverage: ${report.coveragePercentage}%`);
  console.log(`💾 Detailed report saved to: i18n-audit-report.json & i18n-audit-report.txt`);
  console.log('============================================');

  if (totalHardcoded === 0) {
    console.log('✨ Excellent! No hardcoded strings detected.');
  } else {
    console.log('💡 Tip: Review i18n-audit-report.json to replace hardcoded strings with t() calls.');
  }
}

runAudit();
