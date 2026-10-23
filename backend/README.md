# STP Unit Plan Studio — administrator setup

The GitHub Pages frontend is a working prototype for sample editing, curriculum text scaffolding and export into the original DOCX template. Automatic Ministry document fetching is not implemented. The Science example is illustrative; its Ministry statement cells deliberately remain empty. No live Gemini connection is enabled until the school configures this optional service.

## Optional Gemini service

Deploy `worker.mjs` with Cloudflare Wrangler from this directory. It imports the shared schema and planning instructions from `../unit-plan-builder/model.js`. Install Wrangler from its official npm package if needed. Use a school-managed Google project with billing/quota controls and an approved data policy.

Set `GEMINI_MODEL` in Wrangler configuration to a currently supported model that supports structured outputs. Store `GEMINI_API_KEY` and a strong random `ACCESS_TOKEN` as Worker secrets, using `wrangler secret put GEMINI_API_KEY` and `wrangler secret put ACCESS_TOKEN`. Keep keys out of Git, frontend code and chat. Deploy using `wrangler deploy`.

The configured `ALLOWED_ORIGIN` must exactly match the GitHub Pages origin. Requests also require the service access code; CORS alone is not authentication. The per-isolate rate limiter is only a prototype safeguard, not a durable budget control. Configure provider quotas and a durable rate limit or school identity before wider deployment.

In the site, select **AI connection**, enter the deployed HTTPS endpoint and service access code. The endpoint is stored locally; the code stays in memory until the page closes or reloads. Drafts and extracts are sent to the service and Gemini only on an explicit drafting/refinement request. The Google API key never enters the browser.

The server validates shape and unit metadata. The frontend also flags non-matching statement wording and requires users to review a proposal before applying it. Neither check establishes curriculum completeness or pedagogical quality.

## Without an API

Load the example or create a scaffold. In **Shape the draft → AI refinements**, copy the prepared prompt into the school's Gemini account. Paste the JSON response into the site and review it before applying. This tests Gemini-generated content with the same independent Word export.

## Template export

The original approved DOCX is `unit-plan-builder/template.docx`, from version 21 of STP_UNIT_PLAN_TEMPLATE_Niho_Taniwha_Revised.docx. Export alters only document content and author metadata, preserving styles, media, section setup and column definitions. Learning focus pairs are cloned in the continuation table; up to 16 are supported. Long content can cause additional pages. Word and Google Docs pagination must be checked separately. Use Word's PDF export for a fixed layout.

Device saving is local to this browser, with no central school database. Download a JSON working copy to transfer or back up a plan.

## Further viability testing

Verify exports with 1, 4 and 6 focuses and realistic long text. Check the A3 document in desktop Word and separately after Google Docs conversion. Trial a complete Ministry extract against a department-authored benchmark plan. Then connect Gemini and compare first drafts, revisions and statement fidelity. A versioned, approved curriculum collection is the next requirement for automatic retrieval.
