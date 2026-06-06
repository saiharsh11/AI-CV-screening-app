'use strict';

require('dotenv').config();
const OpenAI = require('openai');

let _client = null;

function getClient() {
    if (!_client) {
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
            throw new Error('OPENAI_API_KEY is not set. Add it to your .env file.');
        }
        _client = new OpenAI({ apiKey });
    }
    return _client;
}

const MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

/**
 * Calls OpenAI and returns structured candidate data extracted from CV text.
 * Returns an object matching the Candidate entity fields.
 */
async function extractStructuredData(cvText) {
    const prompt = `You are an expert CV/resume data extraction system.

Analyze the following CV text and extract the requested information.
Be precise. If a value is not present in the CV, use an empty string or 0.

Return ONLY a valid JSON object with this exact structure (no markdown, no explanation):
{
  "fullName": "candidate full name as written",
  "email": "primary email address",
  "phone": "phone number including country code if present",
  "skills": ["skill1", "skill2", "skill3"],
  "yearsOfExperience": 0,
  "currentRole": "most recent or current job title"
}

Rules:
- fullName: name as it appears at the top of the document
- skills: list ALL technical skills, programming languages, frameworks, tools, and methodologies found
- yearsOfExperience: integer — calculate from work history dates or estimate from context
- currentRole: the most recent job title listed

CV TEXT:
---
${cvText}
---`;

    const response = await getClient().chat.completions.create({
        model: MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        response_format: { type: 'json_object' },
    });

    const raw = response.choices[0].message.content;
    return JSON.parse(raw);
}

/**
 * Calls OpenAI and returns a formatted HR assessment of the candidate.
 */
async function generateSummary(cvText) {
    const prompt = `You are a senior HR professional and talent acquisition specialist with 15+ years of experience.
Analyze the following CV and produce a professional assessment.

IMPORTANT FORMATTING RULES:
- Do NOT use any markdown. No asterisks (*), no hashtags (#), no bold, no italic, no underscores.
- Use plain text only.
- Bullet points must use only the bullet character: •

Structure your response EXACTLY as shown below (keep the section headings in ALL CAPS):

PROFESSIONAL SUMMARY
[5-8 sentences covering: overall experience level, core domain expertise, career progression, and value proposition]

KEY STRENGTHS
• [Technical strength with brief evidence from the CV]
• [Technical strength with brief evidence from the CV]
• [Soft skill or professional quality]
• [Domain specialisation or industry knowledge]
• [Any other notable strength]

SUGGESTED ROLE FIT
[List 2-3 specific roles this candidate is best suited for. For each role state the title and a one-sentence justification based on their profile.]

CV TEXT:
---
${cvText}
---`;

    const response = await getClient().chat.completions.create({
        model: MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 900,
    });

    return response.choices[0].message.content.trim();
}

module.exports = { extractStructuredData, generateSummary };
