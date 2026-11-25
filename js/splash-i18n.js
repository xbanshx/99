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
        "p-tech-proof": "أنظمة مطوّرة داخلياً: EXOX.AI · PR MEDIA · FIRX",
        "p-tech-cta": "استكشف 99 للتقنية ←",
        "splash-footer": "من جدة إلى المملكة والخليج — إعلام يصنع الهيبة، وتقنية تقود المستقبل",
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
        "p-tech-proof": "Engineered in-house: EXOX.AI · PR MEDIA · FIRX",
        "p-tech-cta": "Explore 99 Tech →",
        "splash-footer": "From Jeddah to Saudi Arabia & GCC — Cinema-grade media & sovereign AI engineering",
        "p-pdf": "Company Profile PDF",
        "splash-main-heading": "99 Media & Tech — Jeddah, Saudi Arabia"
    }
};

let currentLang = localStorage.getItem("lang") || "ar";

function syncSeamPosition(focusWorld) {
    const stage = document.getElementById("portal-stage");
    if (!stage) return;
    const isRtl = document.documentElement.dir === "rtl";
    let seamX = "50%";
    if (focusWorld === "media") seamX = isRtl ? "41%" : "59%";
    else if (focusWorld === "tech") seamX = isRtl ? "59%" : "41%";
    stage.setAttribute("data-focus", focusWorld || "idle");
    stage.style.setProperty("--seam-x", seamX);
}

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
        ? "99 Media & Tech | Broadcast Production & AI Engineering in Jeddah | i99.sa"
        : "99 Media & Tech | مؤسسة تسعة وتسعون للإعلام والتقنية والذكاء الاصطناعي — جدة | i99.sa";

    const stage = document.getElementById("portal-stage");
    if (stage) syncSeamPosition(stage.getAttribute("data-focus") || "idle");
}

document.addEventListener("DOMContentLoaded", () => {
    switchLang(currentLang);

    const langBtn = document.getElementById("lang-toggle");
    if (langBtn) {
        langBtn.addEventListener("click", () => {
            switchLang(currentLang === "ar" ? "en" : "ar");
        });
    }

    // Live Jeddah Clock (Asia/Riyadh)
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

    // Synchronized Optical Seam + Lightweight CSS Spotlight + Curtain-Wipe Click
    const stage = document.getElementById("portal-stage");
    const doors = Array.from(document.querySelectorAll(".doorway"));
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const isFine = window.matchMedia("(pointer: fine)").matches;

    if (stage && doors.length) {
        doors.forEach((door) => {
            const world = door.getAttribute("data-world");

            if (isFine) {
                door.addEventListener("pointerenter", () => syncSeamPosition(world));
                door.addEventListener("pointermove", (e) => {
                    const r = door.getBoundingClientRect();
                    door.style.setProperty("--mx", `${(e.clientX - r.left).toFixed(0)}px`);
                    door.style.setProperty("--my", `${(e.clientY - r.top).toFixed(0)}px`);
                }, { passive: true });
            }

            door.addEventListener("focus", () => syncSeamPosition(world));

            // Theatrical 260ms curtain-wipe navigation (respects Cmd/Ctrl new-tab)
            door.addEventListener("click", (e) => {
                if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0 || prefersReduced || window.innerWidth <= 900) {
                    return;
                }
                e.preventDefault();
                const href = door.getAttribute("href");
                stage.classList.add(world === "media" ? "is-entering-media" : "is-entering-tech");
                setTimeout(() => { window.location.href = href; }, 260);
            });
        });

        stage.addEventListener("pointerleave", () => syncSeamPosition("idle"));
    }

    // Reset curtain state if user navigates back via browser bfcache
    window.addEventListener("pageshow", () => {
        if (stage) {
            stage.classList.remove("is-entering-media", "is-entering-tech");
            syncSeamPosition("idle");
        }
    });
});
