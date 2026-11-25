document.addEventListener("DOMContentLoaded", () => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const isFinePointer = window.matchMedia("(pointer: fine)").matches;

    // ═══════════════════════════════════════════════════════════════════════
    // 1. 0.85s MICHAEL BAY INSPIRED SOVEREIGN ROYAL FILM-LEADER CURTAIN
    // ═══════════════════════════════════════════════════════════════════════
    const loader = document.getElementById("cinema-loader");
    const loaderCount = document.getElementById("loader-count");
    const loaderLine = document.getElementById("loader-line");
    const revealHero = () => {
        document.querySelectorAll("[data-enter]").forEach((el) => el.classList.add("is-visible"));
    };

    if (loader && !prefersReducedMotion) {
        const start = performance.now();
        const dur = 760;
        let dismissed = false;

        const dismiss = () => {
            if (dismissed) return;
            dismissed = true;
            loader.classList.add("is-done");
            setTimeout(() => { loader.style.display = "none"; }, 900);
            revealHero();
        };

        loader.addEventListener("click", dismiss);

        const tickLoader = (now) => {
            if (dismissed) return;
            const p = Math.min(1, (now - start) / dur);
            const eased = 1 - Math.pow(1 - p, 3);
            const val = Math.round(eased * 99);
            if (loaderCount) loaderCount.textContent = String(val).padStart(2, "0");
            if (loaderLine) loaderLine.style.setProperty("--p", eased.toFixed(3));
            if (p < 1) {
                requestAnimationFrame(tickLoader);
            } else {
                setTimeout(dismiss, 110);
            }
        };
        requestAnimationFrame(tickLoader);
    } else {
        if (loader) loader.style.display = "none";
        revealHero();
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 2. LIVE JEDDAH BROADCAST CLOCK (Q'IN SABA INSPIRED) + 24FPS HERO TIMECODE
    // ═══════════════════════════════════════════════════════════════════════
    const clockEl = document.getElementById("jeddah-clock");
    const updateJeddahClock = () => {
        if (!clockEl) return;
        try {
            const fmt = new Intl.DateTimeFormat("en-GB", {
                timeZone: "Asia/Riyadh",
                hour: "2-digit",
                minute: "2-digit",
                hour12: false
            });
            clockEl.textContent = fmt.format(new Date());
        } catch (_) {
            clockEl.textContent = "KSA";
        }
    };
    updateJeddahClock();
    setInterval(updateJeddahClock, 15000);

    const heroTc = document.getElementById("hero-tc");
    if (heroTc && !prefersReducedMotion) {
        let f = 0;
        setInterval(() => {
            f = (f + 1) % (24 * 60);
            const sec = String(Math.floor(f / 24)).padStart(2, "0");
            const frm = String(f % 24).padStart(2, "0");
            heroTc.textContent = `00:00:${sec}:${frm}`;
        }, 125);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 3. CUSTOM MAGNETIC CINEMA CURSOR (DESKTOP FINE POINTER ONLY)
    // ═══════════════════════════════════════════════════════════════════════
    const cursorEl = document.getElementById("cinema-cursor");
    const cursorLbl = document.getElementById("cursor-label");
    if (cursorEl && isFinePointer && !prefersReducedMotion) {
        let mx = -100, my = -100, cx = -100, cy = -100;
        let visible = false;

        window.addEventListener("pointermove", (e) => {
            mx = e.clientX;
            my = e.clientY;
            if (!visible) {
                visible = true;
                cursorEl.classList.add("is-visible");
            }
        }, { passive: true });

        document.addEventListener("pointerleave", () => {
            visible = false;
            cursorEl.classList.remove("is-visible");
        });

        document.querySelectorAll("[data-cursor]").forEach((el) => {
            el.addEventListener("pointerenter", () => {
                const txt = el.getAttribute("data-cursor") || "";
                if (cursorLbl) cursorLbl.textContent = txt;
                cursorEl.classList.add("is-pill");
            });
            el.addEventListener("pointerleave", () => {
                cursorEl.classList.remove("is-pill");
            });
        });

        const loopCursor = () => {
            cx += (mx - cx) * 0.18;
            cy += (my - cy) * 0.18;
            cursorEl.style.transform = `translate3d(${cx.toFixed(1)}px, ${cy.toFixed(1)}px, 0) translate(-50%, -50%)`;
            requestAnimationFrame(loopCursor);
        };
        requestAnimationFrame(loopCursor);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 4. WEBGL ANAMORPHIC PROJECTOR LENS SHADER OVER HERO SCREENING ROOM
    // ═══════════════════════════════════════════════════════════════════════
    const initAnamorphicShader = () => {
        const canvas = document.getElementById("anamorphic-shader");
        if (!canvas) return;
        const gl = canvas.getContext("webgl", { alpha: false, antialias: false, powerPreference: "high-performance" });
        if (!gl) return;

        const vs = gl.createShader(gl.VERTEX_SHADER);
        gl.shaderSource(vs, `attribute vec2 p; void main(){ gl_Position = vec4(p,0.,1.); }`);
        gl.compileShader(vs);

        const fs = gl.createShader(gl.FRAGMENT_SHADER);
        gl.shaderSource(fs, `
            precision highp float;
            uniform vec2 u_res;
            uniform float u_t;
            uniform vec2 u_m;
            float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
            void main() {
                vec2 uv = gl_FragCoord.xy / u_res;
                float asp = u_res.x / max(u_res.y, 1.0);
                vec2 p = (uv - 0.5) * vec2(asp, 1.0);
                vec2 m = (u_m - 0.5) * vec2(asp, 1.0);
                float t = u_t * 0.25;

                // Horizontal anamorphic cinema lens streak reacting to mouse Y
                float streak = exp(-pow((p.y - m.y * 0.45) * 9.5, 2.0)) * exp(-abs(p.x - m.x * 0.6) * 1.15);
                // Royal 99 indigo projector beam sweep
                float beam = exp(-pow((p.x * 0.6 - p.y * 0.8 + sin(t) * 0.18) * 2.4, 2.0));
                float grain = (hash(gl_FragCoord.xy + fract(u_t) * 90.0) - 0.5) * 0.03;

                vec3 col = vec3(0.0);
                col += vec3(0.24, 0.04, 0.46) * beam * 0.72;
                col += vec3(0.875, 0.769, 0.573) * streak * 0.55;
                col = max(col + grain, 0.0);
                gl_FragColor = vec4(col, 1.0);
            }
        `);
        gl.compileShader(fs);

        const prog = gl.createProgram();
        gl.attachShader(prog, vs);
        gl.attachShader(prog, fs);
        gl.linkProgram(prog);
        if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
        gl.useProgram(prog);

        const buf = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buf);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
        const loc = gl.getAttribLocation(prog, "p");
        gl.enableVertexAttribArray(loc);
        gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

        const uRes = gl.getUniformLocation(prog, "u_res");
        const uT = gl.getUniformLocation(prog, "u_t");
        const uM = gl.getUniformLocation(prog, "u_m");

        let tx = 0.5, ty = 0.5, cx = 0.5, cy = 0.5, vis = true;
        const t0 = performance.now();

        const resize = () => {
            const dpr = Math.min(window.devicePixelRatio || 1, 1.25);
            const r = canvas.getBoundingClientRect();
            canvas.width = Math.max(1, Math.floor(r.width * dpr));
            canvas.height = Math.max(1, Math.floor(r.height * dpr));
            gl.viewport(0, 0, canvas.width, canvas.height);
        };
        resize();
        window.addEventListener("resize", resize, { passive: true });

        if (isFinePointer && !prefersReducedMotion) {
            window.addEventListener("pointermove", (e) => {
                tx = e.clientX / Math.max(window.innerWidth, 1);
                ty = 1.0 - e.clientY / Math.max(window.innerHeight, 1);
            }, { passive: true });
        }

        const hero = document.getElementById("act-theater");
        if (hero && "IntersectionObserver" in window) {
            new IntersectionObserver((e) => { vis = e[0].isIntersecting; }, { threshold: 0.01 }).observe(hero);
        }

        const draw = (now) => {
            if (vis) {
                cx += (tx - cx) * 0.05;
                cy += (ty - cy) * 0.05;
                gl.uniform2f(uRes, canvas.width, canvas.height);
                gl.uniform1f(uT, prefersReducedMotion ? 1.2 : (now - t0) * 0.001);
                gl.uniform2f(uM, cx, cy);
                gl.drawArrays(gl.TRIANGLES, 0, 6);
            }
            if (!prefersReducedMotion) requestAnimationFrame(draw);
        };
        requestAnimationFrame(draw);
    };
    initAnamorphicShader();

    // ═══════════════════════════════════════════════════════════════════════
    // 5. UNIFIED SCROLL ENGINE:
    //    - Auto-adapting Dark / Warm Ivory Header Theme
    //    - Hero Letterbox Opening & Backdrop Parallax
    //    - Pinned Vertical-to-Horizontal 35mm Film-Strip Roll + Velocity Skew
    //    - Safe Visible Scroll Reveals
    // ═══════════════════════════════════════════════════════════════════════
    const header = document.getElementById("cinema-header");
    const progressBar = document.getElementById("scroll-progress-bar");
    const heroBg = document.getElementById("theater-backdrop");
    const lbTop = document.getElementById("lb-top");
    const lbBot = document.getElementById("lb-bot");
    const reelSec = document.getElementById("act-reel");
    const reelTrack = document.getElementById("reel-track");
    const reelCounter = document.getElementById("reel-frame-num");
    const themedSections = Array.from(document.querySelectorAll("[data-section-theme]"));
    const reveals = Array.from(document.querySelectorAll(".reveal"));

    let lastScrollY = window.scrollY;
    let currentSkew = 0;
    let rafId = null;

    const syncScroll = () => {
        rafId = null;
        const y = window.scrollY;
        const vh = window.innerHeight || 900;
        const maxScroll = Math.max(1, document.documentElement.scrollHeight - vh);
        const ratio = Math.min(1, Math.max(0, y / maxScroll));

        if (progressBar) progressBar.style.transform = `scaleX(${ratio.toFixed(4)})`;

        // Auto-adapt header theme (dark obsidian vs warm alabaster ivory)
        if (header) {
            let activeTheme = "dark";
            const probeY = 48;
            for (const sec of themedSections) {
                const r = sec.getBoundingClientRect();
                if (r.top <= probeY && r.bottom > probeY) {
                    activeTheme = sec.getAttribute("data-section-theme") || "dark";
                    break;
                }
            }
            header.setAttribute("data-theme", activeTheme);
        }

        // Hero cinema backdrop parallax & parting letterbox bars
        if (!prefersReducedMotion && y < vh * 1.2) {
            const heroP = Math.min(1, y / vh);
            if (heroBg) heroBg.style.transform = `translate3d(0, ${(y * 0.18).toFixed(1)}px, 0) scale(${(1 + heroP * 0.07).toFixed(4)})`;
            if (lbTop) lbTop.style.transform = `translate3d(0, ${(-heroP * 26).toFixed(1)}px, 0)`;
            if (lbBot) lbBot.style.transform = `translate3d(0, ${(heroP * 26).toFixed(1)}px, 0)`;
        }

        // Pinned Horizontal 35mm Film-Strip Roll (Desktop > 1060px)
        if (reelSec && reelTrack && !prefersReducedMotion && window.innerWidth > 1060) {
            const r = reelSec.getBoundingClientRect();
            const scrollable = Math.max(1, reelSec.offsetHeight - vh);
            const p = Math.min(1, Math.max(0, -r.top / scrollable));
            const maxShift = Math.max(0, reelTrack.scrollWidth - (window.innerWidth - 64));

            // Respect RTL vs LTR horizontal scroll direction!
            const isRtl = document.documentElement.dir === "rtl";
            const shiftX = (isRtl ? 1 : -1) * (p * maxShift);

            // Subtle cinema velocity skew
            const vel = Math.max(-18, Math.min(18, (y - lastScrollY) * 0.14));
            currentSkew += (vel - currentSkew) * 0.18;

            reelTrack.style.transform = `translate3d(${shiftX.toFixed(1)}px, 0, 0) skewX(${(currentSkew * (isRtl ? -0.25 : 0.25)).toFixed(2)}deg)`;

            if (reelCounter) {
                const frameIdx = Math.min(4, Math.max(1, Math.floor(p * 3.99) + 1));
                reelCounter.textContent = `0${frameIdx} / 04`;
            }
        }

        // Safety sweep for visible reveals
        if (!prefersReducedMotion) {
            const trig = vh * 0.90;
            reveals.forEach((el) => {
                if (!el.classList.contains("is-visible")) {
                    const r = el.getBoundingClientRect();
                    if (r.top <= trig && r.bottom > 0) el.classList.add("is-visible");
                }
            });
        }

        lastScrollY = y;
    };

    const requestSync = () => { if (!rafId) rafId = requestAnimationFrame(syncScroll); };
    window.addEventListener("scroll", requestSync, { passive: true });
    window.addEventListener("resize", requestSync, { passive: true });
    syncScroll();

    // ═══════════════════════════════════════════════════════════════════════
    // 6. MICHAEL BAY GIANT BRACKETED [ ] DIRECTOR'S REEL INTERACTION
    // ═══════════════════════════════════════════════════════════════════════
    const SCENES = {
        broadcast: {
            code: "SCENE 01 // 4K BROADCAST MASTER",
            label: "DELIVERABLES // SCENE 01",
            pills: ["TV Programs", "Documentaries", "Digital Series", "Editorial Scripts"],
            ar: "نبتكر وننتج برامج تلفزيونية ووثائقية وسلاسل رقمية متكاملة بفرق تحرير وإخراج متخصصة تخاطب الجمهور السعودي والخليجي بجودة بث عالمية.",
            en: "Flagship television programs, documentaries, and digital original series produced end-to-end at international broadcast standards."
        },
        cinema: {
            code: "SCENE 02 // ARRI & DOLBY CINEMA",
            label: "DELIVERABLES // SCENE 02",
            pills: ["Brand Films", "Commercials", "DaVinci Color", "Sound Mastering"],
            ar: "إخراج سينمائي وإضاءة وتصوير ميداني واستوديو وتلوين سينمائي وهندسة صوت تحوّل كل فيلم إلى تجربة بصرية فائقة الهيبة.",
            en: "High-craft brand films, commercial cinematography, theatrical color grading, and immersive studio sound mastering."
        },
        aivideo: {
            code: "SCENE 03 // AI DIRECTORIAL LAB",
            label: "DELIVERABLES // SCENE 03",
            pills: ["Generative Films", "AI Ads", "Virtual Worlds", "Hybrid VFX"],
            ar: "نختصر الزمن ونفتح عوالم بصرية غير مسبوقة عبر توليد الفيديوهات بالذكاء الاصطناعي تحت إشراف مخرجين محترفين بهوية علامتك.",
            en: "Director-led generative AI brand films, conceptual worlds, and hybrid VFX workflows delivering bold visuals at 5× speed."
        },
        pr: {
            code: "SCENE 04 // STRATEGIC PR & EVENTS",
            label: "DELIVERABLES // SCENE 04",
            pills: ["PR Architecture", "Crisis Comms", "Flagship Events", "Media Positioning"],
            ar: "استراتيجيات اتصال مؤسسي طويلة المدى، تغطية الفعاليات والمؤتمرات الكبرى، وإدارة السمعة والأزمات بأساليب رقمية حديثة.",
            en: "Long-term corporate communications, flagship conference coverage, executive positioning, and modern crisis governance."
        },
        marketing: {
            code: "SCENE 05 // FULL-FUNNEL DIGITAL REACH",
            label: "DELIVERABLES // SCENE 05",
            pills: ["Campaign Strategy", "Social Systems", "Paid Media", "EXOX Synergy"],
            ar: "من البحث وبناء السردية إلى إدارة الحملات الرقمية عبر المنصات بالتكامل مع منظومات 99 الذكية لتحقيق وصول ونتائج قابلة للقياس.",
            en: "Research-led digital storytelling and omnichannel campaigns integrated with 99 Tech & EXOX for live performance intelligence."
        }
    };

    let activeScene = "broadcast";
    const dirRows = document.querySelectorAll(".dir-row");
    const dirBgs = document.querySelectorAll(".dir-bg");

    const selectScene = (key) => {
        const sc = SCENES[key];
        if (!sc) return;
        activeScene = key;
        const lang = window.currentLang === "en" ? "en" : "ar";

        dirRows.forEach((btn) => {
            const on = btn.getAttribute("data-scene") === key;
            btn.classList.toggle("is-active", on);
            btn.setAttribute("aria-selected", String(on));
        });
        dirBgs.forEach((img) => {
            img.classList.toggle("is-active", img.getAttribute("data-bg") === key);
        });

        const codeEl = document.getElementById("dir-scene-code");
        const lblEl = document.getElementById("brief-label");
        const descEl = document.getElementById("brief-desc");
        const pillsEl = document.getElementById("brief-pills");

        if (codeEl) codeEl.textContent = sc.code;
        if (lblEl) lblEl.textContent = sc.label;
        if (descEl) descEl.textContent = sc[lang];
        if (pillsEl) {
            pillsEl.innerHTML = "";
            sc.pills.forEach((p) => {
                const s = document.createElement("span");
                s.className = "brief-pill";
                s.textContent = p;
                pillsEl.appendChild(s);
            });
        }
    };

    dirRows.forEach((btn) => {
        const k = btn.getAttribute("data-scene");
        btn.addEventListener("click", () => selectScene(k));
        if (isFinePointer) btn.addEventListener("pointerenter", () => selectScene(k));
    });

    document.addEventListener("media:langchange", () => selectScene(activeScene));
    selectScene(activeScene);

    // ═══════════════════════════════════════════════════════════════════════
    // 7. NAV, LANG TOGGLE, MOBILE DRAWER, REVEALS & WEB3FORMS
    // ═══════════════════════════════════════════════════════════════════════
    const langBtn = document.getElementById("lang-toggle");
    if (langBtn) {
        langBtn.addEventListener("click", () => {
            switchLang(window.currentLang === "ar" ? "en" : "ar");
            requestSync();
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
        mobileDrawer.querySelectorAll("a").forEach((a) => a.addEventListener("click", closeMenu));
        document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeMenu(); });
    }

    if (!prefersReducedMotion && "IntersectionObserver" in window) {
        const obs = new IntersectionObserver((entries, io) => {
            entries.forEach((e) => {
                if (e.isIntersecting) {
                    e.target.classList.add("is-visible");
                    io.unobserve(e.target);
                }
            });
        }, { threshold: 0.04, rootMargin: "0px 0px -10% 0px" });
        reveals.forEach((el) => obs.observe(el));
    } else {
        reveals.forEach((el) => el.classList.add("is-visible"));
    }

    const scopeChips = document.querySelectorAll(".scope-chip");
    const scopeInput = document.getElementById("media-scope-input");
    scopeChips.forEach((chip) => {
        chip.addEventListener("click", () => {
            scopeChips.forEach((c) => c.classList.remove("is-selected"));
            chip.classList.add("is-selected");
            if (scopeInput) scopeInput.value = chip.getAttribute("data-scope") || "Broadcast & Cinema Production";
        });
    });

    const mediaForm = document.getElementById("media-form");
    if (mediaForm) {
        mediaForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const statusDiv = mediaForm.querySelector(".form-status");
            const submitBtn = mediaForm.querySelector("button[type='submit']");
            const nameInput = mediaForm.querySelector("#media-name");
            const emailInput = mediaForm.querySelector("#media-email");
            const messageInput = mediaForm.querySelector("#media-message");
            const botcheck = mediaForm.querySelector('input[name="botcheck"]');
            if (botcheck && botcheck.checked) return;

            const isEn = document.documentElement.lang === "en";
            const setStatus = (type, msg) => {
                if (!statusDiv) return;
                statusDiv.className = `form-status ${type === "ok" ? "is-success" : "is-error"}`;
                statusDiv.textContent = msg;
            };

            if (!nameInput.value.trim() || !emailInput.value.trim() || !messageInput.value.trim()) {
                setStatus("err", isEn ? "Please complete all required fields." : "يرجى تعبئة جميع الحقول المطلوبة.");
                return;
            }
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInput.value.trim())) {
                setStatus("err", isEn ? "Please enter a valid work email address." : "يرجى إدخال بريد إلكتروني صحيح.");
                return;
            }

            const orig = submitBtn ? submitBtn.textContent : "";
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = isEn ? "Sending brief..." : "جاري إرسال الطلب...";
            }
            if (statusDiv) statusDiv.className = "form-status";

            try {
                const res = await fetch("https://api.web3forms.com/submit", {
                    method: "POST",
                    headers: { "Content-Type": "application/json", Accept: "application/json" },
                    body: JSON.stringify(Object.fromEntries(new FormData(mediaForm)))
                });
                const result = await res.json();
                if (res.status === 200 && result.success) {
                    mediaForm.reset();
                    setStatus(
                        "ok",
                        isEn
                            ? "Your production brief has been received. Our Jeddah studio team will respond shortly."
                            : "تم استلام طلب الإنتاج بنجاح. سيتواصل معك فريق الاستوديو والإخراج في جدة قريباً."
                    );
                } else {
                    throw new Error(result.message || "Submission failed");
                }
            } catch (_) {
                setStatus(
                    "err",
                    isEn
                        ? "Unable to send right now. Contact Info@i99.sa or WhatsApp +966 56 611 1617."
                        : "تعذّر الإرسال حالياً. راسلنا مباشرة على Info@i99.sa أو واتساب +966 56 611 1617."
                );
            } finally {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = orig;
                }
            }
        });
    }
});
