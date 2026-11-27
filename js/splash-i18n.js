const splashTranslations = {
    ar: {
        "p-city": "جدة، السعودية",
        "p-wa": "واتساب مباشر ↗",
        "p-media-kicker": "دار الإنتاج الإعلامي والسينمائي — منذ 2014",
        "splash-media-title": "99 للإعلام",
        "splash-media-desc": "الإنتاج التلفزيوني والسينمائي، فيديوهات الذكاء الاصطناعي، الاتصال المؤسسي والعلاقات العامة، والتسويق الرقمي.",
        "p-media-proof": "شركاء MBC · هيئة الإذاعة والتلفزيون · مسك · الجمعية الفيصلية",
        "p-media-cta": "ادخل دار الإنتاج ←",
        "p-tech-kicker": "هندسة أنظمة الذكاء الاصطناعي والبرمجيات",
        "splash-tech-title": "99 للتقنية والـ AI",
        "splash-tech-desc": "أنظمة الذكاء الاصطناعي والوكلاء المستقلون، البرمجيات المؤسسية، المنصات الرقمية، البيانات والسحابة.",
        "p-tech-proof": "أنظمة مطوّرة داخلياً: EXOX.AI · PRCI · FIRX",
        "p-tech-cta": "استكشف 99 للتقنية ←",
        "splash-footer": "من جدة إلى المملكة والخليج — إعلام يصنع الهيبة، وتقنية تقود المستقبل",
        "p-insights": "أدلة 99",
        "p-pdf": "ملف الشركة PDF",
        "splash-main-heading": "مؤسسة 99 للإعلام والتقنية والذكاء الاصطناعي — جدة"
    },
    en: {
        "p-city": "Jeddah, KSA",
        "p-wa": "WhatsApp ↗",
        "p-media-kicker": "Broadcast & Cinema Production House — Est. 2014",
        "splash-media-title": "99 Media House",
        "splash-media-desc": "Television & cinema production, director-led AI video, corporate PR & summits, and measurable digital campaigns.",
        "p-media-proof": "Trusted by MBC · SBA · Misk Foundation · Al-Faisalya",
        "p-media-cta": "Enter Media House →",
        "p-tech-kicker": "AI Systems & Enterprise Software Engineering",
        "splash-tech-title": "99 Tech & AI",
        "splash-tech-desc": "Autonomous AI agents, enterprise SaaS engineering, interactive platforms, data pipelines, and Zero-Trust cloud.",
        "p-tech-proof": "Engineered in-house: EXOX.AI · PRCI · FIRX",
        "p-tech-cta": "Explore 99 Tech →",
        "splash-footer": "From Jeddah to Saudi Arabia & GCC — Cinema-grade media & sovereign AI engineering",
        "p-insights": "99 Guides",
        "p-pdf": "Company Profile PDF",
        "splash-main-heading": "99 Media & Tech — Jeddah, Saudi Arabia"
    }
};

let currentLang = localStorage.getItem("lang") || "ar";

function switchLang(lang) {
    currentLang = lang;
    localStorage.setItem("lang", lang);
    const html = document.documentElement;
    html.lang = lang;
    html.dir = lang === "ar" ? "rtl" : "ltr";

    const dict = splashTranslations[lang] || splashTranslations.ar;
    document.querySelectorAll("[data-i18n]").forEach((el) => {
        const key = el.getAttribute("data-i18n");
        if (dict[key]) el.textContent = dict[key];
    });

    const btn = document.getElementById("lang-toggle");
    if (btn) {
        btn.textContent = lang === "ar" ? "EN" : "عربي";
        btn.setAttribute("aria-label", lang === "ar" ? "Switch to English" : "التبديل إلى العربية");
    }

    document.title = lang === "en"
        ? "99 Media & Tech | Production & AI in Jeddah | i99.sa"
        : "99 للإعلام والتقنية والذكاء الاصطناعي — جدة | i99.sa";
}

document.addEventListener("DOMContentLoaded", () => {
    switchLang(currentLang);

    const langBtn = document.getElementById("lang-toggle");
    if (langBtn) {
        langBtn.addEventListener("click", () => {
            switchLang(currentLang === "ar" ? "en" : "ar");
        });
    }

    const clockEl = document.getElementById("portal-clock");
    const updateClock = () => {
        if (!clockEl) return;
        try {
            clockEl.textContent = new Intl.DateTimeFormat("en-GB", {
                timeZone: "Asia/Riyadh",
                hour: "2-digit",
                minute: "2-digit",
                hour12: false
            }).format(new Date());
        } catch (_) {
            clockEl.textContent = "KSA";
        }
    };
    updateClock();
    setInterval(updateClock, 30000);

    // Pure attribute toggle (ZERO pointermove paint, ZERO layout reflow!)
    const stage = document.getElementById("portal-stage");
    const doors = Array.from(document.querySelectorAll(".doorway"));
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const isFine = window.matchMedia("(pointer: fine)").matches;

    if (stage && doors.length) {
        doors.forEach((door) => {
            const world = door.getAttribute("data-world");
            if (isFine) {
                door.addEventListener("pointerenter", () => stage.setAttribute("data-focus", world));
            }
            door.addEventListener("focus", () => stage.setAttribute("data-focus", world));

            door.addEventListener("click", (e) => {
                if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0 || prefersReduced || window.innerWidth <= 900) {
                    return;
                }
                e.preventDefault();
                const href = door.getAttribute("href");
                stage.classList.add(world === "media" ? "is-entering-media" : "is-entering-tech");
                setTimeout(() => { window.location.href = href; }, 240);
            });
        });

        stage.addEventListener("pointerleave", () => stage.setAttribute("data-focus", "idle"));
    }

    window.addEventListener("pageshow", () => {
        if (stage) {
            stage.classList.remove("is-entering-media", "is-entering-tech");
            stage.setAttribute("data-focus", "idle");
        }
    });
});
