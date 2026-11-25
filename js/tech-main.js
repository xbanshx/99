document.addEventListener("DOMContentLoaded", () => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const isFinePointer = window.matchMedia("(pointer: fine)").matches;

    // ═══════════════════════════════════════════════════════════════════════
    // 1. BESPOKE GPU GLSL SHADER: SOVEREIGN ROYAL INDIGO (#33075F) OBSIDIAN SILK
    //    Obsidian (#06030A) + 99 Royal Imperial Indigo (#33075F) +
    //    Whisper Champagne-Gold (#DFC492) & Pearl-Platinum anisotropic sheen.
    //    Reacts smoothly to pointer inertia + hero scroll elevation.
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
            uniform float u_scroll;

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
                p.y -= u_scroll * 0.22;
                vec2 m = (u_mouse - 0.5) * vec2(aspect, 1.0);

                float t = u_time * 0.19;

                // Fluid pointer warp
                vec2 dMouse = p - m;
                float mDist = length(dMouse);
                p -= dMouse * exp(-mDist * 2.3) * 0.085;

                // Anisotropic satin folds
                float ca = cos(0.42), sa = sin(0.42);
                vec2 r = mat2(ca, -sa, sa, ca) * p;

                float n1 = noise(vec2(r.x * 1.5 + t * 0.65, r.y * 0.85 - t * 0.35));
                float n2 = noise(vec2(r.x * 2.6 - t * 0.45, r.y * 1.45 + t * 0.55));

                float fold1 = sin(r.x * 4.8 + n1 * 2.3 + t * 1.0);
                float fold2 = sin(r.x * 8.6 - n2 * 2.0 - t * 0.7) * 0.40;
                float fold3 = sin(r.y * 2.8 + n1 * 1.7) * 0.32;
                float h = fold1 + fold2 + fold3;

                float broadRidge = exp(-pow(h - 0.45, 2.0) * 5.2);
                float razorCrest = exp(-pow(h - 0.94, 2.0) * 26.0);

                // 99 Sovereign Royal Palette
                vec3 voidCol = vec3(0.024, 0.012, 0.039);       // #06030A Obsidian-Aubergine
                vec3 royalCol = vec3(0.200, 0.027, 0.373);      // #33075F Official 99 Royal Indigo
                vec3 amethystCol = vec3(0.54, 0.39, 0.88);      // Brushed Amethyst-Platinum
                vec3 champagneCol = vec3(0.875, 0.769, 0.573);  // #DFC492 Muted Champagne-Gold

                float depthMix = smoothstep(-1.35, 1.25, h) * 0.68;
                vec3 col = mix(voidCol, royalCol, depthMix);
                col += royalCol * broadRidge * 0.58;
                col += amethystCol * razorCrest * 0.24;
                col += champagneCol * pow(razorCrest, 1.6) * 0.22;
                col += champagneCol * exp(-mDist * 3.4) * 0.075;

                // Fine cinema film grain (eliminates 8-bit banding)
                float g = (hash(gl_FragCoord.xy + fract(u_time) * 100.0) - 0.5) * 0.016;
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
        const uScroll = gl.getUniformLocation(prog, "u_scroll");

        let targetX = 0.62, targetY = 0.52;
        let curX = 0.62, curY = 0.52;
        let heroVisible = true;
        let scrollNorm = 0;
        const start = performance.now();

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

        window.addEventListener("scroll", () => {
            scrollNorm = Math.min(1.2, window.scrollY / Math.max(window.innerHeight, 1));
        }, { passive: true });

        const render = (now) => {
            if (heroVisible) {
                curX += (targetX - curX) * 0.04;
                curY += (targetY - curY) * 0.04;
                gl.uniform2f(uRes, canvas.width, canvas.height);
                gl.uniform1f(uTime, prefersReducedMotion ? 2.6 : (now - start) * 0.001);
                gl.uniform2f(uMouse, curX, curY);
                gl.uniform1f(uScroll, prefersReducedMotion ? 0 : scrollNorm);
                gl.drawArrays(gl.TRIANGLES, 0, 6);
            }
            if (!prefersReducedMotion) requestAnimationFrame(render);
        };
        requestAnimationFrame(render);
    };
    initSilkShader();

    // ═══════════════════════════════════════════════════════════════════════
    // 2. CONTINUOUS SCROLL-CHOREOGRAPHED PARALLAX, PROGRESS BEAM & PIPELINE
    //    Pure GPU translate3d / scaleX synced to scroll via single rAF loop.
    // ═══════════════════════════════════════════════════════════════════════
    const progressBar = document.getElementById("scroll-progress-bar");
    const pipelineSec = document.getElementById("tech-process");
    const pipelineFill = document.getElementById("pipeline-fill");
    const parallaxNodes = !prefersReducedMotion && window.innerWidth > 900
        ? Array.from(document.querySelectorAll("[data-parallax]"))
        : [];
    const scrollAuras = !prefersReducedMotion && window.innerWidth > 900
        ? Array.from(document.querySelectorAll(".monolith-aura"))
        : [];
    const reveals = Array.from(document.querySelectorAll(".reveal"));
    const sectionBlocks = Array.from(document.querySelectorAll(".section-block"));

    let scrollRaf = null;
    const syncScrollEffects = () => {
        scrollRaf = null;
        const y = window.scrollY;
        const vh = window.innerHeight || 900;
        const maxScroll = Math.max(1, document.documentElement.scrollHeight - vh);

        if (progressBar) {
            const ratio = Math.min(1, Math.max(0, y / maxScroll));
            progressBar.style.transform = `scaleX(${ratio.toFixed(4)})`;
        }

        // Subtle Hero Depth Parallax (only while in top 125% viewport)
        if (parallaxNodes.length > 0 && y < vh * 1.25) {
            parallaxNodes.forEach((el) => {
                const factor = parseFloat(el.getAttribute("data-parallax") || "0");
                el.style.transform = `translate3d(0, ${(y * factor).toFixed(1)}px, 0)`;
            });
        }

        // Continuous atmospheric depth parallax on portfolio monolith auras
        if (scrollAuras.length > 0) {
            scrollAuras.forEach((aura) => {
                const parent = aura.parentElement;
                if (!parent) return;
                const r = parent.getBoundingClientRect();
                if (r.bottom > -80 && r.top < vh + 80) {
                    const norm = ((r.top + r.height * 0.5) / vh) - 0.5;
                    aura.style.transform = `translate3d(0, ${(norm * -28).toFixed(1)}px, 0) scale(1.06)`;
                }
            });
        }

        // Scroll-lit Delivery Pipeline Spine
        if (pipelineSec && pipelineFill) {
            const r = pipelineSec.getBoundingClientRect();
            const p = Math.min(1, Math.max(0, (vh * 0.84 - r.top) / (vh * 0.58)));
            pipelineFill.style.transform = `scaleX(${p.toFixed(3)})`;
        }

        // Safety sweep: ensure elements well inside or passed above viewport always reveal
        if (!prefersReducedMotion) {
            const triggerLine = vh * 0.89;
            reveals.forEach((el) => {
                if (!el.classList.contains("is-visible")) {
                    const r = el.getBoundingClientRect();
                    if (r.top <= triggerLine && r.bottom > 0) {
                        el.classList.add("is-visible");
                    }
                }
            });
            sectionBlocks.forEach((sec) => {
                if (!sec.classList.contains("is-entered")) {
                    const r = sec.getBoundingClientRect();
                    if (r.top <= vh * 0.88) {
                        sec.classList.add("is-entered");
                    }
                }
            });
        }

        updateManifestoScroll();
    };

    const requestScrollSync = () => {
        if (!scrollRaf) scrollRaf = requestAnimationFrame(syncScrollEffects);
    };

    window.addEventListener("scroll", requestScrollSync, { passive: true });

    // Subtle 3D Pointer Depth on Hero 99 Emblem + Monolith Stages
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

    if (isFinePointer && !prefersReducedMotion) {
        document.querySelectorAll("[data-depth-stage]").forEach((stage) => {
            const layer = stage.querySelector("[data-depth-layer]");
            if (!layer) return;
            stage.addEventListener("pointermove", (e) => {
                const r = stage.getBoundingClientRect();
                const nx = (e.clientX - r.left) / r.width - 0.5;
                const ny = (e.clientY - r.top) / r.height - 0.5;
                layer.style.transform = `translate3d(${(nx * 14).toFixed(1)}px, ${(ny * 10).toFixed(1)}px, 0) scale(1.02)`;
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
    // 3. SCROLL-SCRUBBED CINEMATIC MANIFESTO
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

    function updateManifestoScroll() {
        if (!manifestoSec || wordSpans.length === 0) return;
        if (prefersReducedMotion) {
            wordSpans.forEach((s) => s.classList.add("is-lit"));
            return;
        }
        const rect = manifestoSec.getBoundingClientRect();
        const vh = window.innerHeight || 900;
        const start = vh * 0.85;
        const end = vh * 0.20;
        const progress = Math.min(1, Math.max(0, (start - rect.top) / (start - end + rect.height * 0.35)));
        const litCount = Math.ceil(progress * wordSpans.length);
        wordSpans.forEach((s, i) => s.classList.toggle("is-lit", i < litCount));
    }

    buildManifesto();
    syncScrollEffects();

    // ═══════════════════════════════════════════════════════════════════════
    // 4. INTERACTIVE CAPABILITIES ARCHITECTURE EXPLORER + LIVE TELEMETRY TRACE
    // ═══════════════════════════════════════════════════════════════════════
    const CAP_DATA = {
        ai: {
            code: "01 // AI SYSTEMS ARCHITECTURE",
            stack: ["Multi-Agent Core", "Arabic RAG", "LLM Guardrails", "Structured Memory", "Tool Execution"],
            trace: [
                { step: "STEP 01", state: "READY", label: "Context Ingestion" },
                { step: "STEP 02", state: "ACTIVE", label: "Arabic Reasoning" },
                { step: "STEP 03", state: "VERIFIED", label: "Approval Gate" }
            ],
            diagram: `
                <svg viewBox="0 0 540 144" fill="none">
                    <path d="M96 72 H202" stroke="rgba(246,244,250,0.16)" stroke-width="1.2"/>
                    <path d="M338 72 H444" stroke="rgba(246,244,250,0.16)" stroke-width="1.2"/>
                    <path d="M270 28 V116" stroke="rgba(246,244,250,0.12)" stroke-width="1" stroke-dasharray="3 4"/>
                    <path class="vp-pulse" d="M96 72 H202"/>
                    <path class="vp-pulse" d="M338 72 H444"/>
                    <rect x="14" y="46" width="82" height="52" rx="10" fill="#10091B" stroke="rgba(246,244,250,0.16)"/>
                    <text x="55" y="68" text-anchor="middle" fill="#7A718C" font-family="IBM Plex Mono" font-size="9">CONTEXT</text>
                    <text x="55" y="84" text-anchor="middle" fill="#F6F4FA" font-family="IBM Plex Sans" font-size="11">Brand Data</text>
                    <rect x="202" y="40" width="136" height="64" rx="12" fill="#190E2A" stroke="#DFC492" stroke-opacity="0.6"/>
                    <text x="270" y="66" text-anchor="middle" fill="#DFC492" font-family="IBM Plex Mono" font-size="9">99 AI CORE</text>
                    <text x="270" y="86" text-anchor="middle" fill="#FFFFFF" font-family="IBM Plex Sans" font-size="12.5" font-weight="600">Agent Orchestrator</text>
                    <circle cx="270" cy="18" r="4" fill="#DFC492"/>
                    <circle cx="270" cy="126" r="4" fill="#C4AEFF"/>
                    <rect x="444" y="46" width="82" height="52" rx="10" fill="#10091B" stroke="rgba(246,244,250,0.16)"/>
                    <text x="485" y="68" text-anchor="middle" fill="#7A718C" font-family="IBM Plex Mono" font-size="9">GOVERNED</text>
                    <text x="485" y="84" text-anchor="middle" fill="#F6F4FA" font-family="IBM Plex Sans" font-size="11">Execution</text>
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
            trace: [
                { step: "LAYER 01", state: "TLS 1.3", label: "API Gateway" },
                { step: "LAYER 02", state: "ISOLATED", label: "Domain Services" },
                { step: "LAYER 03", state: "ENCRYPTED", label: "Tenant Store" }
            ],
            diagram: `
                <svg viewBox="0 0 540 144" fill="none">
                    <path d="M126 72 H210" stroke="rgba(246,244,250,0.16)" stroke-width="1.2"/>
                    <path d="M330 72 H414" stroke="rgba(246,244,250,0.16)" stroke-width="1.2"/>
                    <path class="vp-pulse" d="M126 72 H210"/>
                    <path class="vp-pulse" d="M330 72 H414"/>
                    <rect x="20" y="32" width="106" height="80" rx="10" fill="#10091B" stroke="rgba(246,244,250,0.16)"/>
                    <text x="73" y="62" text-anchor="middle" fill="#DFC492" font-family="IBM Plex Mono" font-size="9">GATEWAY</text>
                    <text x="73" y="82" text-anchor="middle" fill="#F6F4FA" font-family="IBM Plex Sans" font-size="11.5">REST / GraphQL</text>
                    <rect x="210" y="26" width="120" height="92" rx="12" fill="#190E2A" stroke="#DFC492" stroke-opacity="0.58"/>
                    <text x="270" y="54" text-anchor="middle" fill="#DFC492" font-family="IBM Plex Mono" font-size="9">CORE ENGINE</text>
                    <text x="270" y="76" text-anchor="middle" fill="#FFFFFF" font-family="IBM Plex Sans" font-size="12" font-weight="600">Domain Services</text>
                    <text x="270" y="96" text-anchor="middle" fill="#B6AEC5" font-family="IBM Plex Mono" font-size="9">RBAC · AUDIT</text>
                    <rect x="414" y="32" width="106" height="80" rx="10" fill="#10091B" stroke="rgba(246,244,250,0.16)"/>
                    <text x="467" y="62" text-anchor="middle" fill="#7A718C" font-family="IBM Plex Mono" font-size="9">PERSISTENCE</text>
                    <text x="467" y="82" text-anchor="middle" fill="#F6F4FA" font-family="IBM Plex Sans" font-size="11.5">Encrypted DB</text>
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
            trace: [
                { step: "RENDER", state: "60 FPS", label: "GPU Composited" },
                { step: "SCRIPT", state: "AR + EN", label: "Logical RTL/LTR" },
                { step: "INDEX", state: "SEO/GEO", label: "AI Discoverable" }
            ],
            diagram: `
                <svg viewBox="0 0 540 144" fill="none">
                    <rect x="52" y="20" width="286" height="104" rx="12" fill="#10091B" stroke="rgba(246,244,250,0.18)"/>
                    <line x1="52" y1="42" x2="338" y2="42" stroke="rgba(246,244,250,0.1)"/>
                    <text x="195" y="34" text-anchor="middle" fill="#7A718C" font-family="IBM Plex Mono" font-size="9">DESKTOP · 60FPS WEB EXPERIENCE</text>
                    <rect x="72" y="56" width="130" height="12" rx="4" fill="#DFC492" fill-opacity="0.24"/>
                    <rect x="72" y="76" width="246" height="32" rx="6" fill="#190E2A" stroke="rgba(246,244,250,0.08)"/>
                    <path class="vp-pulse" d="M338 72 H396"/>
                    <rect x="396" y="16" width="90" height="112" rx="14" fill="#190E2A" stroke="#DFC492" stroke-opacity="0.58"/>
                    <rect x="427" y="24" width="28" height="4" rx="2" fill="rgba(246,244,250,0.2)"/>
                    <rect x="410" y="42" width="62" height="34" rx="6" fill="rgba(223,196,146,0.14)"/>
                    <rect x="410" y="86" width="62" height="26" rx="6" fill="rgba(246,244,250,0.06)"/>
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
            trace: [
                { step: "INGEST", state: "STREAM", label: "Unified Sources" },
                { step: "MODEL", state: "CLEAN", label: "Metric Layer" },
                { step: "VIEW", state: "LIVE", label: "Executive Board" }
            ],
            diagram: `
                <svg viewBox="0 0 540 144" fill="none">
                    <line x1="40" y1="116" x2="500" y2="116" stroke="rgba(246,244,250,0.14)"/>
                    <line x1="40" y1="76" x2="500" y2="76" stroke="rgba(246,244,250,0.06)" stroke-dasharray="4 6"/>
                    <line x1="40" y1="36" x2="500" y2="36" stroke="rgba(246,244,250,0.06)" stroke-dasharray="4 6"/>
                    <path d="M56 104 L138 90 L218 94 L296 66 L380 52 L478 30" stroke="rgba(196,174,255,0.34)" stroke-width="1.5"/>
                    <path class="vp-pulse" d="M56 104 L138 90 L218 94 L296 66 L380 52 L478 30"/>
                    <circle cx="296" cy="66" r="4" fill="#C4AEFF"/>
                    <circle cx="478" cy="30" r="5" fill="#DFC492"/>
                    <circle cx="478" cy="30" r="11" stroke="#DFC492" stroke-opacity="0.38"/>
                    <text x="56" y="24" fill="#DFC492" font-family="IBM Plex Mono" font-size="9.5">LIVE TELEMETRY STREAM // EXECUTIVE BI</text>
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
            trace: [
                { step: "EDGE", state: "GLOBAL", label: "Zero-Trust WAF" },
                { step: "DEPLOY", state: "CI/CD", label: "Zero-Downtime" },
                { step: "OPS", state: "24/7", label: "Live Telemetry" }
            ],
            diagram: `
                <svg viewBox="0 0 540 144" fill="none">
                    <rect x="190" y="32" width="160" height="80" rx="14" fill="#190E2A" stroke="#DFC492" stroke-opacity="0.6"/>
                    <text x="270" y="66" text-anchor="middle" fill="#DFC492" font-family="IBM Plex Mono" font-size="9.5">ZERO-TRUST CORE</text>
                    <text x="270" y="86" text-anchor="middle" fill="#FFFFFF" font-family="IBM Plex Sans" font-size="12" font-weight="600">Edge &amp; Cloud Mesh</text>
                    <path class="vp-pulse" d="M88 44 L190 64"/>
                    <path class="vp-pulse" d="M88 100 L190 80"/>
                    <path class="vp-pulse" d="M350 64 L452 44"/>
                    <path class="vp-pulse" d="M350 80 L452 100"/>
                    <rect x="26" y="28" width="62" height="32" rx="8" fill="#10091B" stroke="rgba(246,244,250,0.16)"/>
                    <text x="57" y="48" text-anchor="middle" fill="#F6F4FA" font-family="IBM Plex Mono" font-size="10">WAF</text>
                    <rect x="26" y="84" width="62" height="32" rx="8" fill="#10091B" stroke="rgba(246,244,250,0.16)"/>
                    <text x="57" y="104" text-anchor="middle" fill="#F6F4FA" font-family="IBM Plex Mono" font-size="10">CDN</text>
                    <rect x="452" y="28" width="62" height="32" rx="8" fill="#10091B" stroke="rgba(246,244,250,0.16)"/>
                    <text x="483" y="48" text-anchor="middle" fill="#F6F4FA" font-family="IBM Plex Mono" font-size="10">CI/CD</text>
                    <rect x="452" y="84" width="62" height="32" rx="8" fill="#10091B" stroke="rgba(246,244,250,0.16)"/>
                    <text x="483" y="104" text-anchor="middle" fill="#F6F4FA" font-family="IBM Plex Mono" font-size="10">24/7</text>
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
        if (diagEl) {
            diagEl.innerHTML = cap.diagram;
            diagEl.classList.remove("vp-swap-in");
            void diagEl.offsetWidth;
            diagEl.classList.add("vp-swap-in");
        }

        const vpContent = document.querySelector(".vp-content");
        if (vpContent) {
            vpContent.classList.remove("vp-swap-in");
            void vpContent.offsetWidth;
            vpContent.classList.add("vp-swap-in");
        }

        const traceEl = document.getElementById("vp-trace");
        if (traceEl) {
            traceEl.innerHTML = "";
            cap.trace.forEach((tr) => {
                const box = document.createElement("div");
                box.className = "trace-step";
                box.innerHTML = `<div class="trace-meta"><span>${tr.step}</span><span class="trace-ok">${tr.state}</span></div><div class="trace-label">${tr.label}</div>`;
                traceEl.appendChild(box);
            });
        }

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

    if (!prefersReducedMotion && "IntersectionObserver" in window) {
        // Trigger visibly as each element crosses ~11% into the viewport (never off-screen!)
        const revObs = new IntersectionObserver(
            (entries, obs) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add("is-visible");
                        obs.unobserve(entry.target);
                    }
                });
            },
            { threshold: 0.02, rootMargin: "0px 0px -11% 0px" }
        );
        reveals.forEach((el) => revObs.observe(el));

        const secObs = new IntersectionObserver(
            (entries, obs) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add("is-entered");
                        obs.unobserve(entry.target);
                    }
                });
            },
            { threshold: 0.01, rootMargin: "0px 0px -10% 0px" }
        );
        sectionBlocks.forEach((sec) => secObs.observe(sec));
    } else {
        reveals.forEach((el) => el.classList.add("is-visible"));
        sectionBlocks.forEach((sec) => sec.classList.add("is-entered"));
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
