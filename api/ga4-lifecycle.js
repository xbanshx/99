/**
 * 99 Media & Tech (i99.sa) — Server-Side GA4 Measurement Protocol & CRM Lifecycle Webhook
 * Vercel Serverless Function: POST /api/ga4-lifecycle
 *
 * Security & Privacy Guarantees:
 * - GA4 API Secret is stored ONLY in Vercel Environment Variable (`GA4_API_SECRET`) — NEVER in client code.
 * - Protected by Bearer token (`I99_CRM_WEBHOOK_SECRET`) so unauthorized actors cannot spoof CRM conversions.
 * - Strict zero-PII enforcement: rejects/strips email, phone, and customer names before forwarding to Google.
 * - Strictly separates commercial metrics:
 *     1) generate_lead       -> New verified lead (no fake revenue)
 *     2) qualify_lead        -> Qualified opportunity (`opportunity_value` SAR — pipeline, NOT revenue)
 *     3) proposal_sent       -> Commercial quote sent (`quote_value` SAR — quoted, NOT revenue)
 *     4) close_convert_lead  -> Signed contract (`contract_value` SAR — booked contract value)
 *     5) purchase            -> Actual collected payment (`value` SAR + `transaction_id` — realized revenue)
 *
 * Required Vercel Environment Variables:
 *   GA4_MEASUREMENT_ID     = G-SBQ4DKVCV8
 *   GA4_API_SECRET         = <from GA4 Admin -> Data Streams -> Measurement Protocol API secrets>
 *   I99_CRM_WEBHOOK_SECRET = <strong random secret shared with your CRM / Zapier / Make / n8n>
 */

const ALLOWED_STAGES = {
    generate_lead: "generate_lead",
    qualify_lead: "qualify_lead",
    proposal_sent: "proposal_sent",
    close_convert_lead: "close_convert_lead",
    payment_received: "purchase" // Realized collected revenue only
};

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const PHONE_RE = /(\+?\d[\d\s\-()]{7,}\d)/;
const PII_KEYS = new Set(["name", "full_name", "customer_name", "email", "phone", "mobile", "whatsapp", "address", "national_id", "notes"]);

function sanitizeString(val, maxLen = 80) {
    if (val === undefined || val === null) return undefined;
    const s = String(val).trim().slice(0, maxLen);
    if (!s || EMAIL_RE.test(s) || PHONE_RE.test(s)) return undefined;
    return s;
}

function toPositiveNumber(val) {
    const n = Number(val);
    return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : undefined;
}

export default async function handler(req, res) {
    res.setHeader("Cache-Control", "no-store");

    if (req.method === "GET") {
        return res.status(200).json({
            service: "i99-ga4-crm-lifecycle",
            status: "ready",
            measurement_id_configured: Boolean(process.env.GA4_MEASUREMENT_ID || "G-SBQ4DKVCV8"),
            api_secret_configured: Boolean(process.env.GA4_API_SECRET),
            webhook_auth_configured: Boolean(process.env.I99_CRM_WEBHOOK_SECRET),
            supported_stages: Object.keys(ALLOWED_STAGES)
        });
    }

    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method Not Allowed. Use POST." });
    }

    // Verify CRM Bearer authentication
    const webhookSecret = process.env.I99_CRM_WEBHOOK_SECRET;
    if (!webhookSecret) {
        return res.status(503).json({
            error: "CRM webhook not activated yet. Set I99_CRM_WEBHOOK_SECRET and GA4_API_SECRET in Vercel Environment Variables."
        });
    }

    const authHeader = req.headers.authorization || "";
    if (authHeader !== `Bearer ${webhookSecret}`) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    const measurementId = process.env.GA4_MEASUREMENT_ID || "G-SBQ4DKVCV8";
    const apiSecret = process.env.GA4_API_SECRET;
    if (!apiSecret) {
        return res.status(503).json({ error: "GA4_API_SECRET environment variable is missing." });
    }

    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
    const stage = String(body.stage || "").trim();
    const gaEventName = ALLOWED_STAGES[stage];

    if (!gaEventName) {
        return res.status(400).json({
            error: "Invalid lifecycle stage.",
            allowed_stages: Object.keys(ALLOWED_STAGES)
        });
    }

    const leadId = sanitizeString(body.lead_id, 64);
    if (!leadId) {
        return res.status(400).json({ error: "lead_id is required for CRM attribution and deduplication." });
    }

    // Client ID links server-side CRM deal back to the original browser session in GA4
    const clientId = sanitizeString(body.ga_client_id, 64) || `crm.${leadId}`;
    const currency = sanitizeString(body.currency, 8) || "SAR";

    const params = {
        lead_id: leadId,
        division: sanitizeString(body.division, 24) || "general",
        service_category: sanitizeString(body.service_category, 64) || "unspecified",
        acq_source: sanitizeString(body.utm_source || body.acq_source, 64) || "direct",
        acq_medium: sanitizeString(body.utm_medium || body.acq_medium, 64) || "none",
        acq_campaign: sanitizeString(body.utm_campaign || body.acq_campaign, 80) || "(none)",
        currency,
        engagement_time_msec: 1
    };

    // Strictly separate Opportunity Value vs Quote Value vs Signed Contract Value vs Realized Collected Revenue
    if (stage === "qualify_lead") {
        const oppVal = toPositiveNumber(body.opportunity_value);
        if (oppVal !== undefined) params.opportunity_value = oppVal;
        params.lead_status = sanitizeString(body.lead_status, 32) || "qualified";
    } else if (stage === "proposal_sent") {
        const quoteVal = toPositiveNumber(body.quote_value);
        if (quoteVal !== undefined) params.quote_value = quoteVal;
        params.proposal_id = sanitizeString(body.proposal_id, 48);
    } else if (stage === "close_convert_lead") {
        const contractVal = toPositiveNumber(body.contract_value);
        if (contractVal !== undefined) {
            params.contract_value = contractVal;
            params.value = contractVal; // GA4 close_convert_lead official booked value
        }
        params.contract_id = sanitizeString(body.contract_id, 48) || leadId;
    } else if (stage === "payment_received") {
        const paidVal = toPositiveNumber(body.collected_revenue);
        const txnId = sanitizeString(body.payment_id || body.transaction_id, 64);
        if (paidVal === undefined || !txnId) {
            return res.status(400).json({
                error: "payment_received requires numeric collected_revenue and unique payment_id (transaction_id) for deduplication."
            });
        }
        params.transaction_id = txnId;
        params.value = paidVal; // Official GA4 realized revenue
        params.collected_revenue = paidVal;
        if (body.contract_id) params.contract_id = sanitizeString(body.contract_id, 48);
    }

    // Defensive check: remove any accidental PII or undefined fields
    for (const k of Object.keys(params)) {
        if (PII_KEYS.has(k) || params[k] === undefined) delete params[k];
    }

    const isDebug = req.query.debug === "1" || body.debug === true;
    const mpBase = isDebug
        ? "https://www.google-analytics.com/debug/mp/collect"
        : "https://www.google-analytics.com/mp/collect";

    const mpUrl = `${mpBase}?measurement_id=${encodeURIComponent(measurementId)}&api_secret=${encodeURIComponent(apiSecret)}`;
    const mpPayload = {
        client_id: clientId,
        non_personalized_ads: false,
        events: [{ name: gaEventName, params }]
    };

    try {
        const mpRes = await fetch(mpUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(mpPayload)
        });

        const responseData = isDebug ? await mpRes.json() : { ok: mpRes.ok, status: mpRes.status };
        return res.status(mpRes.ok ? 200 : 502).json({
            forwarded: mpRes.ok,
            debug: isDebug,
            event: gaEventName,
            lead_id: leadId,
            ga4_response: responseData
        });
    } catch (err) {
        return res.status(502).json({ error: "Failed to reach GA4 Measurement Protocol", detail: err.message });
    }
}
