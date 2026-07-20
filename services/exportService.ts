
// Shared helpers for exporting data as CSV downloads or printable views.

// Excel needs a UTF-8 BOM to render Khmer text correctly.
const CSV_BOM = '﻿';

const escapeCsvCell = (value: string | number | undefined | null): string => {
    const text = value === undefined || value === null ? '' : String(value);
    if (/[",\n]/.test(text)) {
        return '"' + text.replace(/"/g, '""') + '"';
    }
    return text;
};

export const downloadCsv = (filename: string, headers: string[], rows: (string | number | undefined | null)[][]) => {
    const content = CSV_BOM + [headers, ...rows]
        .map(row => row.map(escapeCsvCell).join(','))
        .join('\n');
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
};

const escapeHtml = (value: string | number | undefined | null): string => {
    const text = value === undefined || value === null ? '' : String(value);
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
};

// Opens a minimal print-styled page in a new tab and triggers the print
// dialog — used for the gift ledger (កំណត់ចំណងដៃ) and similar reports.
export const openPrintView = (
    title: string,
    subtitle: string,
    headers: string[],
    rows: (string | number | undefined | null)[][],
    footer?: string
) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const headerCells = headers.map(h => `<th>${escapeHtml(h)}</th>`).join('');
    const bodyRows = rows.length > 0
        ? rows.map(row => `<tr>${row.map(cell => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`).join('')
        : `<tr><td colspan="${headers.length}" class="empty">គ្មានទិន្នន័យ</td></tr>`;

    printWindow.document.write(`<!doctype html>
<html lang="km">
<head>
<meta charset="utf-8">
<title>${escapeHtml(title)}</title>
<style>
    body { font-family: 'Khmer OS Battambang', 'Khmer OS', 'Noto Sans Khmer', 'Noto Serif Khmer', serif; color: #1e293b; margin: 32px; }
    h1 { font-size: 20px; text-align: center; margin: 0 0 4px; color: #9f1239; }
    p.subtitle { text-align: center; color: #64748b; font-size: 13px; margin: 0 0 24px; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th, td { border: 1px solid #cbd5e1; padding: 8px 10px; text-align: left; }
    th { background: #fff1f2; color: #9f1239; }
    tr:nth-child(even) td { background: #f8fafc; }
    td.empty { text-align: center; color: #94a3b8; padding: 24px; }
    p.footer { margin-top: 16px; font-weight: bold; text-align: right; font-size: 14px; }
    p.printed { margin-top: 32px; color: #94a3b8; font-size: 11px; text-align: center; }
    @media print { body { margin: 12mm; } }
</style>
</head>
<body>
<h1>${escapeHtml(title)}</h1>
<p class="subtitle">${escapeHtml(subtitle)}</p>
<table>
<thead><tr>${headerCells}</tr></thead>
<tbody>${bodyRows}</tbody>
</table>
${footer ? `<p class="footer">${escapeHtml(footer)}</p>` : ''}
<p class="printed">បោះពុម្ពដោយ PITHI • ${escapeHtml(new Date().toLocaleDateString('km-KH'))}</p>
<script>window.onload = function () { window.print(); };</script>
</body>
</html>`);
    printWindow.document.close();
};
