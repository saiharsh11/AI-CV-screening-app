# AI-Powered CV Screening Application

A full-stack SAP BTP application built with SAP CAP (Node.js) and SAP Fiori Elements that automates candidate CV screening using AI.

**Live Demo:** https://c267cb81trial-dev-cv-screening-app.cfapps.ap21.hana.ondemand.com

---

## Features

| Capability | Implementation |
|---|---|
| Upload PDF / DOCX CVs | Custom Express route + `multer` (memory storage) |
| Extract raw CV text | `pdf-parse` (PDF) and `mammoth` (DOCX) |
| AI data extraction | OpenAI GPT-4o-mini — returns structured JSON |
| AI professional summary | OpenAI GPT-4o-mini — Professional Summary, Key Strengths, Suggested Role Fit |
| Inline AI preview | Extracted fields + full AI summary shown immediately after processing |
| Fiori List Report | CAP OData V4 + Fiori Elements annotations |
| Fiori Object Page | Sections for details, upload panel, AI results |
| BTP deployment | MTA build + Cloud Foundry + HANA Cloud |

---

## Screenshots

### List Report: Candidate Overview

<img width="956" height="341" alt="image" src="https://github.com/user-attachments/assets/0a596bbd-127b-487a-81e1-7804cf8375a1" />



### Object Page: Candidate Details & CV Upload


<img width="953" height="533" alt="image" src="https://github.com/user-attachments/assets/b45ab0b1-6b56-4d64-9646-6c87ce4b6b61" />


### CV Upload & AI Processing

<img width="929" height="226" alt="image" src="https://github.com/user-attachments/assets/671c55d0-cb9a-4471-b7d6-978672d7cb2b" />
<img width="953" height="329" alt="image" src="https://github.com/user-attachments/assets/01370642-5961-4c3f-b593-1c4a49e637dc" />




### AI Analysis Results
<img width="955" height="434" alt="image" src="https://github.com/user-attachments/assets/79efbf63-96c1-45fa-a653-beaf62f64615" />


### Deployed on SAP BTP


<img width="958" height="385" alt="image" src="https://github.com/user-attachments/assets/80abaa42-eee1-4b58-9fbf-d412bf140705" />
<img width="956" height="341" alt="image" src="https://github.com/user-attachments/assets/71ead4e2-6b78-40c9-a3e5-efee2f0aa307" />



---

## Architecture

```
┌──────────────────────────────────────────────────────┐
│                   Browser (Fiori UI)                 │
│  List Report ──► Object Page ──► Upload Section      │
└──────────┬───────────────────────────┬───────────────┘
           │ OData V4                  │ REST (file upload)
           ▼                           ▼
┌──────────────────────────────────────────────────────┐
│               SAP CAP Service (Node.js)              │
│  candidate-service.cds  ──  candidate-service.js     │
│  Actions: processCV     ──  Route: POST /upload/:id  │
└──────────┬───────────────────────────┬───────────────┘
           │                           │
           ▼                           ▼
     SQLite / HANA              OpenAI API
     (Candidates table)         (gpt-4o-mini)
```

---

## Prerequisites

- **Node.js** ≥ 18
- **npm** ≥ 9
- **@sap/cds-dk** (SAP CAP CLI) — installed locally via `npm install`
- **OpenAI API key** — [platform.openai.com](https://platform.openai.com)

---

## Local Development Setup

### 1. Install dependencies

```bash
cd cv-screening-app
npm install
```

> Node.js v22+ / v26+ note: If `npm install` fails with a `better-sqlite3` build error,
> run `npm install --ignore-scripts` instead. Pre-built binaries are available for all
> modern Node.js versions and will be used automatically.

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env and set your OPENAI_API_KEY
```

### 3. Start the application

```bash
npm run watch
# or: npx cds watch
```

The server starts at http://localhost:4004.

- Fiori UI: http://localhost:4004/app/candidates/webapp/index.html
- OData service: http://localhost:4004/odata/v4/candidate/

> Tip: `cds watch` auto-reloads on file changes and auto-deploys the schema to SQLite.

---

## Using the Application

### Step 1 : Create a Candidate

1. Open the Fiori app and click Create on the List Report page.
2. Fill in at least the Full Name field (all others are optional — AI will populate them).
3. Click Save.

### Step 2 : Upload a CV

1. Open the candidate's Object Page.
2. In the CV Upload & AI Processing section, click Browse and select a `.pdf` or `.docx` file.
3. Click Upload CV.
4. A success message will confirm the text was extracted.

### Step 3 : Process with AI

1. Click Process with AI in the same section.
2. Wait a few seconds while OpenAI analyses the CV.
3. An inline preview card appears immediately below — showing extracted fields (name, email, skills, experience, role) and the full AI summary (Professional Summary, Key Strengths, Suggested Role Fit).
4. The **AI Analysis** section on the page also updates automatically.

---

## Project Structure

```
cv-screening-app/
├── app/
│   └── candidates/
│       ├── annotations.cds          # Fiori Elements UI annotations
│       └── webapp/
│           ├── manifest.json        # Fiori app manifest (routes, extensions)
│           ├── i18n/i18n.properties
│           └── ext/
│               ├── CVUploadController.js        # Controller extension (upload + AI trigger)
│               └── fragment/CVUpload.fragment.xml  # Custom upload UI section
├── db/
│   └── schema.cds                   # CDS data model (Candidates entity)
├── srv/
│   ├── candidate-service.cds        # OData service + processCV action
│   ├── candidate-service.js         # Service implementation + Express upload route
│   └── lib/
│       ├── cv-parser.js             # PDF / DOCX text extraction
│       └── ai-service.js            # OpenAI integration (extraction + summary)
├── approuter/                       # SAP Approuter for BTP deployment
├── xs-security.json                 # XSUAA security descriptor
├── mta.yaml                         # Multi-Target Application descriptor (BTP deploy)
└── .env.example                     # Environment variable template
```

---

## AI Integration

### Data Extraction 

Sends the raw CV text to OpenAI and requests a structured JSON response:

```json
{
  "fullName": "Jane Smith",
  "email": "jane@example.com",
  "phone": "+44 7700 123456",
  "skills": ["Python", "React", "PostgreSQL"],
  "yearsOfExperience": 5,
  "currentRole": "Senior Software Engineer"
}
```

The prompt uses `response_format: { type: "json_object" }` to guarantee valid JSON output and `temperature: 0.1` to minimise hallucination.

### Summary Generation
Sends the same CV text with a structured output prompt that always returns:

```
PROFESSIONAL SUMMARY
...5-8 sentence overview...

KEY STRENGTHS
• ...
• ...

SUGGESTED ROLE FIT
...
```

`temperature: 0.3` allows some variation while keeping the output grounded in the CV content.

---

## BTP Cloud Foundry Deployment

### Prerequisites

1. [SAP BTP Trial account](https://cockpit.btp.cloud.sap/)
2. Cloud Foundry space created
3. SAP HANA Cloud free tier instance (create in BTP Cockpit → SAP HANA Cloud)
4. CF CLI installed: `cf --version`
5. MBT build tool: `npm install -g mbt`
6. CF MTA plugin: `cf install-plugin multiapps`

### Steps

```bash
# 1. Log in to Cloud Foundry
cf login -a https://api.cf.<your-region>.hana.ondemand.com

# 2. Build the MTA archive
npm run build:mta

# 3. Set your OpenAI API key as a CF env variable on the server app AFTER first deploy
#    (see step 5)

# 4. Deploy
npm run deploy:cf

# 5. Set the OpenAI API key (required — not stored in mta.yaml for security)
cf set-env cv-screening-app-srv OPENAI_API_KEY sk-proj-...
cf restage cv-screening-app-srv
```

### Notes

- The first deployment creates the HANA HDI container and deploys the schema automatically.
- The Fiori UI is served via the SAP Approuter module (`cv-screening-app`).
- For trial accounts, HANA Cloud has a free tier — pause the instance when not in use to preserve quota.
- If HANA Cloud is unavailable, you can do a simple `cf push` with the CAP server using SQLite (not persistent across restarts, but works for demonstration).

---

## Design Decisions

| Decision | Rationale |
|---|---|
| Memory storage for uploads | Avoids leftover temp files; files are processed and discarded immediately |
| Unbound CAP action for `processCV` | Simpler to call from a custom Fiori controller extension than a bound action |
| `@odata.draft.enabled` on Candidates | Allows Fiori Elements create/edit flows with the built-in draft mechanism |
| `gpt-4o-mini` default model | Cost-effective (~10x cheaper than GPT-4o) while still highly capable for structured extraction |
| `response_format: json_object` | Eliminates JSON parsing errors from markdown-wrapped responses |
| Custom Express route for upload | Cleaner than base64-encoding files through OData; native multipart support |

---

## Assumptions

- One CV file per candidate (re-uploading overwrites the previous text).
- The OpenAI API is accessible from the deployment environment.
- For BTP trial: a HANA Cloud free tier instance has been created and mapped to the space.

---

## Troubleshooting

| Issue | Fix |
|---|---|
| `OPENAI_API_KEY is not set` | Copy `.env.example` to `.env` and set your key |
| `Candidate not found` on upload | Save the candidate record before uploading a CV |
| PDF returns garbled text | Some PDFs use image-based content; text extraction requires text-based PDFs |
| `cds watch` — port in use | Run `cds watch --port 4005` to use a different port |
| HANA deployment fails | Verify the HANA Cloud instance is running and mapped to your CF space |
