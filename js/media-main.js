document.addEventListener("DOMContentLoaded", () => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const isFinePointer = window.matchMedia("(pointer: fine)").matches;

    // ═══════════════════════════════════════════════════════════════════════
    // 1. SUBTLE WEBGL ANAMORPHIC CINEMA LIGHT VEIL (#cinema-veil-shader)
    //    Royal Indigo (#33075F) + Warm Champagne Tungsten projector rays
    //    blending delicately over the real soundstage hero photograph.
    // ═══════════════════════════════════════════════════════════════════════
    const initCinemaVeil = () => {
        const canvas = document.getElementById("cinema-veil-shader");
        if (!canvas) return;
        const gl = canvas.getContext("webgl", { alpha: false, antialias: false, powerPreference: "high-performance" });
        if (!gl) return;

        const vsSrc = `attribute vec2 a_pos; void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }`;
        const fsSrc = `
            precision highp float;
            uniform vec2 u_res;
            uniform float u_time;
            uniform vec2 u_mouse;

            void main() {
                vec2 uv = gl_FragCoord.xy / u_res;
                float aspect = u_res.x / max(u_res.y, 1.0);
                vec2 p = (uv - 0.5) * vec2(aspect, 1.0);
                vec2 m = (u_mouse - 0.5) * vec2(aspect, 1.0);
                float t = u_time * 0.22;

                // Soft anamorphic horizontal lens flare + royal projection beams
                float beam1 = exp(-pow((p.y + 0.12 - sin(p.x * 1.4 + t) * 0.12) * 3.8, 2.0));
                float beam2 = exp(-pow((p.x * 0.65 - p.y * 0.85 - 0.2 + cos(t * 0.7) * 0.14) * 2.6, 2.0));
                float ptrGlow = exp(-length(p - m) * 2.8);

                vec3 col = vec3(0.0);
                col += vec3(0.24, 0.05, 0.46) * beam2 * 0.72;      // 99 Royal Indigo beam
                col += vec3(0.875, 0.769, 0.573) * beam1 * 0.18;   // Warm Champagne anamorphic flare
                col += vec3(0.875, 0.769, 0.573) * ptrGlow * 0.16; // Pointer projection bloom

                gl_FragColor = vec4(col, 1.0);
            }
        `;

        const compile = (type, src) => {
            const s = gl.createShader(type);
            gl.shaderSource(s, src);
            gl.compileShader(s);
            return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null;
        };

        const vs = compile(gl.VERTEX_SHADER, vsSrc);
        const fs = compile(gl.FRAGMENT_SHADER, fsSrc);
        if (!vs || !fs) return;

        const prog = gl.createProgram();
        gl.attachShader(prog, vs);
        gl.attachShader(prog, fs);
        gl.linkProgram(prog);
        if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
        gl.useProgram(prog);

        const buf = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buf);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
        const loc = gl.getAttribLocation(prog, "a_pos");
        gl.enableVertexAttribArray(loc);
        gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

        const uRes = gl.getUniformLocation(prog, "u_res");
        const uTime = gl.getUniformLocation(prog, "u_time");
        const uMouse = gl.getUniformLocation(prog, "u_mouse");

        let tx = 0.36, ty = 0.54, cx = 0.36, cy = 0.54;
        let visible = true;
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

        const hero = document.getElementById("media-hero");
        if (hero && "IntersectionObserver" in window) {
            new IntersectionObserver((entries) => { visible = entries[0].isIntersecting; }, { threshold: 0.01 }).observe(hero);
        }

        const frame = (now) => {
            if (visible) {
                cx += (tx - cx) * 0.04;
                cy += (ty - cy) * 0.04;
                gl.uniform2f(uRes, canvas.width, canvas.height);
                gl.uniform1f(uTime, prefersReducedMotion ? 1.5 : (now - t0) * 0.001);
                gl.uniform2f(uMouse, cx, cy);
                gl.drawArrays(gl.TRIANGLES, 0, 6);
            }
            if (!prefersReducedMotion) requestAnimationFrame(frame);
        };
        requestAnimationFrame(frame);
    };
    initCinemaVeil();

    // ═══════════════════════════════════════════════════════════════════════
    // 2. SINGLE-RAF SCROLL ENGINE: PROGRESS BAR, PARALLAX, TIMECODE & PIPELINE
    // ═══════════════════════════════════════════════════════════════════════
    const progressBar = document.getElementById("scroll-progress-bar");
    const heroBg = document.getElementById("hero-stage-bg");
    const pipelineSec = document.getElementById("media-pipeline");
    const pipelineFill = document.getElementById("pipeline-fill");
    const timecodeEl = document.getElementById("live-timecode");
    const parallaxNodes = !prefersReducedMotion && window.innerWidth > 900
        ? Array.from(document.querySelectorAll("[data-parallax]"))
        : [];
    const reveals = Array.from(document.querySelectorAll(".reveal"));
    const sectionBlocks = Array.from(document.querySelectorAll(".section-block"));

    let scrollRaf = null;
    const syncScroll = () => {
        scrollRaf = null;
        const y = window.scrollY;
        const vh = window.innerHeight || 900;
        const maxScroll = Math.max(1, document.documentElement.scrollHeight - vh);
        const ratio = Math.min(1, Math.max(0, y / maxScroll));

        if (progressBar) progressBar.style.transform = `scaleX(${ratio.toFixed(4)})`;

        if (!prefersReducedMotion && y < vh * 1.25) {
            if (heroBg) {
                heroBg.style.transform = `translate3d(0, ${(y * 0.16).toFixed(1)}px, 0) scale(${(1 + ratio * 0.08).toFixed(4)})`;
            }
            parallaxNodes.forEach((el) => {
                const f = parseFloat(el.getAttribute("data-parallax") || "0");
                el.style.transform = `translate3d(0, ${(y * f).toFixed(1)}px, 0)`;
            });
        }

        if (pipelineSec && pipelineFill) {
            const r = pipelineSec.getBoundingClientRect();
            const p = Math.min(1, Math.max(0, (vh * 0.84 - r.top) / (vh * 0.58)));
            pipelineFill.style.transform = `scaleX(${p.toFixed(3)})`;
        }

        // Safety sweep: ensure elements well inside viewport always reveal
        if (!prefersReducedMotion) {
            const triggerLine = vh * 0.89;
            reveals.forEach((el) => {
                if (!el.classList.contains("is-visible")) {
                    const r = el.getBoundingClientRect();
                    if (r.top <= triggerLine && r.bottom > 0) el.classList.add("is-visible");
                }
            });
            sectionBlocks.forEach((sec) => {
                if (!sec.classList.contains("is-entered")) {
                    const r = sec.getBoundingClientRect();
                    if (r.top <= vh * 0.88) sec.classList.add("is-entered");
                }
            });
        }

        updateManifesto();
    };

    const requestSync = () => { if (!scrollRaf) scrollRaf = requestAnimationFrame(syncScroll); };
    window.addEventListener("scroll", requestSync, { passive: true });

    // Pointer Depth Stages + Specular Cards
    if (isFinePointer && !prefersReducedMotion) {
        document.querySelectorAll("[data-depth-stage]").forEach((stage) => {
            const layer = stage.querySelector("[data-depth-layer]");
            if (!layer) return;
            stage.addEventListener("pointermove", (e) => {
                const r = stage.getBoundingClientRect();
                const nx = (e.clientX - r.left) / r.width - 0.5;
                const ny = (e.clientY - r.top) / r.height - 0.5;
                layer.style.transform = `translate3d(${(nx * 10).toFixed(1)}px, ${(ny * 8).toFixed(1)}px, 0) scale(1.03)`;
            }, { passive: true });
            stage.addEventListener("pointerleave", () => {
                layer.style.transform = "translate3d(0, 0, 0) scale(1)";
            });
        });

        document.querySelectorAll(".specular-card").forEach((card) => {
            card.addEventListener("pointermove", (e) => {
                const r = card.getBoundingClientRect();
                card.style.setProperty("--mx", `${e.clientX - r.left}px`);
                card.style.setProperty("--my", `${e.clientY - r.top}px`);
            }, { passive: true });
        });
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 3. SCROLL-SCRUBBED CINEMA MANIFESTO + LIVE 24FPS SMPTE TIMECODE
    // ═══════════════════════════════════════════════════════════════════════
    const MANIFESTO_COPY = {
        ar: [
            { text: "منذ", accent: false },
            { text: "2014 في جدة", accent: true },
            { text: "— نحوّل الفكرة إلى", accent: false },
            { text: "مشهد تلفزيوني وسينمائي ورقمي", accent: true },
            { text: "يفرض حضوره؛ حيث يلتقي الابتكار الخارج عن المألوف، والمهنية الجادة، وجودة التنفيذ التي لا تساوم.", accent: false }
        ],
        en: [
            { text: "Since", accent: false },
            { text: "2014 in Jeddah", accent: true },
            { text: "— we transform ideas into", accent: false },
            { text: "television, cinema, and digital stories", accent: true },
            { text: "that command attention — uniting bold originality, disciplined craft, and uncompromising execution.", accent: false }
        ]
    };

    const manifestoEl = document.getElementById("media-manifesto-text");
    const manifestoSec = document.getElementById("media-manifesto");
    let wordSpans = [];

    const buildManifesto = () => {
        if (!manifestoEl) return;
        const lang = window.currentLang === "en" ? "en" : "ar";
        const segs = MANIFESTO_COPY[lang];
        manifestoEl.innerHTML = "";
        wordSpans = [];
        segs.forEach((seg, sIdx) => {
            const words = seg.text.split(" ");
            words.forEach((w, wIdx) => {
                const span = document.createElement("span");
                span.className = "m-word" + (seg.accent ? " is-accent" : "");
                span.textContent = w;
                manifestoEl.appendChild(span);
                wordSpans.push(span);
                if (wIdx < words.length - 1 || sIdx < segs.length - 1) {
                    manifestoEl.appendChild(document.createTextNode(" "));
                }
            });
        });
        updateManifesto();
    };

    function updateManifesto() {
        if (!manifestoSec || wordSpans.length === 0) return;
        if (prefersReducedMotion) {
            wordSpans.forEach((s) => s.classList.add("is-lit"));
            return;
        }
        const rect = manifestoSec.getBoundingClientRect();
        const vh = window.innerHeight || 900;
        const start = vh * 0.85;
        const end = vh * 0.22;
        const p = Math.min(1, Math.max(0, (start - rect.top) / (start - end + rect.height * 0.35)));
        const litCount = Math.ceil(p * wordSpans.length);
        wordSpans.forEach((s, i) => s.classList.toggle("is-lit", i < litCount));

        // Update 24fps SMPTE Timecode smoothly (00:00:01:00 -> 00:00:24:00)
        if (timecodeEl) {
            const totalFrames = Math.floor(24 + p * (23 * 24));
            const secs = String(Math.floor(totalFrames / 24)).padStart(2, "0");
            const frms = String(totalFrames % 24).padStart(2, "0");
            timecodeEl.textContent = `00:00:${secs}:${frms}`;
        }
    }

    buildManifesto();
    syncScroll();

    // ═══════════════════════════════════════════════════════════════════════
    // 4. INTERACTIVE DIRECTOR'S STUDIO SHOWCASE (5 PRODUCTION TRACKS)
    // ═══════════════════════════════════════════════════════════════════════
    const STUDIO_DATA = {
        broadcast: {
            code: "SCENE 01 // BROADCAST & CONTENT",
            img: "../img/studio-2.webp",
            hudL: "4K BROADCAST MASTER",
            hudR: "24 FPS · JEDDAH STAGE",
            specs: [
                { k: "FORMAT", ok: "4K / HD", v: "TV & Digital Series" },
                { k: "CRAFT", ok: "IN-HOUSE", v: "Script to Master" },
                { k: "REACH", ok: "KSA & GCC", v: "Broadcast Ready" }
            ],
            formats: ["TV Programs", "Documentaries", "Digital Originals", "Editorial Scripts", "Multi-Cam Studio"],
            ar: {
                tag: "إنتاج تلفزيوني ورقمي",
                title: "الإنتاج التلفزيوني وصناعة المحتوى",
                desc: "نبتكر وننتج برامج تلفزيونية ومحتوى رقمياً متكاملاً بفرق تحرير وإخراج متخصصة تخاطب الجمهور السعودي والخليجي بوعي عميق وجودة بث عالمية.",
                list: [
                    "إنتاج البرامج التلفزيونية والوثائقية والسلاسل الرقمية من الفكرة للبث",
                    "إعداد المحتوى التحريري والسيناريوهات بما يلائم هوية القناة والجمهور",
                    "استهداف دقيق يجمع بين القيمة الفنية وتحقيق أعلى معدلات المشاهدة"
                ]
            },
            en: {
                tag: "Broadcast & Digital",
                title: "Broadcast & Content Production",
                desc: "We conceive and produce flagship television shows, documentaries, and digital series crafted for Saudi and regional audiences at international broadcast standards.",
                list: [
                    "End-to-end TV programs, documentaries, and digital original series",
                    "Editorial development and scriptwriting tailored to channel and audience",
                    "Precision production uniting artistic authority with measurable viewership"
                ]
            }
        },
        cinema: {
            code: "SCENE 02 // CINEMA & AUDIO PRODUCTION",
            img: "../img/videographer.webp",
            hudL: "ARRI / RED WORKFLOW",
            hudR: "RAW COLOR & DOLBY MIX",
            specs: [
                { k: "CAMERA", ok: "4K RAW", v: "Cinema Optics" },
                { k: "POST", ok: "GRADED", v: "DaVinci Color" },
                { k: "AUDIO", ok: "MASTER", v: "Studio Sound Mix" }
            ],
            formats: ["Commercial Films", "Brand Documentaries", "Color Grading", "Sound Design", "Event Films"],
            ar: {
                tag: "إخراج وتصوير سينمائي",
                title: "الإنتاج المرئي والصوتي السينمائي",
                desc: "نصنع اللقطة التي تبدأ بها مصافحة العين الأولى — إخراج سينمائي، إضاءة مدروسة، تلوين احترافي، وهندسة صوتية متكاملة تحوّل كل فيلم إلى تجربة بصرية لا تُنسى.",
                list: [
                    "أفلام العلامات التجارية والإعلانات السينمائية عالية التأثير",
                    "إدارة إضاءة وتصوير ميداني واستوديو بأحدث المعدات السينمائية",
                    "تلوين سينمائي وهندسة صوت ومكساج بمعايير دور العرض والبث"
                ]
            },
            en: {
                tag: "Cinema Craft",
                title: "Cinema & Audio Production",
                desc: "Every frame is engineered as a visual signature — combining cinema direction, sculpted lighting, film color grading, and immersive sound design.",
                list: [
                    "High-impact brand films, commercials, and institutional documentaries",
                    "Full cinema camera, lighting, and studio/location production crews",
                    "Theatrical color grading, sound design, and broadcast audio mastering"
                ]
            }
        },
        aivideo: {
            code: "SCENE 03 // AI CINEMA & GENERATIVE VIDEO",
            img: "../img/tv.webp",
            hudL: "AI DIRECTORIAL PIPELINE",
            hudR: "RAPID CONCEPT TO SCREEN",
            specs: [
                { k: "ENGINE", ok: "GEN-AI", v: "Directed Visuals" },
                { k: "SPEED", ok: "5× FASTER", v: "Concept to Cut" },
                { k: "CONTROL", ok: "BRAND-LOCK", v: "Art-Directed Look" }
            ],
            formats: ["AI Brand Films", "Generative Ads", "Virtual Worlds", "Concept Teasers", "Hybrid VFX"],
            ar: {
                tag: "جيل جديد من الإنتاج",
                title: "إنتاج فيديوهات الذكاء الاصطناعي",
                desc: "نختصر الزمن ونفتح آفاقاً بصرية مستحيلة بالتصوير التقليدي — نوظف أحدث تقنيات توليد الفيديو بالذكاء الاصطناعي تحت إشراف مخرجين محترفين لتقديم أفلام مبهرة بهوية علامتك.",
                list: [
                    "فيديوهات إعلانية وسينمائية مولّدة بالـ AI بإشراف فني وإخراجي كامل",
                    "عروض مستقبلية وعوالم افتراضية للمشاريع الكبرى قبل تنفيذها على الواقع",
                    "دمج هجين بين التصوير الحقيقي وتقنيات الذكاء الاصطناعي والمؤثرات"
                ]
            },
            en: {
                tag: "Next-Gen Film",
                title: "AI Video & Generative Cinema",
                desc: "We compress production timelines and unlock visual worlds impossible on traditional sets — combining cutting-edge generative video models with seasoned human film direction.",
                list: [
                    "Art-directed generative AI brand films and high-impact commercial spots",
                    "Futuristic architectural and product visualization before physical launch",
                    "Hybrid workflows blending live-action cinema with AI VFX"
                ]
            }
        },
        pr: {
            code: "SCENE 04 // CORPORATE PR & COMMUNICATIONS",
            img: "../img/studio-1.webp",
            hudL: "STRATEGIC COMMUNICATIONS",
            hudR: "REPUTATION & EVENTS",
            specs: [
                { k: "STRATEGY", ok: "LONG-TERM", v: "Media Positioning" },
                { k: "CRISIS", ok: "GOVERNED", v: "Rapid Response" },
                { k: "EVENTS", ok: "FLAGSHIP", v: "Press & Coverage" }
            ],
            formats: ["PR Strategy", "Crisis Comms", "Executive Media", "Event Coverage", "Reputation Ops"],
            ar: {
                tag: "اتصال مؤسسي رفيع",
                title: "الاتصال المؤسسي والعلاقات العامة",
                desc: "نبني استراتيجيات اتصال طويلة المدى تصنع مكانة راسخة للجهات والقيادات، مع تغطية شاملة للفعاليات الكبرى وإدارة احترافية للسمعة والأزمات بأساليب رقمية حديثة.",
                list: [
                    "صياغة استراتيجيات الاتصال المؤسسي وبناء الصورة الذهنية للقيادات والجهات",
                    "تخطيط وتغطية الفعاليات والمؤتمرات الكبرى بالتعاون مع الجهات الإعلامية",
                    "إدارة السمعة والأزمات الإعلامية مدعومة بتقنيات الرصد والتحليل الذكي"
                ]
            },
            en: {
                tag: "Strategic PR",
                title: "Corporate PR & Communications",
                desc: "Long-term communication strategies that anchor institutional prestige — spanning executive positioning, flagship event coverage, and modern reputation governance.",
                list: [
                    "Corporate communication architectures and executive media positioning",
                    "End-to-end press strategy and coverage for flagship conferences and events",
                    "Reputation management and crisis response backed by live media intelligence"
                ]
            }
        },
        marketing: {
            code: "SCENE 05 // DIGITAL GROWTH & CAMPAIGNS",
            img: "../img/studio-2.webp",
            hudL: "OMNICHANNEL REACH",
            hudR: "CONTENT × DATA × EXOX",
            specs: [
                { k: "INSIGHT", ok: "RESEARCHED", v: "Audience Strategy" },
                { k: "CHANNELS", ok: "FULL-FUNNEL", v: "Social & Paid" },
                { k: "SYNERGY", ok: "99 TECH", v: "EXOX Powered" }
            ],
            formats: ["Campaign Strategy", "Social Architecture", "Paid Media", "Brand Storytelling", "Analytics"],
            ar: {
                tag: "نمو وانتشار مدروس",
                title: "التسويق الرقمي وصناعة الانتشار",
                desc: "نبدأ بالبحث وتحديد الهدف، ثم نكتب القصة ونبني الحملات الرقمية عبر المنصات بأسلوب يجمع جودة الإبداع الإعلامي مع دقة الاستهداف وقياس العائد.",
                list: [
                    "بناء استراتيجيات المحتوى والحملات الرقمية المتكاملة عبر كافة المنصات",
                    "إدارة الهوية الرقمية وإنتاج حملات إطلاق موسمية ووطنية مؤثرة",
                    "تكامل مباشر مع تقنيات 99 الذكية لتحليل المنافسين وقياس الأداء لحظياً"
                ]
            },
            en: {
                tag: "Digital Growth",
                title: "Digital Marketing & Reach",
                desc: "Rooted in research and clear commercial goals — uniting high-craft storytelling with precision omnichannel campaigns and real-time performance intelligence.",
                list: [
                    "Integrated digital campaign architectures and monthly content systems",
                    "High-impact product launches and seasonal brand narratives across platforms",
                    "Seamless synergy with 99 Tech & EXOX for live analytics and optimization"
                ]
            }
        }
    };

    let activeTrack = "broadcast";
    const slateItems = document.querySelectorAll(".slate-item");

    const renderTrack = (key) => {
        const tr = STUDIO_DATA[key];
        if (!tr) return;
        activeTrack = key;
        const lang = window.currentLang === "en" ? "en" : "ar";
        const copy = tr[lang];

        const setEl = (id, text) => {
            const el = document.getElementById(id);
            if (el) el.textContent = text;
        };

        setEl("st-code", tr.code);
        setEl("st-tag", copy.tag);
        setEl("st-hud-left", tr.hudL);
        setEl("st-hud-right", tr.hudR);
        setEl("st-title", copy.title);
        setEl("st-desc", copy.desc);

        const imgEl = document.getElementById("st-img");
        if (imgEl) {
            imgEl.src = tr.img;
            imgEl.alt = copy.title;
            imgEl.classList.remove("vp-swap-in");
            void imgEl.offsetWidth;
            imgEl.classList.add("vp-swap-in");
        }

        const contentEl = document.getElementById("st-content");
        if (contentEl) {
            contentEl.classList.remove("vp-swap-in");
            void contentEl.offsetWidth;
            contentEl.classList.add("vp-swap-in");
        }

        const specsEl = document.getElementById("st-specs");
        if (specsEl) {
            specsEl.innerHTML = "";
            tr.specs.forEach((sp) => {
                const box = document.createElement("div");
                box.className = "spec-step";
                box.innerHTML = `<div class="spec-meta"><span>${sp.k}</span><span class="spec-ok">${sp.ok}</span></div><div class="spec-label">${sp.v}</div>`;
                specsEl.appendChild(box);
            });
        }

        const listEl = document.getElementById("st-list");
        if (listEl) {
            listEl.innerHTML = "";
            copy.list.forEach((item) => {
                const li = document.createElement("li");
                li.textContent = item;
                listEl.appendChild(li);
            });
        }

        const fmtEl = document.getElementById("st-formats");
        if (fmtEl) {
            fmtEl.innerHTML = "";
            tr.formats.forEach((f) => {
                const chip = document.createElement("span");
                chip.className = "vp-stack-chip";
                chip.textContent = f;
                fmtEl.appendChild(chip);
            });
        }

        slateItems.forEach((btn) => {
            const sel = btn.getAttribute("data-track") === key;
            btn.classList.toggle("is-active", sel);
            btn.setAttribute("aria-selected", String(sel));
        });
    };

    slateItems.forEach((btn) => {
        btn.addEventListener("click", () => {
            const k = btn.getAttribute("data-track");
            if (k) renderTrack(k);
        });
    });

    document.addEventListener("media:langchange", () => {
        buildManifesto();
        renderTrack(activeTrack);
    });
    renderTrack(activeTrack);

    // ═══════════════════════════════════════════════════════════════════════
    // 5. NAVIGATION, LANG TOGGLE, MOBILE DRAWER & VISIBLE REVEALS
    // ═══════════════════════════════════════════════════════════════════════
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
        mobileDrawer.querySelectorAll("a").forEach((a) => a.addEventListener("click", closeMenu));
        document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeMenu(); });
    }

    const header = document.getElementById("site-header");
    const onScrollHeader = () => { if (header) header.classList.toggle("is-scrolled", window.scrollY > 20); };
    window.addEventListener("scroll", onScrollHeader, { passive: true });
    onScrollHeader();

    const navLinks = document.querySelectorAll(".nav-links a[href^='#']");
    if ("IntersectionObserver" in window && navLinks.length > 0) {
        const navObs = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    const id = entry.target.id;
                    navLinks.forEach((a) => a.classList.toggle("is-active", a.getAttribute("href") === `#${id}`));
                }
            });
        }, { rootMargin: "-38% 0px -52% 0px" });
        ["media-partners", "media-studio", "media-pipeline", "media-synergy", "media-contact"].forEach((id) => {
            const sec = document.getElementById(id);
            if (sec) navObs.observe(sec);
        });
    }

    requestAnimationFrame(() => {
        document.querySelectorAll("[data-enter]").forEach((el) => el.classList.add("is-visible"));
    });

    if (!prefersReducedMotion && "IntersectionObserver" in window) {
        const revObs = new IntersectionObserver((entries, obs) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add("is-visible");
                    obs.unobserve(entry.target);
                }
            });
        }, { threshold: 0.02, rootMargin: "0px 0px -11% 0px" });
        reveals.forEach((el) => revObs.observe(el));

        const secObs = new IntersectionObserver((entries, obs) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add("is-entered");
                    obs.unobserve(entry.target);
                }
            });
        }, { threshold: 0.01, rootMargin: "0px 0px -10% 0px" });
        sectionBlocks.forEach((sec) => secObs.observe(sec));
    } else {
        reveals.forEach((el) => el.classList.add("is-visible"));
        sectionBlocks.forEach((sec) => sec.classList.add("is-entered"));
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 6. PRODUCTION SCOPE CHIPS + WEB3FORMS ASYNC SUBMISSION
    // ═══════════════════════════════════════════════════════════════════════
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

            const origText = submitBtn ? submitBtn.textContent : "";
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
                        ? "Unable to send right now. Please contact Info@i99.sa or WhatsApp +966 56 611 1617."
                        : "تعذّر الإرسال حالياً. يرجى مراسلتنا مباشرة على Info@i99.sa أو واتساب +966 56 611 1617."
                );
            } finally {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = origText;
                }
            }
        });
    }
});
