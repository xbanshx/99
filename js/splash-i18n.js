const splashTranslations = {
    ar: {
        "splash-media-title": "الإعلام",
        "splash-media-desc": "إنتاج محتوى، تسويق رقمي، علاقات عامة",
        "splash-tech-title": "التقنية والذكاء الاصطناعي",
        "splash-tech-desc": "تطوير برمجيات، حلول AI، تحليل بيانات",
        "splash-enter": "اكتشف المزيد ←",
        "splash-footer": "إعلام سعودي بروح عالمية"
    },
    en: {
        "splash-media-title": "Media",
        "splash-media-desc": "Content Production, Digital Marketing, Public Relations",
        "splash-tech-title": "Technology & AI",
        "splash-tech-desc": "Software Development, AI Solutions, Data Analytics",
        "splash-enter": "Explore →",
        "splash-footer": "Saudi Media with a Global Vision"
    }
};

let currentLang = localStorage.getItem("lang") || "ar";

function switchLang(lang) {
    currentLang = lang;
    localStorage.setItem("lang", lang);
    const html = document.documentElement;
    html.lang = lang;
    html.dir = lang === "ar" ? "rtl" : "ltr";

    document.querySelectorAll("[data-i18n]").forEach(el => {
        const key = el.getAttribute("data-i18n");
        if (splashTranslations[lang][key]) {
            el.innerHTML = splashTranslations[lang][key];
        }
    });

    const btn = document.getElementById("lang-toggle");
    if (btn) btn.textContent = lang === "ar" ? "EN" : "عربي";

    if (lang === "en") {
        document.body.style.fontFamily = "'Inter', sans-serif";
    } else {
        document.body.style.fontFamily = "";
    }
}

document.addEventListener("DOMContentLoaded", () => {
    switchLang(currentLang);
});
