/**
 * NutriAI i18n Coverage Audit Script
 * Automatically scans all React components in src/ for potential hardcoded text strings
 * and generates a detailed internationalization coverage report.
 */

import * as fs from 'fs';
import * as path from 'path';

interface AuditIssue {
  file: string;
  line: number;
  type: 'jsx_text' | 'attribute_text';
  snippet: string;
}

interface FileAuditResult {
  filePath: string;
  totalChecks: number;
  localizedCount: number;
  hardcodedIssues: AuditIssue[];
  coveragePercentage: number;
}

function scanDirectory(dir: string, fileList: string[] = []): string[] {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.git' && file !== 'dist') {
        scanDirectory(filePath, fileList);
      }
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      fileList.push(filePath);
    }
  }
  return fileList;
}

function auditFile(filePath: string): FileAuditResult {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const hardcodedIssues: AuditIssue[] = [];
  
  let totalChecks = 0;
  let localizedCount = 0;

  // Count how many times t(...) or useTranslation is used
  const tMatches = content.match(/\bt\s*\(/g);
  if (tMatches) {
    localizedCount += tMatches.length;
  }

  lines.forEach((line, index) => {
    const lineNum = index + 1;
    const trimmed = line.trim();

    // Skip comments, imports, console logs, types, tailwind classes
    if (
      trimmed.startsWith('//') ||
      trimmed.startsWith('/*') ||
      trimmed.startsWith('*') ||
      trimmed.startsWith('import ') ||
      trimmed.startsWith('export type') ||
      trimmed.startsWith('interface ') ||
      trimmed.startsWith('type ') ||
      trimmed.includes('console.') ||
      trimmed.includes('className=') ||
      trimmed.includes('key=') ||
      trimmed.includes('id=') ||
      trimmed.includes('type="') ||
      trimmed.includes("type='")
    ) {
      return;
    }

    // Detect JSX text nodes containing natural language (Portuguese/English/Spanish/French letters)
    // e.g. >Texto visível aqui<
    const jsxTextRegex = />\s*([A-ZÀ-Úa-zà-ú0-9\s.,!?-]{3,})\s*</g;
    let match;
    while ((match = jsxTextRegex.exec(line)) !== null) {
      const text = match[1].trim();
      // Filter out pure numbers, CSS classes, short codes, or svg tags
      if (text.length > 2 && /[A-ZÀ-Úa-zà-ú]/.test(text) && !text.includes('px') && !text.includes('rem')) {
        totalChecks++;
        // Check if t() is present in the line
        if (!line.includes('t(')) {
          hardcodedIssues.push({
            file: filePath,
            line: lineNum,
            type: 'jsx_text',
            snippet: trimmed
          });
        }
      }
    }

    // Detect UI attributes with potential hardcoded text: placeholder="...", title="...", label="..."
    const attrRegex = /(placeholder|title|label|aria-label|alt)\s*=\s*"([^"]{3,})"/g;
    while ((match = attrRegex.exec(line)) !== null) {
      const attrName = match[1];
      const attrVal = match[2];
      // Exclude variable interpolation or dynamic keys
      if (!attrVal.includes('{') && /[A-ZÀ-Úa-zà-ú]/.test(attrVal) && !attrVal.startsWith('http')) {
        totalChecks++;
        if (!line.includes('t(')) {
          hardcodedIssues.push({
            file: filePath,
            line: lineNum,
            type: 'attribute_text',
            snippet: `${attrName}="${attrVal}" in: ${trimmed}`
          });
        }
      }
    }
  });

  const effectiveTotal = Math.max(totalChecks, localizedCount, 1);
  const issuesCount = hardcodedIssues.length;
  const coveragePercentage = Math.max(0, Math.min(100, Math.round(((effectiveTotal - issuesCount) / effectiveTotal) * 100)));

  return {
    filePath,
    totalChecks: effectiveTotal,
    localizedCount,
    hardcodedIssues,
    coveragePercentage
  };
}

export function runI18nAudit(): boolean {
  console.info('🔍 [NutriAI i18n Audit] Scanning application components for hardcoded text and localization coverage...');

  const srcDir = path.resolve(process.cwd(), 'src');
  const files = scanDirectory(srcDir);

  let totalFiles = 0;
  let totalIssues = 0;
  let totalChecksSum = 0;
  const results: FileAuditResult[] = [];

  for (const file of files) {
    totalFiles++;
    const result = auditFile(file);
    results.push(result);
    totalIssues += result.hardcodedIssues.length;
    totalChecksSum += result.totalChecks;
  }

  const overallCoverage = totalChecksSum > 0 
    ? Math.max(0, Math.min(100, Math.round(((totalChecksSum - totalIssues) / totalChecksSum) * 100))) 
    : 100;

  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      totalFilesScanned: totalFiles,
      totalPotentialHardcodedIssues: totalIssues,
      overallCoveragePercentage: overallCoverage
    },
    files: results.map(r => ({
      file: path.relative(process.cwd(), r.filePath),
      coveragePercentage: r.coveragePercentage,
      issuesCount: r.hardcodedIssues.length,
      issues: r.hardcodedIssues
    }))
  };

  const reportPath = path.resolve(process.cwd(), 'i18n-audit-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf-8');

  console.info('\n============================================================');
  console.info('📊 NUTRIAI INTERNATIONALIZATION (i18n) AUDIT REPORT');
  console.info('============================================================');
  console.info(`📁 Files Scanned: ${totalFiles}`);
  console.info(`⚠️ Potential Hardcoded Strings Found: ${totalIssues}`);
  console.info(`🌟 Overall i18n Coverage: ${overallCoverage}%`);
  console.info(`💾 Detailed report saved to: ${path.relative(process.cwd(), reportPath)}`);
  console.info('============================================================\n');

  if (totalIssues > 0) {
    console.info('🔍 Top files with potential hardcoded items:');
    results
      .filter(r => r.hardcodedIssues.length > 0)
      .sort((a, b) => b.hardcodedIssues.length - a.hardcodedIssues.length)
      .slice(0, 5)
      .forEach(r => {
        console.info(`   - ${path.relative(process.cwd(), r.filePath)}: ${r.hardcodedIssues.length} issues (${r.coveragePercentage}% coverage)`);
      });
  }

  console.info('✅ i18n audit completed successfully.');
  return true;
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('auditI18nCoverage.ts')) {
  runI18nAudit();
}
