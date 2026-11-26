/* ==========================================================================
   99 MEDIA & TECH (i99.sa) — ENTERPRISE ANALYTICS, ATTRIBUTION & CRM BRIDGE v2.0
   Zero visual impact · Zero render blocking · Zero PII · Strict Deduplication
   --------------------------------------------------------------------------
   Capabilities:
   - Single-init guard (prevents duplicate GA4/Clarity initialization)
   - Google Consent Mode v2 + Global Privacy Control (GPC) & programmatic opt-out
   - Strict PII Sanitizer (blocks emails, phone numbers, names, free text)
   - First-Touch (90d localStorage) + Last-Touch (sessionStorage) UTM/Click-ID capture
   - Official GA4 Recommended Events:
       file_download · form_start · generate_lead (SERVER-CONFIRMED ONLY!)
       view_item (services/works/guides) · select_content · contact_whatsapp
       contact_phone · contact_email · quote_request
   - Time-window & session deduplication (prevents double-click / duplicate hits)
   - Automatic CRM-ready attribution hidden fields (lead_id, ga_client_id, UTM)
   - Debug mode support via ?i99_debug=1 (enables GA4 DebugView debug_mode: true)
   ========================================================================== */
(function () {
    "use strict";

    if (window.__i99AnalyticsInit) return;
    window.__i99AnalyticsInit = true;

    const CONFIG = {
        GA4_MEASUREMENT_ID: "G-SBQ4DKVCV8", // Installed once in <head>; never duplicated here
        CLARITY_ID: "zjf4dy26hv",           // Loaded once on idle if consent granted
        ATTRIBUTION_TTL_MS: 90 * 24 * 60 * 60 * 1000, // 90 days first-touch retention
        CLICK_DEDUP_MS: 1200                // Prevents rapid double-click duplicate events
    };

    const urlParams = new URLSearchParams(window.location.search);
    const DEBUG_MODE = urlParams.get("i99_debug") === "1" || urlParams.get("gtm_debug") !== null;

    // -----------------------------------------------------------------------
    // 1. PRIVACY & CONSENT MANAGEMENT (Respects GPC + stored user preference)
    // -----------------------------------------------------------------------
    const readConsent = () => {
        try {
            if (navigator.globalPrivacyControl === true) return false;
            const saved = localStorage.getItem("i99_analytics_consent");
            if (saved === "denied") return false;
            return true;
        } catch (_) {
            return true;
        }
    };

    let consentGranted = readConsent();

    const applyConsentState = (granted) => {
        consentGranted = Boolean(granted);
        try {
            localStorage.setItem("i99_analytics_consent", consentGranted ? "granted" : "denied");
        } catch (_) {}
        if (typeof window.gtag === "function") {
            window.gtag("consent", "update", {
                analytics_storage: consentGranted ? "granted" : "denied",
                ad_storage: consentGranted ? "granted" : "denied",
                ad_user_data: consentGranted ? "granted" : "denied",
                ad_personalization: consentGranted ? "granted" : "denied"
            });
        }
        if (typeof window.clarity === "function") {
            try { window.clarity("consent", consentGranted); } catch (_) {}
        }
        if (consentGranted) scheduleClarityLoad();
    };

    // Apply initial Consent Mode v2 state cleanly if denied/GPC
    if (!consentGranted && typeof window.gtag === "function") {
        window.gtag("consent", "update", {
            analytics_storage: "denied",
            ad_storage: "denied",
            ad_user_data: "denied",
            ad_personalization: "denied"
        });
    }

    // -----------------------------------------------------------------------
    // 2. STRICT PII SANITIZER (Zero personal data ever reaches GA4/Clarity)
    // -----------------------------------------------------------------------
    const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
    const PHONE_RE = /(\+?\d[\d\s\-()]{7,}\d)/;
    const FORBIDDEN_KEYS = new Set(["name", "full_name", "email", "phone", "mobile", "whatsapp_number", "message", "notes", "user_email", "user_phone"]);

    const sanitizeParams = (obj) => {
        const clean = {};
        if (!obj || typeof obj !== "object") return clean;
        for (const [k, v] of Object.entries(obj)) {
            if (v === undefined || v === null || v === "") continue;
            const key = String(k).toLowerCase().replace(/[^a-z0-9_]/g, "_").slice(0, 40);
            if (FORBIDDEN_KEYS.has(key)) continue;
            if (typeof v === "number" || typeof v === "boolean") {
                clean[key] = v;
            } else {
                const str = String(v).trim().slice(0, 100);
                if (EMAIL_RE.test(str) || PHONE_RE.test(str)) continue;
                clean[key] = str;
            }
        }
        return clean;
    };

    // -----------------------------------------------------------------------
    // 3. ATTRIBUTION ENGINE (First-Touch 90d + Last-Touch Session + GA Client ID)
    // -----------------------------------------------------------------------
    const TRACKED_PARAMS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "gclid", "fbclid", "ttclid", "li_fat_id"];

    const getDeviceCategory = () => {
        const w = window.innerWidth || 1280;
        if (w <= 640) return "mobile";
        if (w <= 1024) return "tablet";
        return "desktop";
    };

    const getDivision = () => {
        const p = window.location.pathname.toLowerCase();
        if (p.startsWith("/media")) return "media";
        if (p.startsWith("/tech")) return "tech";
        if (p.startsWith("/insights")) return "insights";
        return "portal";
    };

    const getPageLanguage = () => (document.documentElement.lang === "en" ? "en" : "ar");

    const getGAClientId = () => {
        try {
            const match = document.cookie.match(/(?:^|;\s*)_ga=GA\d\.\d\.(\d+\.\d+)/);
            return match ? match[1] : "";
        } catch (_) {
            return "";
        }
    };

    const getExternalReferrerHost = () => {
        try {
            if (!document.referrer) return "direct";
            const u = new URL(document.referrer);
            if (u.hostname === window.location.hostname || u.hostname.endsWith(".i99.sa") || u.hostname === "i99.sa") {
                return "";
            }
            return u.hostname;
        } catch (_) {
            return "direct";
        }
    };

    const captureAttribution = () => {
        const now = Date.now();
        const found = {};
        let hasCampaign = false;
        TRACKED_PARAMS.forEach((k) => {
            const val = urlParams.get(k);
            if (val) {
                found[k] = val.slice(0, 80);
                hasCampaign = true;
            }
        });

        const refHost = getExternalReferrerHost();
        const landing = window.location.pathname || "/";
        const snapshot = Object.assign(
            {
                utm_source: found.utm_source || (found.gclid ? "google" : found.fbclid ? "meta" : found.ttclid ? "tiktok" : found.li_fat_id ? "linkedin" : (refHost || "direct")),
                utm_medium: found.utm_medium || (found.gclid || found.fbclid || found.ttclid || found.li_fat_id ? "cpc" : (refHost && refHost !== "direct" ? "referral" : "none")),
                utm_campaign: found.utm_campaign || "(none)",
                utm_content: found.utm_content || "",
                utm_term: found.utm_term || "",
                landing_page: landing,
                referrer_host: refHost || "direct",
                captured_at: new Date(now).toISOString()
            },
            found
        );

        // First-touch persistence (90 days in localStorage)
        try {
            const existingRaw = localStorage.getItem("i99_first_touch");
            let validFirst = null;
            if (existingRaw) {
                const parsed = JSON.parse(existingRaw);
                if (parsed && parsed._exp && parsed._exp > now) validFirst = parsed;
            }
            if (!validFirst) {
                localStorage.setItem("i99_first_touch", JSON.stringify(Object.assign({ _exp: now + CONFIG.ATTRIBUTION_TTL_MS }, snapshot)));
            }
        } catch (_) {}

        // Session / Last-touch persistence
        try {
            if (hasCampaign || !sessionStorage.getItem("i99_last_touch")) {
                sessionStorage.setItem("i99_last_touch", JSON.stringify(snapshot));
            }
        } catch (_) {}
    };

    const getAttribution = () => {
        let first = {}, last = {};
        try { first = JSON.parse(localStorage.getItem("i99_first_touch") || "{}"); } catch (_) {}
        try { last = JSON.parse(sessionStorage.getItem("i99_last_touch") || "{}"); } catch (_) {}
        return { first, last };
    };

    const generateLeadId = (division) => {
        const prefix = (division || "gen").slice(0, 3).toUpperCase();
        const ts = Date.now().toString(36).toUpperCase();
        const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
        return `L99-${prefix}-${ts}-${rand}`;
    };

    // -----------------------------------------------------------------------
    // 4. DEDUPLICATED EVENT DISPATCHER (GA4 + Clarity — ZERO DUPLICATION)
    // -----------------------------------------------------------------------
    const recentEvents = new Map();
    const sessionOnceKeys = new Set();

    const track = (eventName, rawParams, opts) => {
        if (!consentGranted || !eventName) return false;
        const options = opts || {};

        // Once-per-session / once-per-page dedup
        if (options.onceKey) {
            const sk = `${eventName}:${options.onceKey}`;
            if (sessionOnceKeys.has(sk)) return false;
            try {
                if (options.persistSession && sessionStorage.getItem(`i99_ev_${sk}`)) return false;
                if (options.persistSession) sessionStorage.setItem(`i99_ev_${sk}`, "1");
            } catch (_) {}
            sessionOnceKeys.add(sk);
        }

        // Time-window rapid-click dedup
        const dedupKey = `${eventName}:${options.dedupKey || ""}`;
        const now = Date.now();
        const prev = recentEvents.get(dedupKey);
        if (prev && (now - prev) < (options.cooldownMs || CONFIG.CLICK_DEDUP_MS)) {
            return false;
        }
        recentEvents.set(dedupKey, now);

        const attr = getAttribution();
        const activeAttr = attr.last.utm_source ? attr.last : attr.first;

        const payload = sanitizeParams(Object.assign(
            {
                division: getDivision(),
                page_language: getPageLanguage(),
                device_category: getDeviceCategory(),
                acq_source: activeAttr.utm_source || "direct",
                acq_medium: activeAttr.utm_medium || "none",
                acq_campaign: activeAttr.utm_campaign || "(none)",
                first_landing_page: attr.first.landing_page || window.location.pathname
            },
            rawParams || {}
        ));

        if (DEBUG_MODE) payload.debug_mode = true;

        // Send ONCE via gtag (GA4); NEVER double-push to dataLayer alongside gtag!
        if (typeof window.gtag === "function") {
            window.gtag("event", eventName, payload);
        }

        // Mirror clean event name + safe tags to Microsoft Clarity
        if (typeof window.clarity === "function") {
            try {
                window.clarity("event", eventName);
                if (payload.division) window.clarity("set", "division", payload.division);
                if (payload.page_language) window.clarity("set", "language", payload.page_language);
                if (payload.acq_source) window.clarity("set", "acq_source", payload.acq_source);
            } catch (_) {}
        }

        if (DEBUG_MODE && window.console) {
            console.info("[i99 Analytics]", eventName, payload);
        }
        return true;
    };

    // -----------------------------------------------------------------------
    // 5. CRM-READY FORM ENRICHMENT (Hidden attribution + lead_id + ga_client_id)
    // -----------------------------------------------------------------------
    const setHiddenField = (form, name, value) => {
        let inp = form.querySelector(`input[name="${name}"]`);
        if (!inp) {
            inp = document.createElement("input");
            inp.type = "hidden";
            inp.name = name;
            form.appendChild(inp);
        }
        inp.value = value;
    };

    const prepareFormForSubmission = (form) => {
        if (!form) return { leadId: generateLeadId(getDivision()), clientId: getGAClientId() };
        const div = getDivision();
        const leadId = generateLeadId(div);
        const clientId = getGAClientId();
        const { first, last } = getAttribution();

        setHiddenField(form, "lead_id", leadId);
        setHiddenField(form, "ga_client_id", clientId || "unavailable");
        setHiddenField(form, "page_language", getPageLanguage());
        setHiddenField(form, "device_category", getDeviceCategory());
        setHiddenField(form, "division", div);
        setHiddenField(
            form,
            "attribution_first_touch",
            `source=${first.utm_source || "direct"} | medium=${first.utm_medium || "none"} | campaign=${first.utm_campaign || "(none)"} | landing=${first.landing_page || "/"} | ref=${first.referrer_host || "direct"}`
        );
        setHiddenField(
            form,
            "attribution_last_touch",
            `source=${last.utm_source || "direct"} | medium=${last.utm_medium || "none"} | campaign=${last.utm_campaign || "(none)"} | landing=${last.landing_page || "/"} | ref=${last.referrer_host || "direct"}`
        );
        return { leadId, clientId };
    };

    // -----------------------------------------------------------------------
    // 6. DOM INTERACTION LISTENERS (Clicks, PDF, Form Start, Sections, Estimator)
    // -----------------------------------------------------------------------
    const detectPlacement = (el) => {
        if (!el || !el.closest) return "body";
        if (el.closest("header, .cinema-header, .site-header, .portal-header, .guide-header")) return "header";
        if (el.closest("footer, .cinema-footer, .site-footer, .portal-footer, .guide-footer")) return "footer";
        if (el.closest("#media-estimator")) return "estimator";
        if (el.closest("#act-slate, #tech-contact")) return "contact_section";
        if (el.closest("#act-theater, .hero-section")) return "hero";
        if (el.closest("#act-director, #tech-capabilities")) return "services_section";
        if (el.closest("#act-synergy")) return "synergy_section";
        if (el.closest(".guide-cta-box")) return "guide_cta";
        return "body";
    };

    const bindListeners = () => {
        // Pre-populate hidden attribution fields on load (refreshed again on submit)
        document.querySelectorAll("form").forEach((form) => {
            prepareFormForSubmission(form);

            // Track custom enriched `inquiry_form_start` ONCE per form per session (avoids collision with GA4 auto Enhanced Measurement `form_start`)
            const onFormStart = () => {
                const formId = form.id || "inquiry_form";
                track(
                    "inquiry_form_start",
                    {
                        form_id: formId,
                        form_name: formId === "media-form" ? "99_media_production_brief" : "99_tech_project_inquiry",
                        form_destination: "web3forms_crm"
                    },
                    { onceKey: formId }
                );
            };
            form.addEventListener("input", onFormStart, { once: true, passive: true });
        });

        // Delegated click tracking (WhatsApp, Phone, Email, PDF Download, Portal, Works, Estimator)
        document.addEventListener("click", (e) => {
            const target = e.target;
            if (!target || !target.closest) return;

            // 1) Anchor clicks
            const link = target.closest("a");
            if (link) {
                const rawHref = link.getAttribute("href") || "";
                const placement = detectPlacement(link);

                if (rawHref.includes("wa.me/")) {
                    const isEstimatorWa = link.id === "est-wa-btn";
                    track(
                        "contact_whatsapp",
                        {
                            contact_method: "whatsapp",
                            placement,
                            from_estimator: isEstimatorWa
                        },
                        { dedupKey: `wa_${placement}` }
                    );
                    if (isEstimatorWa) {
                        track(
                            "quote_request",
                            { quote_channel: "whatsapp_estimator", placement: "estimator" },
                            { dedupKey: "quote_wa" }
                        );
                    }
                    return;
                }

                if (rawHref.startsWith("tel:")) {
                    track("contact_phone", { contact_method: "phone", placement }, { dedupKey: `tel_${placement}` });
                    return;
                }

                if (rawHref.startsWith("mailto:")) {
                    track("contact_email", { contact_method: "email", placement }, { dedupKey: `mail_${placement}` });
                    return;
                }

                // Robust PDF detection (works WITH query strings like ?v=2026! Uses `profile_download` to avoid collision with GA4 auto Enhanced Measurement `file_download`)
                try {
                    const resolved = new URL(rawHref, window.location.href);
                    if (resolved.pathname.toLowerCase().endsWith(".pdf")) {
                        const fileName = resolved.pathname.split("/").pop() || "99-Profile-final.pdf";
                        track(
                            "profile_download",
                            {
                                file_name: fileName,
                                file_extension: "pdf",
                                link_domain: resolved.hostname,
                                placement
                            },
                            { dedupKey: `pdf_${fileName}_${placement}` }
                        );
                        return;
                    }
                } catch (_) {}

                // Portal doorway enter
                if (link.classList.contains("doorway")) {
                    track(
                        "select_content",
                        { content_type: "division_doorway", item_id: link.getAttribute("data-world") || rawHref },
                        { dedupKey: `door_${rawHref}` }
                    );
                    return;
                }

                // External portfolio/product showcase clicks (e.g. EXOX.AI)
                if (rawHref.includes("exox.ai")) {
                    track(
                        "select_content",
                        { content_type: "portfolio_product", item_id: "exox_ai", placement },
                        { dedupKey: `exox_${placement}` }
                    );
                    return;
                }

                // Service discipline -> request CTA
                if (link.id === "brief-cta") {
                    track(
                        "quote_request",
                        { quote_channel: "discipline_cta", placement: "services_section" },
                        { dedupKey: "discipline_cta" }
                    );
                    return;
                }
            }

            // 2) Service discipline selector tabs (Media Act III or Tech Capabilities)
            const serviceTab = target.closest(".dir-row, .cap-tab, .service-tab");
            if (serviceTab) {
                const svcId = serviceTab.getAttribute("data-scene") || serviceTab.getAttribute("data-cap") || serviceTab.getAttribute("data-tab") || "service_item";
                track(
                    "view_item",
                    { item_category: "service_discipline", item_id: svcId },
                    { onceKey: `svc_${svcId}` }
                );
                return;
            }

            // 3) 30-Second Estimator interactions & pre-fill quote button
            const estChip = target.closest(".est-chip");
            if (estChip) {
                track(
                    "select_content",
                    { content_type: "quote_estimator_option", item_id: estChip.getAttribute("data-val") || "option" },
                    { onceKey: "estimator_started" }
                );
                return;
            }

            const estFillBtn = target.closest("#est-fill-btn");
            if (estFillBtn) {
                track(
                    "quote_request",
                    { quote_channel: "form_prefill_estimator", placement: "estimator" },
                    { dedupKey: "quote_prefill" }
                );
            }
        }, { passive: true });

        // Track key Services & Portfolio section visibility ONCE per page via IntersectionObserver
        if ("IntersectionObserver" in window) {
            const sectionTargets = [
                { selector: "#media-partners", type: "portfolio_partners", id: "media_partners_gallery" },
                { selector: "#act-director", type: "services_showcase", id: "media_5_disciplines" },
                { selector: "#act-reel", type: "workflow_showcase", id: "media_35mm_workflow" },
                { selector: "#media-estimator", type: "quote_estimator", id: "media_30s_estimator" },
                { selector: "#tech-works", type: "portfolio_systems", id: "tech_flagship_systems" },
                { selector: "#tech-capabilities", type: "services_showcase", id: "tech_5_capabilities" }
            ];
            const io = new IntersectionObserver((entries, observer) => {
                entries.forEach((entry) => {
                    if (!entry.isIntersecting) return;
                    const cfg = sectionTargets.find((s) => entry.target.matches(s.selector));
                    if (cfg) {
                        track(
                            "view_item",
                            { item_category: cfg.type, item_id: cfg.id },
                            { onceKey: `sec_${cfg.id}` }
                        );
                    }
                    observer.unobserve(entry.target);
                });
            }, { threshold: 0.35 });

            sectionTargets.forEach((cfg) => {
                const el = document.querySelector(cfg.selector);
                if (el) io.observe(el);
            });
        }

        // Guide article view event on /insights/* pages
        if (window.location.pathname.startsWith("/insights/") && window.location.pathname !== "/insights/") {
            const slug = window.location.pathname.replace(/^\/insights\/|\/$/g, "");
            track("view_item", { item_category: "authority_guide", item_id: slug }, { onceKey: `guide_${slug}` });
        }
    };

    // -----------------------------------------------------------------------
    // 7. IDLE-DEFERRED CLARITY LOADER (Single-install guard + consent check)
    // -----------------------------------------------------------------------
    let clarityLoaded = false;
    const scheduleClarityLoad = () => {
        if (clarityLoaded || !consentGranted || !CONFIG.CLARITY_ID) return;
        if (document.querySelector('script[src*="clarity.ms/tag/"]')) {
            clarityLoaded = true;
            return;
        }
        clarityLoaded = true;
        const load = () => {
            if (!consentGranted) return;
            (function (c, l, a, r, i, t, y) {
                c[a] = c[a] || function () { (c[a].q = c[a].q || []).push(arguments); };
                t = l.createElement(r); t.async = 1; t.src = "https://www.clarity.ms/tag/" + i;
                y = l.getElementsByTagName(r)[0]; y.parentNode.insertBefore(t, y);
            })(window, document, "clarity", "script", CONFIG.CLARITY_ID);
        };
        const sched = window.requestIdleCallback || ((fn) => setTimeout(fn, 1400));
        sched(load);
    };

    // -----------------------------------------------------------------------
    // 8. PUBLIC API FOR SERVER-CONFIRMED LEADS, CRM & PRIVACY CONTROLS
    // -----------------------------------------------------------------------
    window.i99Analytics = {
        version: "2.1.0",
        debug: DEBUG_MODE,
        prepareFormForSubmission,
        getAttribution,
        getGAClientId,
        setConsent: applyConsentState,
        hasConsent: () => consentGranted,
        trackEvent: track,

        // MUST be called ONLY AFTER backend/Web3Forms confirms HTTP 200 + success!
        // Fires official GA4 `generate_lead` EXACTLY ONCE per confirmed submission (zero duplication).
        trackLeadConfirmed: ({ formId, division, scope, leadId }) => {
            const lid = leadId || generateLeadId(division || getDivision());
            track(
                "generate_lead",
                {
                    lead_id: lid,
                    form_id: formId || "inquiry_form",
                    division: division || getDivision(),
                    service_category: scope || "general_inquiry",
                    lead_channel: "website_form",
                    currency: "SAR"
                },
                { onceKey: `lead_${lid}` }
            );
            return lid;
        }
    };

    // Initialize immediately (lightweight)
    captureAttribution();
    if (DEBUG_MODE && typeof window.gtag === "function") {
        window.gtag("config", CONFIG.GA4_MEASUREMENT_ID, { debug_mode: true });
    }
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", bindListeners);
    } else {
        bindListeners();
    }
    scheduleClarityLoad();
})();
