/* ==========================================================================
   99 MEDIA & TECH — ZERO-LAG ANALYTICS, UTM ATTRIBUTION & CONVERSION BRIDGE
   - Captures UTM params (utm_source/medium/campaign) + referrer into sessionStorage
     and automatically attaches them to Web3Forms submissions so every lead email
     shows which platform brought the client!
   - Deferred loading (requestIdleCallback) for GA4 / Microsoft Clarity / GTM
     with zero impact on 60fps performance or Core Web Vitals.
   ========================================================================== */
(function () {
    "use strict";

    // Paste your free IDs below when ready (leave empty to stay dormant with 0 requests):
    const CONFIG = {
        GA4_ID: "",             // Loaded directly in <head> (G-SBQ4DKVCV8)
        CLARITY_ID: "zjf4dy26hv", // Microsoft Clarity (Heatmaps & Session Recordings — idle-deferred)
        GTM_ID: ""              // Optional GTM container
    };

    // 1. Capture UTM & Landing Attribution silently on first visit
    try {
        const params = new URLSearchParams(window.location.search);
        const utmKeys = ["utm_source", "utm_medium", "utm_campaign", "utm_content"];
        const found = {};
        let hasUtm = false;
        utmKeys.forEach((k) => {
            const v = params.get(k);
            if (v) { found[k] = v; hasUtm = true; }
        });
        if (hasUtm) {
            sessionStorage.setItem("i99_utm", JSON.stringify(found));
        }
        if (!sessionStorage.getItem("i99_ref") && document.referrer && !document.referrer.includes(window.location.hostname)) {
            sessionStorage.setItem("i99_ref", document.referrer);
        }
        if (!sessionStorage.getItem("i99_landing")) {
            sessionStorage.setItem("i99_landing", window.location.pathname);
        }
    } catch (_) {}

    // 2. Attach hidden attribution fields to any inquiry form on the page
    const enrichForms = () => {
        try {
            const utm = JSON.parse(sessionStorage.getItem("i99_utm") || "{}");
            const ref = sessionStorage.getItem("i99_ref") || "direct";
            const landing = sessionStorage.getItem("i99_landing") || window.location.pathname;
            const summary = Object.keys(utm).length
                ? Object.entries(utm).map(([k, v]) => `${k}=${v}`).join(" | ") + ` | ref=${ref} | landing=${landing}`
                : `direct_or_organic | ref=${ref} | landing=${landing}`;

            document.querySelectorAll("form").forEach((form) => {
                if (!form.querySelector('input[name="lead_source"]')) {
                    const inp = document.createElement("input");
                    inp.type = "hidden";
                    inp.name = "lead_source";
                    inp.value = summary;
                    form.appendChild(inp);
                }
            });
        } catch (_) {}
    };

    // 3. Standardized Conversion Event Emitter (GA4 + GTM dataLayer + Clarity)
    const trackEvent = (eventName, payload) => {
        try {
            if (typeof window.gtag === "function") {
                window.gtag("event", eventName, payload || {});
            }
            if (Array.isArray(window.dataLayer)) {
                window.dataLayer.push(Object.assign({ event: eventName }, payload || {}));
            }
            if (typeof window.clarity === "function") {
                window.clarity("event", eventName);
            }
        } catch (_) {}
    };

    // 4. Bind lightweight delegated conversion tracking (WhatsApp, PDF, Forms, Division clicks)
    const bindEvents = () => {
        enrichForms();

        document.addEventListener("click", (e) => {
            const link = e.target && e.target.closest ? e.target.closest("a") : null;
            if (!link) return;
            const href = link.getAttribute("href") || "";
            const page = window.location.pathname;

            if (href.includes("wa.me/")) {
                trackEvent("whatsapp_click", { page_path: page, link_text: (link.textContent || "").trim() });
            } else if (href.endsWith(".pdf")) {
                trackEvent("profile_pdf_download", { page_path: page, file_name: href.split("/").pop() });
            } else if (href.startsWith("mailto:")) {
                trackEvent("email_click", { page_path: page });
            } else if (href.startsWith("tel:")) {
                trackEvent("phone_click", { page_path: page });
            } else if (link.classList.contains("doorway")) {
                trackEvent("division_enter", { division: link.getAttribute("data-world") || href });
            }
        }, { passive: true });

        document.addEventListener("submit", (e) => {
            const form = e.target;
            if (form && form.tagName === "FORM") {
                trackEvent("lead_form_submit", { page_path: window.location.pathname, form_id: form.id || "inquiry" });
            }
        }, { passive: true });
    };

    // 5. Idle-deferred Analytics Loader (only loads when IDs are configured)
    const loadConfiguredTrackers = () => {
        if (CONFIG.GTM_ID) {
            window.dataLayer = window.dataLayer || [];
            window.dataLayer.push({ "gtm.start": new Date().getTime(), event: "gtm.js" });
            const s = document.createElement("script");
            s.async = true;
            s.src = `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(CONFIG.GTM_ID)}`;
            document.head.appendChild(s);
        }

        if (CONFIG.GA4_ID) {
            window.dataLayer = window.dataLayer || [];
            window.gtag = function () { window.dataLayer.push(arguments); };
            window.gtag("js", new Date());
            window.gtag("config", CONFIG.GA4_ID, { send_page_view: true });
            const s = document.createElement("script");
            s.async = true;
            s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(CONFIG.GA4_ID)}`;
            document.head.appendChild(s);
        }

        if (CONFIG.CLARITY_ID) {
            (function (c, l, a, r, i, t, y) {
                c[a] = c[a] || function () { (c[a].q = c[a].q || []).push(arguments); };
                t = l.createElement(r); t.async = 1; t.src = "https://www.clarity.ms/tag/" + i;
                y = l.getElementsByTagName(r)[0]; y.parentNode.insertBefore(t, y);
            })(window, document, "clarity", "script", CONFIG.CLARITY_ID);
        }
    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", bindEvents);
    } else {
        bindEvents();
    }

    const schedule = window.requestIdleCallback || ((fn) => setTimeout(fn, 1500));
    schedule(loadConfiguredTrackers);
})();
