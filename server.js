'use strict';

require('dotenv').config();

const cds    = require('@sap/cds');
const multer = require('multer');
const fs     = require('fs');
const path   = require('path');

const { extractTextFromBuffer } = require('./srv/lib/cv-parser');

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        const ok = ['application/pdf',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
        if (ok.includes(file.mimetype) || file.originalname.match(/\.(pdf|docx)$/i)) {
            cb(null, true);
        } else {
            cb(new Error('Only PDF and DOCX files are accepted.'));
        }
    },
});

// Register BEFORE CDS routes are added (bootstrap fires early)
cds.on('bootstrap', (app) => {

    // ── Serve uploaded CV files ───────────────────────────────────────────────
    app.get('/view-cv/:candidateID', (req, res) => {
        const { candidateID } = req.params;
        for (const ext of ['.pdf', '.docx']) {
            const filePath = path.join(uploadsDir, candidateID + ext);
            if (fs.existsSync(filePath)) return res.sendFile(filePath);
        }
        res.status(404).send('CV file not found. Please re-upload the CV.');
    });

    // ── Upload CV and save file ───────────────────────────────────────────────
    app.post('/upload/:candidateID', upload.single('cv'), async (req, res) => {
        try {
            const { candidateID } = req.params;
            const file = req.file;

            if (!file) {
                return res.status(400).json({ error: 'No file received. Send the file as form-data field "cv".' });
            }

            const cvText = await extractTextFromBuffer(file.buffer, file.originalname);

            // Save the actual file so it can be viewed later
            const ext = (file.originalname.match(/\.(pdf|docx)$/i) || [])[1]?.toLowerCase() || 'pdf';
            fs.writeFileSync(path.join(uploadsDir, `${candidateID}.${ext}`), file.buffer);

            // Cache extracted text and filename for processCV draft fallback (HANA NCLOB workaround)
            if (cvText) {
                fs.writeFileSync(path.join(uploadsDir, `${candidateID}.txt`), cvText, 'utf8');
            }
            fs.writeFileSync(path.join(uploadsDir, `${candidateID}.name`), file.originalname, 'utf8');

            const { Candidates } = cds.entities('cv.screening');

            let existing = await SELECT.one.from(Candidates).where({ ID: candidateID });
            let isDraft  = false;

            if (!existing) {
                try {
                    existing = await SELECT.one
                        .from('CandidateService.Candidates_drafts')
                        .where({ ID: candidateID });
                    isDraft = !!existing;
                } catch (_) { /* draft table may not exist */ }
            }

            if (!existing) {
                return res.status(404).json({
                    error: 'Candidate not found. No active or draft record exists for this ID.',
                });
            }

            if (isDraft) {
                await UPDATE('CandidateService.Candidates_drafts')
                    .set({ CVFileName: file.originalname, CVText: cvText })
                    .where({ ID: candidateID });
            } else {
                await UPDATE(Candidates)
                    .set({ CVFileName: file.originalname, CVText: cvText })
                    .where({ ID: candidateID });
            }

            return res.json({
                success: true,
                message: 'CV uploaded and text extracted successfully.',
                fileName: file.originalname,
                extractedLength: cvText.length,
            });
        } catch (err) {
            console.error('[uploadCV]', err);
            return res.status(500).json({ error: err.message });
        }
    });

    console.log('[server.js] /upload/:candidateID route registered');
});

module.exports = cds.server;
