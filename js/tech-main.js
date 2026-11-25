document.addEventListener("DOMContentLoaded", () => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // 1. LANGUAGE TOGGLE & MOBILE DRAWER
    const langBtn = document.getElementById("lang-toggle");
    if (langBtn) {
        langBtn.addEventListener("click", () => {
            switchLang(window.currentLang === "ar" ? "en" : "ar");
        });
    }

    const menuBtn = document.getElementById("mobile-menu-btn");
    const mobileDrawer = document.getElementById("mobile-drawer");
    if (menuBtn && mobileDrawer) {
        const closeMenu = () => {
            menuBtn.setAttribute("aria-expanded", "false");
            mobileDrawer.hidden = true;
        };
        menuBtn.addEventListener("click", () => {
            const open = menuBtn.getAttribute("aria-expanded") === "true";
            menuBtn.setAttribute("aria-expanded", String(!open));
            mobileDrawer.hidden = open;
        });
        mobileDrawer.querySelectorAll("a").forEach((link) => {
            link.addEventListener("click", closeMenu);
        });
        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape") closeMenu();
        });
    }

    // 2. HEADER SCROLL STATE & ACTIVE NAV SECTION
    const header = document.getElementById("site-header");
    const onScroll = () => {
        if (header) header.classList.toggle("is-scrolled", window.scrollY > 18);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    const navLinks = document.querySelectorAll(".nav-links a[href^='#']");
    if ("IntersectionObserver" in window && navLinks.length > 0) {
        const navObs = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        const id = entry.target.id;
                        navLinks.forEach((a) => {
                            a.classList.toggle("is-active", a.getAttribute("href") === `#${id}`);
                        });
                    }
                });
            },
            { rootMargin: "-38% 0px -52% 0px" }
        );
        ["tech-works", "tech-services", "tech-process", "tech-about", "tech-contact"].forEach((id) => {
            const sec = document.getElementById(id);
            if (sec) navObs.observe(sec);
        });
    }

    // 3. GPU-COMPOSITED HERO ENTRANCE & SCROLL REVEALS
    const heroItems = document.querySelectorAll("[data-enter]");
    requestAnimationFrame(() => {
        heroItems.forEach((el) => el.classList.add("is-visible"));
    });

    const reveals = document.querySelectorAll(".reveal");
    if (!prefersReducedMotion && "IntersectionObserver" in window) {
        const revObs = new IntersectionObserver(
            (entries, obs) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add("is-visible");
                        obs.unobserve(entry.target);
                    }
                });
            },
            { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
        );
        reveals.forEach((el) => revObs.observe(el));
    } else {
        reveals.forEach((el) => el.classList.add("is-visible"));
    }

    // 4. INTERACTIVE HERO ARCHITECTURE INSPECTOR (EXOX / PR MEDIA / FIRX)
    const SYSTEMS = {
        exox: {
            code: "EXOX-OS",
            n1Sub: "INPUT",
            n1Main: "Brand Link",
            coreSub: "ORCHESTRATION",
            coreMain: "EXOX Engine",
            n3Sub: "OUTPUT",
            n3Main: "Growth Ops",
            stack: "Multi-Agent Core · Edge API · Structured Memory",
            status: "STATUS // LIVE AT EXOX.AI",
            link: "https://exox.ai",
            external: true,
            ar: {
                domain: "نظام تشغيل ذكي لنمو الأعمال",
                gov: "بوابة اعتماد المالك · عزل بيانات المنشأة",
                cta: "معاينة exox.ai ↗"
            },
            en: {
                domain: "AI Business Operating System",
                gov: "Owner approval gate · Tenant data isolation",
                cta: "Visit exox.ai ↗"
            }
        },
        prmedia: {
            code: "PR-INTEL",
            n1Sub: "SIGNALS",
            n1Main: "Media Feed",
            coreSub: "INTELLIGENCE",
            coreMain: "PR MEDIA AI",
            n3Sub: "ACTION",
            n3Main: "Strategy",
            stack: "Arabic NLP · Sentiment Graph · Executive Briefings",
            status: "STATUS // ENTERPRISE SUITE",
            link: "#tech-works",
            external: false,
            ar: {
                domain: "الذكاء الإعلامي والاتصال الاستراتيجي",
                gov: "تحقق المصادر · تحليل سمعة فوري",
                cta: "تفاصيل المنصة ↓"
            },
            en: {
                domain: "Media Intelligence & Strategic PR",
                gov: "Source verification · Real-time reputation radar",
                cta: "View System ↓"
            }
        },
        firx: {
            code: "FIRX-GOV",
            n1Sub: "POLICY",
            n1Main: "AI Request",
            coreSub: "VERIFICATION",
            coreMain: "FIRX Guard",
            n3Sub: "AUDIT",
            n3Main: "Trusted Out",
            stack: "Policy Engine · Verification Layer · Audit Ledger",
            status: "STATUS // GOVERNANCE CORE",
            link: "#tech-works",
            external: false,
            ar: {
                domain: "حوكمة وتحقق وتنفيذ الذكاء الاصطناعي",
                gov: "سجل تدقيق كامل · امتثال فوري للمخرجات",
                cta: "تفاصيل المنصة ↓"
            },
            en: {
                domain: "AI Governance & Trusted Execution",
                gov: "Full audit trace · Deterministic output verification",
                cta: "View System ↓"
            }
        }
    };

    let activeSystemKey = "exox";
    const archTabs = document.querySelectorAll(".arch-tab");

    const renderSystem = (key) => {
        const sys = SYSTEMS[key];
        if (!sys) return;
        activeSystemKey = key;
        const lang = window.currentLang === "en" ? "en" : "ar";
        const copy = sys[lang];

        const setText = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.textContent = val;
        };

        setText("arch-active-code", sys.code);
        setText("topo-n1-sub", sys.n1Sub);
        setText("topo-n1-main", sys.n1Main);
        setText("topo-core-sub", sys.coreSub);
        setText("topo-core-main", sys.coreMain);
        setText("topo-n3-sub", sys.n3Sub);
        setText("topo-n3-main", sys.n3Main);
        setText("spec-domain", copy.domain);
        setText("spec-stack", sys.stack);
        setText("spec-gov", copy.gov);
        setText("spec-status", sys.status);

        const linkEl = document.getElementById("spec-link");
        if (linkEl) {
            linkEl.textContent = copy.cta;
            linkEl.setAttribute("href", sys.link);
            if (sys.external) {
                linkEl.setAttribute("target", "_blank");
                linkEl.setAttribute("rel", "noopener noreferrer");
            } else {
                linkEl.removeAttribute("target");
                linkEl.removeAttribute("rel");
            }
        }

        archTabs.forEach((tab) => {
            const isSel = tab.getAttribute("data-system") === key;
            tab.classList.toggle("is-active", isSel);
            tab.setAttribute("aria-selected", String(isSel));
        });
    };

    archTabs.forEach((tab) => {
        tab.addEventListener("click", () => {
            const key = tab.getAttribute("data-system");
            if (key) renderSystem(key);
        });
    });

    document.addEventListener("tech:langchange", () => {
        renderSystem(activeSystemKey);
    });
    renderSystem(activeSystemKey);

    // 5. SUBTLE ARCHITECTURAL COORDINATE DOT FIELD (LIGHTWEIGHT, ZERO THREE.JS)
    const canvas = document.getElementById("arch-canvas");
    if (canvas && canvas.getContext) {
        const ctx = canvas.getContext("2d");
        let width = 0;
        let height = 0;
        let pointerX = -9999;
        let pointerY = -9999;
        let rafId = null;

        const resize = () => {
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            width = window.innerWidth;
            height = window.innerHeight;
            canvas.width = Math.floor(width * dpr);
            canvas.height = Math.floor(height * dpr);
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            drawField();
        };

        const drawField = () => {
            ctx.clearRect(0, 0, width, height);
            const spacing = 44;
            const radius = 150;

            for (let x = spacing / 2; x < width; x += spacing) {
                for (let y = spacing / 2; y < height; y += spacing) {
                    const dx = x - pointerX;
                    const dy = y - pointerY;
                    const dist = Math.hypot(dx, dy);

                    if (dist < radius) {
                        const influence = 1 - dist / radius;
                        ctx.fillStyle = `rgba(0, 229, 176, ${(0.08 + influence * 0.36).toFixed(3)})`;
                        ctx.fillRect(x - 1, y - 1, 2, 2);
                    } else {
                        ctx.fillStyle = "rgba(255, 255, 255, 0.065)";
                        ctx.fillRect(x - 0.5, y - 0.5, 1.2, 1.2);
                    }
                }
            }
        };

        window.addEventListener("resize", resize, { passive: true });
        resize();

        if (!prefersReducedMotion && window.matchMedia("(pointer: fine)").matches) {
            window.addEventListener(
                "pointermove",
                (e) => {
                    pointerX = e.clientX;
                    pointerY = e.clientY;
                    if (!rafId) {
                        rafId = requestAnimationFrame(() => {
                            drawField();
                            rafId = null;
                        });
                    }
                },
                { passive: true }
            );
        }
    }

    // 6. PROJECT SCOPE CHIPS + WEB3FORMS ASYNC HANDLER
    const scopeChips = document.querySelectorAll(".scope-chip");
    const scopeInput = document.getElementById("tech-scope-input");
    scopeChips.forEach((chip) => {
        chip.addEventListener("click", () => {
            scopeChips.forEach((c) => c.classList.remove("is-selected"));
            chip.classList.add("is-selected");
            if (scopeInput) {
                scopeInput.value = chip.getAttribute("data-scope") || "AI Systems";
            }
        });
    });

    const techForm = document.getElementById("tech-form");
    if (techForm) {
        techForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const statusDiv = techForm.querySelector(".form-status");
            const submitBtn = techForm.querySelector("button[type='submit']");
            const nameInput = techForm.querySelector("#tech-name");
            const emailInput = techForm.querySelector("#tech-email");
            const messageInput = techForm.querySelector("#tech-message");
            const botcheck = techForm.querySelector('input[name="botcheck"]');

            if (botcheck && botcheck.checked) return;

            const isEn = document.documentElement.lang === "en";
            const setStatus = (type, msg) => {
                if (!statusDiv) return;
                statusDiv.className = `form-status ${type === "ok" ? "is-success" : "is-error"}`;
                statusDiv.textContent = msg;
            };

            if (!nameInput.value.trim() || !emailInput.value.trim() || !messageInput.value.trim()) {
                setStatus(
                    "err",
                    isEn ? "Please complete all required fields." : "يرجى تعبئة جميع الحقول المطلوبة."
                );
                return;
            }

            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(emailInput.value.trim())) {
                setStatus(
                    "err",
                    isEn ? "Please enter a valid work email address." : "يرجى إدخال بريد إلكتروني صحيح."
                );
                return;
            }

            const originalText = submitBtn ? submitBtn.textContent : "";
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = isEn ? "Sending inquiry..." : "جاري إرسال الطلب...";
            }
            if (statusDiv) statusDiv.className = "form-status";

            const payload = Object.fromEntries(new FormData(techForm));

            try {
                const response = await fetch("https://api.web3forms.com/submit", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Accept: "application/json"
                    },
                    body: JSON.stringify(payload)
                });
                const result = await response.json();
                if (response.status === 200 && result.success) {
                    techForm.reset();
                    setStatus(
                        "ok",
                        isEn
                            ? "Your project inquiry has been received. Our engineering team will respond shortly."
                            : "تم استلام طلب مشروعك بنجاح. سيتواصل معك فريقنا الهندسي قريباً."
                    );
                } else {
                    throw new Error(result.message || "Submission failed");
                }
            } catch {
                setStatus(
                    "err",
                    isEn
                        ? "Unable to send right now. Please try again or email Info@i99.sa."
                        : "تعذر الإرسال حالياً. يرجى المحاولة مجدداً أو مراسلتنا على Info@i99.sa."
                );
            } finally {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = originalText;
                }
            }
        });
    }
});
