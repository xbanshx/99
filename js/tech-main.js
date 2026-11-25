document.addEventListener("DOMContentLoaded", () => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const isFinePointer = window.matchMedia("(pointer: fine)").matches;

    // ═══════════════════════════════════════════════════════════════════════
    // 1. BESPOKE GPU GLSL SHADER: 99 LIQUID OBSIDIAN SILK & CYAN CAUSTICS
    //    Uses 99's true palette (#09040B obsidian, #33075F deep plum, #00FCC3 sheen)
    //    Auto-pauses when hero is out of viewport to keep CPU/GPU ice-cold.
    // ═══════════════════════════════════════════════════════════════════════
    const initSilkShader = () => {
        const canvas = document.getElementById("silk-shader");
        if (!canvas) return;
        const gl = canvas.getContext("webgl", { alpha: false, antialias: false, powerPreference: "high-performance" });
        if (!gl) return;

        const vsSource = `
            attribute vec2 a_pos;
            void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }
        `;

        const fsSource = `
            precision highp float;
            uniform vec2 u_res;
            uniform float u_time;
            uniform vec2 u_mouse;

            float hash(vec2 p) {
                return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
            }

            float noise(vec2 p) {
                vec2 i = floor(p);
                vec2 f = fract(p);
                vec2 u = f * f * (3.0 - 2.0 * f);
                return mix(
                    mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
                    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
                    u.y
                );
            }

            void main() {
                vec2 uv = gl_FragCoord.xy / u_res;
                float aspect = u_res.x / max(u_res.y, 1.0);
                vec2 p = (uv - 0.5) * vec2(aspect, 1.0);
                vec2 m = (u_mouse - 0.5) * vec2(aspect, 1.0);

                float t = u_time * 0.22;

                // Subtle fluid warp toward pointer
                vec2 dMouse = p - m;
                float mDist = length(dMouse);
                p -= dMouse * exp(-mDist * 2.4) * 0.09;

                // Rotated anisotropic silk fold coordinates
                float ca = cos(0.46), sa = sin(0.46);
                vec2 r = mat2(ca, -sa, sa, ca) * p;

                float n1 = noise(vec2(r.x * 1.6 + t * 0.7, r.y * 0.9 - t * 0.4));
                float n2 = noise(vec2(r.x * 2.8 - t * 0.5, r.y * 1.5 + t * 0.6));

                float fold1 = sin(r.x * 5.2 + n1 * 2.4 + t * 1.1);
                float fold2 = sin(r.x * 9.4 - n2 * 2.1 - t * 0.75) * 0.42;
                float fold3 = sin(r.y * 3.1 + n1 * 1.8) * 0.35;
                float h = fold1 + fold2 + fold3;

                // Anisotropic specular crest along silk folds
                float ridge = exp(-pow(h - 0.55, 2.0) * 6.5);
                float razor = exp(-pow(h - 0.92, 2.0) * 28.0);

                // 99 Official Palette: #09040B void, #33075F royal plum, #00FCC3 electric mint-cyan
                vec3 voidCol = vec3(0.035, 0.016, 0.043);
                vec3 plumCol = vec3(0.18, 0.028, 0.34);
                vec3 cyanCol = vec3(0.0, 0.988, 0.765);

                float depthMix = smoothstep(-1.4, 1.2, h) * 0.55;
                vec3 col = mix(voidCol, plumCol, depthMix * 0.72);
                col += plumCol * ridge * 0.48;
                col += cyanCol * razor * 0.26;
                col += cyanCol * exp(-mDist * 3.2) * 0.09;

                // Fine anti-banding film grain
                float g = (hash(gl_FragCoord.xy + fract(u_time) * 100.0) - 0.5) * 0.018;
                col = max(col + g, 0.0);

                gl_FragColor = vec4(col, 1.0);
            }
        `;

        const compile = (type, src) => {
            const s = gl.createShader(type);
            gl.shaderSource(s, src);
            gl.compileShader(s);
            return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null;
        };

        const vs = compile(gl.VERTEX_SHADER, vsSource);
        const fs = compile(gl.FRAGMENT_SHADER, fsSource);
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

        let targetX = 0.65, targetY = 0.52;
        let curX = 0.65, curY = 0.52;
        let heroVisible = true;
        let start = performance.now();

        const resize = () => {
            const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
            const rect = canvas.getBoundingClientRect();
            canvas.width = Math.max(1, Math.floor(rect.width * dpr));
            canvas.height = Math.max(1, Math.floor(rect.height * dpr));
            gl.viewport(0, 0, canvas.width, canvas.height);
        };
        resize();
        window.addEventListener("resize", resize, { passive: true });

        if (isFinePointer && !prefersReducedMotion) {
            window.addEventListener("pointermove", (e) => {
                targetX = e.clientX / Math.max(window.innerWidth, 1);
                targetY = 1.0 - e.clientY / Math.max(window.innerHeight, 1);
            }, { passive: true });
        }

        const heroEl = document.getElementById("tech-hero");
        if (heroEl && "IntersectionObserver" in window) {
            new IntersectionObserver((entries) => {
                heroVisible = entries[0].isIntersecting;
            }, { threshold: 0.01 }).observe(heroEl);
        }

        const render = (now) => {
            if (heroVisible) {
                curX += (targetX - curX) * 0.045;
                curY += (targetY - curY) * 0.045;
                gl.uniform2f(uRes, canvas.width, canvas.height);
                gl.uniform1f(uTime, prefersReducedMotion ? 2.4 : (now - start) * 0.001);
                gl.uniform2f(uMouse, curX, curY);
                gl.drawArrays(gl.TRIANGLES, 0, 6);
            }
            if (!prefersReducedMotion) requestAnimationFrame(render);
        };
        requestAnimationFrame(render);
    };
    initSilkShader();

    // Subtle 3D parallax sway on the sculptural 99 Emblem
    const emblemShell = document.getElementById("emblem-99-shell");
    const heroSection = document.getElementById("tech-hero");
    if (emblemShell && heroSection && isFinePointer && !prefersReducedMotion) {
        heroSection.addEventListener("pointermove", (e) => {
            const rect = heroSection.getBoundingClientRect();
            const nx = (e.clientX - rect.left) / rect.width - 0.5;
            const ny = (e.clientY - rect.top) / rect.height - 0.5;
            emblemShell.style.transform = `translate3d(${(nx * 18).toFixed(1)}px, ${(ny * 14).toFixed(1)}px, 0)`;
        }, { passive: true });
        heroSection.addEventListener("pointerleave", () => {
            emblemShell.style.transform = "translate3d(0, 0, 0)";
        });
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 2. SPECULAR POINTER-TRACKING BORDER LIGHT ON MONOLITH CARDS
    // ═══════════════════════════════════════════════════════════════════════
    if (isFinePointer) {
        document.querySelectorAll(".specular-card").forEach((card) => {
            card.addEventListener("pointermove", (e) => {
                const r = card.getBoundingClientRect();
                card.style.setProperty("--mx", `${e.clientX - r.left}px`);
                card.style.setProperty("--my", `${e.clientY - r.top}px`);
            }, { passive: true });
        });
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 3. SCROLL-SCRUBBED CINEMATIC MANIFESTO (WORD-BY-WORD ILLUMINATION)
    // ═══════════════════════════════════════════════════════════════════════
    const MANIFESTO_COPY = {
        ar: [
            { text: "البرمجيات العادية تُنفّذ الأوامر.", accent: false },
            { text: "في", accent: false },
            { text: "99 للتقنية", accent: true },
            { text: "نهندس", accent: false },
            { text: "أنظمة ذكية مستقلة", accent: true },
            { text: "— تجمع صلابة المعمارية السحابية، دقة الذكاء الاصطناعي، وهيبة الهوية التي لا تُنسى.", accent: false }
        ],
        en: [
            { text: "Ordinary software follows scripts.", accent: false },
            { text: "At", accent: false },
            { text: "99 Tech", accent: true },
            { text: "we engineer", accent: false },
            { text: "autonomous AI systems", accent: true },
            { text: "— uniting sovereign cloud architecture, precision intelligence, and unmistakable brand craft.", accent: false }
        ]
    };

    const manifestoEl = document.getElementById("manifesto-text");
    const manifestoSec = document.getElementById("manifesto");
    let wordSpans = [];

    const buildManifesto = () => {
        if (!manifestoEl) return;
        const lang = window.currentLang === "en" ? "en" : "ar";
        const segments = MANIFESTO_COPY[lang];
        manifestoEl.innerHTML = "";
        wordSpans = [];

        segments.forEach((seg, sIdx) => {
            const words = seg.text.split(" ");
            words.forEach((w, wIdx) => {
                const span = document.createElement("span");
                span.className = "m-word" + (seg.accent ? " is-accent" : "");
                span.textContent = w;
                manifestoEl.appendChild(span);
                wordSpans.push(span);
                if (wIdx < words.length - 1 || sIdx < segments.length - 1) {
                    manifestoEl.appendChild(document.createTextNode(" "));
                }
            });
        });
        updateManifestoScroll();
    };

    const updateManifestoScroll = () => {
        if (!manifestoSec || wordSpans.length === 0) return;
        if (prefersReducedMotion) {
            wordSpans.forEach((s) => s.classList.add("is-lit"));
            return;
        }
        const rect = manifestoSec.getBoundingClientRect();
        const vh = window.innerHeight || 900;
        const start = vh * 0.85;
        const end = vh * 0.22;
        const progress = Math.min(1, Math.max(0, (start - rect.top) / (start - end + rect.height * 0.35)));
        const litCount = Math.ceil(progress * wordSpans.length);
        wordSpans.forEach((s, i) => s.classList.toggle("is-lit", i < litCount));
    };

    window.addEventListener("scroll", updateManifestoScroll, { passive: true });
    buildManifesto();

    // ═══════════════════════════════════════════════════════════════════════
    // 4. INTERACTIVE CAPABILITIES ARCHITECTURE EXPLORER (5 BESPOKE DIAGRAMS)
    // ═══════════════════════════════════════════════════════════════════════
    const CAP_DATA = {
        ai: {
            code: "01 // AI SYSTEMS ARCHITECTURE",
            stack: ["Multi-Agent Core", "Arabic RAG", "LLM Guardrails", "Structured Memory", "Tool Execution"],
            diagram: `
                <svg viewBox="0 0 540 148" fill="none">
                    <path d="M96 74 H202" stroke="rgba(255,255,255,0.16)" stroke-width="1.2"/>
                    <path d="M338 74 H444" stroke="rgba(255,255,255,0.16)" stroke-width="1.2"/>
                    <path d="M270 30 V118" stroke="rgba(255,255,255,0.12)" stroke-width="1" stroke-dasharray="3 4"/>
                    <path class="vp-pulse" d="M96 74 H202"/>
                    <path class="vp-pulse" d="M338 74 H444"/>
                    <rect x="14" y="48" width="82" height="52" rx="10" fill="#120918" stroke="rgba(255,255,255,0.16)"/>
                    <text x="55" y="70" text-anchor="middle" fill="#7A7088" font-family="IBM Plex Mono" font-size="9">CONTEXT</text>
                    <text x="55" y="86" text-anchor="middle" fill="#F7F8FC" font-family="IBM Plex Sans" font-size="11">Brand Data</text>
                    <rect x="202" y="42" width="136" height="64" rx="12" fill="#170C20" stroke="#00FCC3" stroke-opacity="0.55"/>
                    <text x="270" y="68" text-anchor="middle" fill="#00FCC3" font-family="IBM Plex Mono" font-size="9">99 AI CORE</text>
                    <text x="270" y="88" text-anchor="middle" fill="#FFFFFF" font-family="IBM Plex Sans" font-size="12.5" font-weight="600">Agent Orchestrator</text>
                    <circle cx="270" cy="20" r="4" fill="#00FCC3"/>
                    <circle cx="270" cy="128" r="4" fill="#00FCC3"/>
                    <rect x="444" y="48" width="82" height="52" rx="10" fill="#120918" stroke="rgba(255,255,255,0.16)"/>
                    <text x="485" y="70" text-anchor="middle" fill="#7A7088" font-family="IBM Plex Mono" font-size="9">GOVERNED</text>
                    <text x="485" y="86" text-anchor="middle" fill="#F7F8FC" font-family="IBM Plex Sans" font-size="11">Execution</text>
                </svg>`,
            ar: {
                tag: "التخصص المحوري",
                title: "هندسة أنظمة ووكلاء الذكاء الاصطناعي",
                desc: "نصمم أنظمة ذكاء اصطناعي إنتاجية تتقن اللغة العربية وسياق الأعمال، وتعمل عبر وكلاء متعددي الخطوات محكومين ببوابات تحقق واعتماد دقيقة.",
                list: [
                    "وكلاء تنفيذ متعددو الخطوات مع بوابات موافقة المالك",
                    "أنظمة استرجاع معرفي (RAG) متقنة للعربية وبيانات المنشأة",
                    "دمج نماذج الذكاء الاصطناعي بأمان داخل الأنظمة المؤسسية القائمة"
                ]
            },
            en: {
                tag: "Core Practice",
                title: "AI Systems & Autonomous Agents",
                desc: "We engineer production AI systems fluent in Arabic and enterprise context — orchestrated through multi-step agents governed by explicit verification gates.",
                list: [
                    "Multi-step autonomous agents with human approval gates",
                    "Arabic-native RAG architectures grounded in your enterprise data",
                    "Secure AI orchestration integrated into existing operational stacks"
                ]
            }
        },
        software: {
            code: "02 // ENTERPRISE SOFTWARE & SAAS",
            stack: ["TypeScript", "Modular APIs", "Multi-Tenant SaaS", "ERP / CRM Sync", "RBAC Auth"],
            diagram: `
                <svg viewBox="0 0 540 148" fill="none">
                    <path d="M126 74 H210" stroke="rgba(255,255,255,0.16)" stroke-width="1.2"/>
                    <path d="M330 74 H414" stroke="rgba(255,255,255,0.16)" stroke-width="1.2"/>
                    <path class="vp-pulse" d="M126 74 H210"/>
                    <path class="vp-pulse" d="M330 74 H414"/>
                    <rect x="20" y="34" width="106" height="80" rx="10" fill="#120918" stroke="rgba(255,255,255,0.16)"/>
                    <text x="73" y="64" text-anchor="middle" fill="#00FCC3" font-family="IBM Plex Mono" font-size="9">GATEWAY</text>
                    <text x="73" y="84" text-anchor="middle" fill="#F7F8FC" font-family="IBM Plex Sans" font-size="11.5">REST / GraphQL</text>
                    <rect x="210" y="28" width="120" height="92" rx="12" fill="#170C20" stroke="#00FCC3" stroke-opacity="0.5"/>
                    <text x="270" y="56" text-anchor="middle" fill="#00FCC3" font-family="IBM Plex Mono" font-size="9">CORE ENGINE</text>
                    <text x="270" y="78" text-anchor="middle" fill="#FFFFFF" font-family="IBM Plex Sans" font-size="12" font-weight="600">Domain Services</text>
                    <text x="270" y="98" text-anchor="middle" fill="#B2A9BE" font-family="IBM Plex Mono" font-size="9">RBAC · AUDIT</text>
                    <rect x="414" y="34" width="106" height="80" rx="10" fill="#120918" stroke="rgba(255,255,255,0.16)"/>
                    <text x="467" y="64" text-anchor="middle" fill="#7A7088" font-family="IBM Plex Mono" font-size="9">PERSISTENCE</text>
                    <text x="467" y="84" text-anchor="middle" fill="#F7F8FC" font-family="IBM Plex Sans" font-size="11.5">Encrypted DB</text>
                </svg>`,
            ar: {
                tag: "معمارية صلبة",
                title: "هندسة البرمجيات ومنصات SaaS",
                desc: "تصميم وبناء منصات اشتراك سحابية وأنظمة تشغيل مؤسسية مخصصة، بمعمارية نظيفة تتكامل مع أنظمة المدفوعات و ERP و CRM بسلاسة.",
                list: [
                    "منصات SaaS متعددة المستأجرين بعزل كامل للبيانات",
                    "بناء واجهات برمجية (APIs) فائقة السرعة وموثّقة بالكامل",
                    "تكامل مباشر مع أنظمة الفوترة، المدفوعات، وإدارة العملاء"
                ]
            },
            en: {
                tag: "Modular Core",
                title: "Software Engineering & SaaS",
                desc: "Custom enterprise systems and multi-tenant SaaS products architected cleanly to integrate with payments, ERP, and CRM platforms.",
                list: [
                    "Multi-tenant SaaS architectures with strict tenant isolation",
                    "High-throughput, documented REST & GraphQL API layers",
                    "Seamless integrations across billing, ERP, and CRM ecosystems"
                ]
            }
        },
        interfaces: {
            code: "03 // INTERACTIVE WEB & MOBILE",
            stack: ["React / Next.js", "WebGL Shaders", "iOS & Android", "RTL/LTR Craft", "SEO & GEO"],
            diagram: `
                <svg viewBox="0 0 540 148" fill="none">
                    <rect x="52" y="22" width="286" height="104" rx="12" fill="#120918" stroke="rgba(255,255,255,0.18)"/>
                    <line x1="52" y1="44" x2="338" y2="44" stroke="rgba(255,255,255,0.1)"/>
                    <text x="195" y="36" text-anchor="middle" fill="#7A7088" font-family="IBM Plex Mono" font-size="9">DESKTOP · 60FPS WEB EXPERIENCE</text>
                    <rect x="72" y="58" width="130" height="12" rx="4" fill="#00FCC3" fill-opacity="0.22"/>
                    <rect x="72" y="78" width="246" height="32" rx="6" fill="#1A0F24" stroke="rgba(255,255,255,0.08)"/>
                    <path class="vp-pulse" d="M338 74 H396"/>
                    <rect x="396" y="18" width="90" height="112" rx="14" fill="#170C20" stroke="#00FCC3" stroke-opacity="0.5"/>
                    <rect x="427" y="26" width="28" height="4" rx="2" fill="rgba(255,255,255,0.2)"/>
                    <rect x="410" y="44" width="62" height="34" rx="6" fill="rgba(0,252,195,0.12)"/>
                    <rect x="410" y="88" width="62" height="26" rx="6" fill="rgba(255,255,255,0.06)"/>
                </svg>`,
            ar: {
                tag: "دقة وتجربة فاخرة",
                title: "المنصات التفاعلية وتطبيقات الجوال",
                desc: "مواقع رائدة وتطبيقات iOS و Android تُبنى بحرفية بصرية استثنائية، أداء فائق السرعة، وتجربة ثنائية اللغة (عربي/إنجليزي) متقنة.",
                list: [
                    "مواقع مؤسسية ومنصات ويب مهيأة للبحث (SEO) والذكاء (GEO)",
                    "تطبيقات iOS و Android متجاوبة بسلاسة 60 إطار/ثانية",
                    "أنظمة تصميم مخصصة تحفظ هيبة العلامة عبر كل شاشة"
                ]
            },
            en: {
                tag: "Flagship Craft",
                title: "Interactive Web & Mobile Apps",
                desc: "Flagship web platforms and native mobile applications crafted for 60fps fluidity, bilingual RTL/LTR perfection, and unmistakable brand presence.",
                list: [
                    "High-converting web platforms structured for SEO and GEO",
                    "Fluid iOS & Android applications built for real daily scale",
                    "Custom design systems preserving brand poise across viewports"
                ]
            }
        },
        data: {
            code: "04 // DATA & DECISION INTELLIGENCE",
            stack: ["Data Pipelines", "Executive BI", "Anomaly Detection", "Forecasting", "SQL / Warehouse"],
            diagram: `
                <svg viewBox="0 0 540 148" fill="none">
                    <line x1="40" y1="118" x2="500" y2="118" stroke="rgba(255,255,255,0.14)"/>
                    <line x1="40" y1="78" x2="500" y2="78" stroke="rgba(255,255,255,0.06)" stroke-dasharray="4 6"/>
                    <line x1="40" y1="38" x2="500" y2="38" stroke="rgba(255,255,255,0.06)" stroke-dasharray="4 6"/>
                    <path d="M56 106 L138 92 L218 96 L296 68 L380 54 L478 32" stroke="rgba(255,255,255,0.22)" stroke-width="1.5"/>
                    <path class="vp-pulse" d="M56 106 L138 92 L218 96 L296 68 L380 54 L478 32"/>
                    <circle cx="296" cy="68" r="4" fill="#00FCC3"/>
                    <circle cx="478" cy="32" r="5" fill="#00FCC3"/>
                    <circle cx="478" cy="32" r="11" stroke="#00FCC3" stroke-opacity="0.35"/>
                    <text x="56" y="26" fill="#00FCC3" font-family="IBM Plex Mono" font-size="9.5">LIVE TELEMETRY STREAM // EXECUTIVE BI</text>
                </svg>`,
            ar: {
                tag: "رؤية تنفيذية",
                title: "هندسة البيانات وذكاء الأعمال",
                desc: "توحيد البيانات المتفرقة في خطوط معالجة موثوقة ولوحات مؤشرات تنفيذية واضحة تمكّن القيادات من اتخاذ القرار بثقة وسرعة.",
                list: [
                    "بناء خطوط تجميع وتنظيف ومستودعات بيانات مؤسسية",
                    "لوحات مؤشرات أداء لحظية مصمّمة لصنّاع القرار",
                    "نماذج تنبؤية لاكتشاف الأنماط والفرص مبكراً"
                ]
            },
            en: {
                tag: "Decision Clarity",
                title: "Data Engineering & Business Intelligence",
                desc: "Consolidating fragmented operational sources into reliable data pipelines and calm executive dashboards built for rapid decisions.",
                list: [
                    "Structured enterprise data pipelines & warehousing",
                    "Real-time KPI dashboards crafted for leadership clarity",
                    "Predictive analytics surfacing operational risks and opportunities"
                ]
            }
        },
        cloud: {
            code: "05 // CLOUD EDGE & ZERO-TRUST OPS",
            stack: ["Cloudflare Edge", "AWS / K8s", "Zero-Trust WAF", "CI/CD Pipelines", "24/7 Observability"],
            diagram: `
                <svg viewBox="0 0 540 148" fill="none">
                    <rect x="190" y="34" width="160" height="80" rx="14" fill="#170C20" stroke="#00FCC3" stroke-opacity="0.55"/>
                    <text x="270" y="68" text-anchor="middle" fill="#00FCC3" font-family="IBM Plex Mono" font-size="9.5">ZERO-TRUST CORE</text>
                    <text x="270" y="88" text-anchor="middle" fill="#FFFFFF" font-family="IBM Plex Sans" font-size="12" font-weight="600">Edge &amp; Cloud Mesh</text>
                    <path class="vp-pulse" d="M88 46 L190 66"/>
                    <path class="vp-pulse" d="M88 102 L190 82"/>
                    <path class="vp-pulse" d="M350 66 L452 46"/>
                    <path class="vp-pulse" d="M350 82 L452 102"/>
                    <rect x="26" y="30" width="62" height="32" rx="8" fill="#120918" stroke="rgba(255,255,255,0.16)"/>
                    <text x="57" y="50" text-anchor="middle" fill="#F7F8FC" font-family="IBM Plex Mono" font-size="10">WAF</text>
                    <rect x="26" y="86" width="62" height="32" rx="8" fill="#120918" stroke="rgba(255,255,255,0.16)"/>
                    <text x="57" y="106" text-anchor="middle" fill="#F7F8FC" font-family="IBM Plex Mono" font-size="10">CDN</text>
                    <rect x="452" y="30" width="62" height="32" rx="8" fill="#120918" stroke="rgba(255,255,255,0.16)"/>
                    <text x="483" y="50" text-anchor="middle" fill="#F7F8FC" font-family="IBM Plex Mono" font-size="10">CI/CD</text>
                    <rect x="452" y="86" width="62" height="32" rx="8" fill="#120918" stroke="rgba(255,255,255,0.16)"/>
                    <text x="483" y="106" text-anchor="middle" fill="#F7F8FC" font-family="IBM Plex Mono" font-size="10">24/7</text>
                </svg>`,
            ar: {
                tag: "جاهزية مستمرة",
                title: "البنية السحابية والأمن السيبراني",
                desc: "هندسة سحابية فائقة الموثوقية على الحافة (Edge) والخدمات المدارة، مع أتمتة النشر، التشفير الكامل، والمراقبة المستمرة على مدار الساعة.",
                list: [
                    "معمارية Zero-Trust وجدران حماية متقدمة لطبقة التطبيقات",
                    "نشر آلي CI/CD بدون توقف مع توسّع تلقائي تحت الضغط",
                    "مراقبة فورية واستجابة هندسية متواصلة 24/7"
                ]
            },
            en: {
                tag: "Always-On Infra",
                title: "Cloud Architecture & Security",
                desc: "Resilient edge and managed cloud infrastructure fortified with automated CI/CD, Zero-Trust security, and 24/7 observability.",
                list: [
                    "Zero-Trust security architecture and application-layer WAF defense",
                    "Zero-downtime CI/CD delivery with elastic auto-scaling",
                    "Continuous telemetry and 24/7 operational response"
                ]
            }
        }
    };

    let activeCap = "ai";
    const railItems = document.querySelectorAll(".rail-item");

    const renderCap = (key) => {
        const cap = CAP_DATA[key];
        if (!cap) return;
        activeCap = key;
        const lang = window.currentLang === "en" ? "en" : "ar";
        const copy = cap[lang];

        const setEl = (id, text) => {
            const el = document.getElementById(id);
            if (el) el.textContent = text;
        };

        setEl("vp-code", cap.code);
        setEl("vp-tag", copy.tag);
        setEl("vp-title", copy.title);
        setEl("vp-desc", copy.desc);

        const diagEl = document.getElementById("vp-diagram");
        if (diagEl) diagEl.innerHTML = cap.diagram;

        const listEl = document.getElementById("vp-list");
        if (listEl) {
            listEl.innerHTML = "";
            copy.list.forEach((item) => {
                const li = document.createElement("li");
                li.textContent = item;
                listEl.appendChild(li);
            });
        }

        const stackEl = document.getElementById("vp-stack");
        if (stackEl) {
            stackEl.innerHTML = "";
            cap.stack.forEach((s) => {
                const chip = document.createElement("span");
                chip.className = "vp-stack-chip";
                chip.textContent = s;
                stackEl.appendChild(chip);
            });
        }

        railItems.forEach((btn) => {
            const sel = btn.getAttribute("data-cap") === key;
            btn.classList.toggle("is-active", sel);
            btn.setAttribute("aria-selected", String(sel));
        });
    };

    railItems.forEach((btn) => {
        btn.addEventListener("click", () => {
            const key = btn.getAttribute("data-cap");
            if (key) renderCap(key);
        });
    });

    document.addEventListener("tech:langchange", () => {
        buildManifesto();
        renderCap(activeCap);
    });
    renderCap(activeCap);

    // ═══════════════════════════════════════════════════════════════════════
    // 5. NAVIGATION, LANG TOGGLE, MOBILE DRAWER & SMOOTH REVEALS
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
        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape") closeMenu();
        });
    }

    const header = document.getElementById("site-header");
    const onScrollHeader = () => {
        if (header) header.classList.toggle("is-scrolled", window.scrollY > 20);
    };
    window.addEventListener("scroll", onScrollHeader, { passive: true });
    onScrollHeader();

    const navLinks = document.querySelectorAll(".nav-links a[href^='#']");
    if ("IntersectionObserver" in window && navLinks.length > 0) {
        const navObs = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        const id = entry.target.id;
                        navLinks.forEach((a) => a.classList.toggle("is-active", a.getAttribute("href") === `#${id}`));
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

    requestAnimationFrame(() => {
        document.querySelectorAll("[data-enter]").forEach((el) => el.classList.add("is-visible"));
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
            { threshold: 0.01, rootMargin: "0px 0px 90px 0px" }
        );
        reveals.forEach((el) => revObs.observe(el));
    } else {
        reveals.forEach((el) => el.classList.add("is-visible"));
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 6. PROJECT SCOPE CHIPS + WEB3FORMS ASYNC SUBMISSION
    // ═══════════════════════════════════════════════════════════════════════
    const scopeChips = document.querySelectorAll(".scope-chip");
    const scopeInput = document.getElementById("tech-scope-input");
    scopeChips.forEach((chip) => {
        chip.addEventListener("click", () => {
            scopeChips.forEach((c) => c.classList.remove("is-selected"));
            chip.classList.add("is-selected");
            if (scopeInput) scopeInput.value = chip.getAttribute("data-scope") || "AI Systems";
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
                setStatus("err", isEn ? "Please complete all required fields." : "يرجى تعبئة جميع الحقول المطلوبة.");
                return;
            }

            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(emailInput.value.trim())) {
                setStatus("err", isEn ? "Please enter a valid work email address." : "يرجى إدخال بريد إلكتروني صحيح.");
                return;
            }

            const originalText = submitBtn ? submitBtn.textContent : "";
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = isEn ? "Sending inquiry..." : "جاري إرسال الطلب...";
            }
            if (statusDiv) statusDiv.className = "form-status";

            try {
                const response = await fetch("https://api.web3forms.com/submit", {
                    method: "POST",
                    headers: { "Content-Type": "application/json", Accept: "application/json" },
                    body: JSON.stringify(Object.fromEntries(new FormData(techForm)))
                });
                const result = await response.json();
                if (response.status === 200 && result.success) {
                    techForm.reset();
                    setStatus(
                        "ok",
                        isEn
                            ? "Your project inquiry has been received. Our Riyadh engineering team will respond shortly."
                            : "تم استلام طلب مشروعك بنجاح. سيتواصل معك فريقنا الهندسي في الرياض قريباً."
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
