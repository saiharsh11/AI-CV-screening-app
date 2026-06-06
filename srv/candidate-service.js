'use strict';

const cds = require('@sap/cds');
const fs  = require('fs');
const path = require('path');
const { extractStructuredData, generateSummary } = require('./lib/ai-service');

const uploadsDir = path.join(__dirname, '..', 'uploads');

const STR_FIELDS = new Set(['FullName', 'CurrentRole', 'Skills', 'Email', 'Phone', 'CVFileName']);

// Converts EQ filters on string fields into case-insensitive contains.
// e.g. FullName = 'mary' → contains(tolower(FullName), 'mary')
// Also lowercases existing contains/startswith/endswith calls.
function makeContains(arr) {
    if (!Array.isArray(arr)) return arr;
    const out = [];
    let i = 0;
    while (i < arr.length) {
        const x = arr[i];
        if (x && typeof x === 'object') {
            // flat EQ on a string field: {ref} '=' {val}
            if (x.ref && STR_FIELDS.has(x.ref[x.ref.length - 1])) {
                const op = arr[i + 1];
                const valNode = arr[i + 2];
                if (op === '=' && valNode?.val !== undefined && typeof valNode.val === 'string') {
                    out.push({ func: 'contains', args: [
                        { func: 'tolower', args: [x] },
                        { val: valNode.val.toLowerCase() }
                    ]});
                    i += 3;
                    continue;
                }
            }
            // existing contains/startswith/endswith — just make case-insensitive
            if (x.func && x.args?.length >= 2) {
                const ref = x.args[0]?.ref;
                if (ref && STR_FIELDS.has(ref[ref.length - 1]) && typeof x.args[1]?.val === 'string') {
                    x.args[0] = { func: 'tolower', args: [x.args[0]] };
                    x.args[1].val = x.args[1].val.toLowerCase();
                }
            }
            if (x.xpr) x.xpr = makeContains(x.xpr);
        }
        out.push(x);
        i++;
    }
    return out;
}

// ─── CAP Application Service ──────────────────────────────────────────────────
module.exports = class CandidateService extends cds.ApplicationService {
    async init() {
        // ── Record status: Pending on create, Processed after AI ─────────────
        this.before('CREATE', 'Candidates', (req) => {
            req.data.RecordStatus      = 'Draft';
            req.data.RecordCriticality = 2;
        });

        this.after('draftActivate', 'Candidates', async (data) => {
            const { Candidates } = cds.entities('cv.screening');
            if (data && data.ID) {
                await UPDATE(Candidates).set({ RecordStatus: 'Active', RecordCriticality: 3 }).where({ ID: data.ID });
            }
        });

        // ── Case-insensitive string filters ───────────────────────────────────
        this.before('READ', 'Candidates', (req) => {
            try {
                if (req.query?.SELECT?.where)
                    req.query.SELECT.where = makeContains(req.query.SELECT.where);
            } catch (_) { /* never break the query */ }
        });

        // ── processCV action ──────────────────────────────────────────────────
        this.on('processCV', async (req) => {
            const { candidateID } = req.data;

            if (!candidateID) {
                return req.error(400, 'candidateID is required.');
            }

            const { Candidates } = cds.entities('cv.screening');

            // Check active entity first, fall back to draft (new unsaved candidate)
            let candidate = await SELECT.one.from(Candidates).where({ ID: candidateID });
            let isDraft = false;

            if (!candidate) {
                try {
                    const draft = await SELECT.one
                        .from('CandidateService.Candidates_drafts')
                        .where({ ID: candidateID });
                    if (draft) {
                        candidate = draft;
                        isDraft = true;
                    }
                } catch (_) { /* draft table may not exist */ }
            }

            if (!candidate) {
                return req.error(404, `Candidate ${candidateID} not found.`);
            }

            // Draft columns may be empty due to HANA draft table limitations.
            // Fall back to files cached by the upload endpoint.
            if (isDraft) {
                if (!candidate.CVText) {
                    try {
                        const textFile = path.join(uploadsDir, `${candidateID}.txt`);
                        if (fs.existsSync(textFile)) candidate.CVText = fs.readFileSync(textFile, 'utf8');
                    } catch (_) {}
                }
                if (!candidate.CVFileName) {
                    try {
                        const nameFile = path.join(uploadsDir, `${candidateID}.name`);
                        if (fs.existsSync(nameFile)) candidate.CVFileName = fs.readFileSync(nameFile, 'utf8');
                    } catch (_) {}
                }
            }

            if (!candidate.CVText) {
                return req.error(400, 'No CV text found. Please upload a CV file first.');
            }

            let structured, summary;

            try {
                structured = await extractStructuredData(candidate.CVText);
            } catch (err) {
                return req.error(500, `AI data extraction failed: ${err.message}`);
            }

            try {
                summary = await generateSummary(candidate.CVText);
            } catch (err) {
                return req.error(500, `AI summary generation failed: ${err.message}`);
            }

            const skills = Array.isArray(structured.skills)
                ? structured.skills.join(', ')
                : (structured.skills || candidate.Skills || '');

            const aiFields = {
                FullName:          structured.fullName          || candidate.FullName,
                Email:             structured.email             || candidate.Email,
                Phone:             structured.phone             || candidate.Phone,
                Skills:            skills,
                YearsOfExperience: parseInt(structured.yearsOfExperience, 10) || candidate.YearsOfExperience || 0,
                CurrentRole:       structured.currentRole       || candidate.CurrentRole,
                AISummary:         summary,
                RecordStatus:      'Active',
                RecordCriticality: 3,
            };

            if (isDraft) {
                const now    = new Date().toISOString();
                const userId = (req.user && req.user.id) || '';

                // Step 1: INSERT active entity directly at the DB level.
                // Service-layer UPSERT is intercepted by CAP's draft router and
                // never lands in the active-entity table, so we bypass it with cds.db.run().
                try {
                    await cds.db.run(
                        INSERT.into(Candidates).entries({
                            ID:                candidateID,
                            createdAt:         now,
                            modifiedAt:        now,
                            createdBy:         userId,
                            modifiedBy:        userId,
                            FullName:          aiFields.FullName          || '',
                            Email:             aiFields.Email             || '',
                            Phone:             aiFields.Phone             || '',
                            Skills:            aiFields.Skills            || '',
                            YearsOfExperience: aiFields.YearsOfExperience || 0,
                            CurrentRole:       aiFields.CurrentRole       || '',
                            CVFileName:        candidate.CVFileName        || '',
                            RecordStatus:      'Active',
                            RecordCriticality: 3,
                        })
                    );
                    console.log('[processCV] DB INSERT succeeded for', candidateID);
                } catch (insertErr) {
                    // Entity already exists — fall back to UPDATE
                    console.log('[processCV] DB INSERT conflict, falling back to UPDATE:', insertErr.message);
                    await cds.db.run(
                        UPDATE(Candidates).set({
                            modifiedAt:        now,
                            modifiedBy:        userId,
                            FullName:          aiFields.FullName          || '',
                            Email:             aiFields.Email             || '',
                            Phone:             aiFields.Phone             || '',
                            Skills:            aiFields.Skills            || '',
                            YearsOfExperience: aiFields.YearsOfExperience || 0,
                            CurrentRole:       aiFields.CurrentRole       || '',
                            CVFileName:        candidate.CVFileName        || '',
                            RecordStatus:      'Active',
                            RecordCriticality: 3,
                        }).where({ ID: candidateID })
                    );
                }

                // Step 2: UPDATE NCLOB fields — works on active entities via service layer
                await UPDATE(Candidates).set({
                    CVText:    candidate.CVText,
                    AISummary: summary,
                }).where({ ID: candidateID });

                // Step 3: Remove the draft so Fiori shows the active entity on next load
                try {
                    await DELETE.from('CandidateService.Candidates_drafts').where({ ID: candidateID });
                } catch (_) {}
            } else {
                await UPDATE(Candidates).set(aiFields).where({ ID: candidateID });
            }

            return 'CV processed successfully. Candidate profile updated with AI-extracted data.';
        });

        return super.init();
    }
};
