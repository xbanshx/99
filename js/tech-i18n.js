const techTranslations = {
    ar: {
        "t-header-cta": "تواصل معنا",
        "t-badge": "نبني المستقبل الرقمي",
        "t-hero-title": 'نحوّل أفكارك إلى حلول تقنية <span>ذكية</span> تقود نجاحك.',
        "t-hero-desc": "نصمم ونطور حلولاً برمجية متكاملة وأنظمة ذكاء اصطناعي مبتكرة تمكّن مؤسستك من التحول الرقمي والتفوق في سوق المنافسة.",
        "t-hero-cta": "ابدأ مشروعك",
        "t-back-media": "← قسم الإعلام",
        "t-services-title": "خدماتنا التقنية",
        "t-svc1-title": "تطوير البرمجيات",
        "t-svc1-desc": "أنظمة ومنصات مخصصة تلبي احتياجات مؤسستك بأحدث التقنيات وأفضل الممارسات العالمية، من التصميم إلى الإطلاق والدعم المستمر.",
        "t-svc2-title": "المواقع والتطبيقات",
        "t-svc2-desc": "مواقع إلكترونية وتطبيقات موبايل تفاعلية بتصاميم عصرية وتجربة مستخدم استثنائية تعكس هوية علامتك التجارية وتحقق أهدافك.",
        "t-svc3-title": "حلول الذكاء الاصطناعي",
        "t-svc3-desc": "روبوتات محادثة ذكية، أنظمة تحليل تنبؤي، أتمتة العمليات، ونماذج AI مخصصة تمنح مؤسستك ميزة تنافسية فريدة في السوق.",
        "t-svc4-title": "تحليل البيانات",
        "t-svc4-desc": "لوحات تحكم تفاعلية وتقارير ذكية تحوّل بياناتك إلى رؤى قابلة للتنفيذ، تمكّنك من اتخاذ قرارات مبنية على معطيات دقيقة.",
        "t-svc5-title": "الحوسبة السحابية",
        "t-svc5-desc": "بنية تحتية سحابية آمنة ومرنة وقابلة للتوسع، مع خدمات الاستضافة والنشر والمراقبة على مدار الساعة لضمان استمرارية أعمالك.",
        "t-about-title": "لماذا 99 تقنية؟",
        "t-about-desc": "نجمع بين الخبرة الإعلامية العميقة والقدرات التقنية المتقدمة لنقدم حلولاً رقمية شاملة. فريقنا من المهندسين والمطورين وخبراء الذكاء الاصطناعي يعمل بشغف لتحويل تحدياتك إلى فرص نمو حقيقية.",
        "t-stat1": "مشروع تقني منجز",
        "t-stat2": "سنوات خبرة",
        "t-stat3": "دعم فني متواصل",
        "t-partners-title": "شركاء النجاح",
        "t-contact-title": "ابدأ مشروعك معنا",
        "t-label-name": "الاسم",
        "t-label-email": "البريد الإلكتروني",
        "t-label-message": "تفاصيل المشروع",
        "t-submit-btn": "أرسل طلبك"
    },
    en: {
        "t-header-cta": "Contact Us",
        "t-badge": "Building the Digital Future",
        "t-hero-title": 'We Transform Your Ideas into <span>Smart</span> Tech Solutions That Drive Success.',
        "t-hero-desc": "We design and develop comprehensive software solutions and innovative AI systems that empower your organization's digital transformation and competitive advantage.",
        "t-hero-cta": "Start Your Project",
        "t-back-media": "→ Media Division",
        "t-services-title": "Our Tech Services",
        "t-svc1-title": "Software Development",
        "t-svc1-desc": "Custom systems and platforms tailored to your organization's needs, built with the latest technologies and global best practices, from design to launch and continuous support.",
        "t-svc2-title": "Web & Mobile Apps",
        "t-svc2-desc": "Interactive websites and mobile applications with modern designs and exceptional user experience that reflect your brand identity and achieve your goals.",
        "t-svc3-title": "AI Solutions",
        "t-svc3-desc": "Intelligent chatbots, predictive analytics, process automation, and custom AI models that give your organization a unique competitive edge in the market.",
        "t-svc4-title": "Data Analytics",
        "t-svc4-desc": "Interactive dashboards and smart reports that transform your data into actionable insights, enabling you to make decisions based on precise data.",
        "t-svc5-title": "Cloud Computing",
        "t-svc5-desc": "Secure, flexible, and scalable cloud infrastructure with 24/7 hosting, deployment, and monitoring services to ensure your business continuity.",
        "t-about-title": "Why 99 Tech?",
        "t-about-desc": "We combine deep media expertise with advanced technical capabilities to deliver comprehensive digital solutions. Our team of engineers, developers, and AI experts works passionately to turn your challenges into real growth opportunities.",
        "t-stat1": "Tech Projects Completed",
        "t-stat2": "Years of Experience",
        "t-stat3": "24/7 Technical Support",
        "t-partners-title": "Success Partners",
        "t-contact-title": "Start Your Project With Us",
        "t-label-name": "Name",
        "t-label-email": "Email",
        "t-label-message": "Project Details",
        "t-submit-btn": "Submit Request"
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
        if (techTranslations[lang][key]) {
            el.innerHTML = techTranslations[lang][key];
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

document.addEventListener("DOMContentLoaded", () => switchLang(currentLang));
