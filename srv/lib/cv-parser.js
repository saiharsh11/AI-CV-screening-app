'use strict';

const pdfParse = require('pdf-parse');
const mammoth  = require('mammoth');

async function extractTextFromBuffer(buffer, originalName) {
    const ext = originalName.split('.').pop().toLowerCase();

    if (ext === 'pdf') {
        const data = await pdfParse(buffer);
        return data.text.trim();
    }

    if (ext === 'docx') {
        const result = await mammoth.extractRawText({ buffer });
        return result.value.trim();
    }

    throw new Error(`Unsupported file type ".${ext}". Only PDF and DOCX are accepted.`);
}

module.exports = { extractTextFromBuffer };
