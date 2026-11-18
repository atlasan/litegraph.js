export const escapeMarkup = value => String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[character]);

export function csvCell(value) {
    let text = String(value ?? '');
    // Keep text identifiers/messages from becoming formulas in spreadsheet readers.
    if (typeof value === 'string' && /^[\s]*[=+@-]/.test(text)) text = "'" + text;
    return '"' + text.replace(/"/g, '""') + '"';
}

export const escapeReportResult = result => ({
    ...result,
    testId: escapeMarkup(result.testId), nodeType: escapeMarkup(result.nodeType), status: escapeMarkup(result.status),
    errors: result.errors.map(error => ({ ...error, type: escapeMarkup(error.type), message: escapeMarkup(error.message) })),
    warnings: result.warnings.map(escapeMarkup),
});
