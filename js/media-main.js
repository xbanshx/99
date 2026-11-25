document.addEventListener("DOMContentLoaded", () => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const isFinePointer = window.matchMedia("(pointer: fine)").matches;
    // Detect lower-core / integrated-GPU machines gently to keep 60fps everywhere
    const isLowPower = (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4);

    // ═══════════════════════════════════════════════════════════════════════
    // 1. ZERO-FILE WEB AUDIO API CINEMA SOUNDSCAPE (OPTIONAL TOGGLE)
    // ═══════════════════════════════════════════════════════════════════════
    let audioCtx = null;
    let soundOn = false;
    const soundBtn = document.getElementById("sound-toggle");

    const playCinemaTick = (freq = 540, dur = 0.045, gainVal = 0.035) => {
        if (!soundOn || !audioCtx) return;
        try {
            const now = audioCtx.currentTime;
            const osc = audioCtx.createOscillator();
            const g = audioCtx.createGain();
            osc.type = "triangle";
            osc.frequency.setValueAtTime(freq, now);
            osc.frequency.exponentialRampToValueAtTime(freq * 0.42, now + dur);
            g.gain.setValueAtTime(gainVal, now);
            g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
            osc.connect(g);
            g.connect(audioCtx.destination);
            osc.start(now);
            osc.stop(now + dur);
        } catch (_) {}
    };

    if (soundBtn) {
        soundBtn.addEventListener("click", () => {
            soundOn = !soundOn;
            soundBtn.setAttribute("aria-pressed", String(soundOn));
            if (soundOn) {
                const AC = window.AudioContext || window.webkitAudioContext;
                if (!audioCtx && AC) audioCtx = new AC();
                if (audioCtx && audioCtx.state === "suspended") audioCtx.resume();
                playCinemaTick(680, 0.06, 0.045);
            }
        });
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 2. 0.72s SOVEREIGN ROYAL FILM-LEADER CURTAIN
    // ═══════════════════════════════════════════════════════════════════════
    const loader = document.getElementById("cinema-loader");
    const loaderCount = document.getElementById("loader-count");
    const loaderLine = document.getElementById("loader-line");
    const revealHero = () => {
        document.querySelectorAll("[data-enter]").forEach((el) => el.classList.add("is-visible"));
    };

    if (loader && !prefersReducedMotion) {
        const start = performance.now();
        const dur = 700;
        let dismissed = false;

        const dismiss = () => {
            if (dismissed) return;
            dismissed = true;
            loader.classList.add("is-done");
            setTimeout(() => { loader.style.display = "none"; }, 850);
            revealHero();
        };
        loader.addEventListener("click", dismiss);

        const tickLoader = (now) => {
            if (dismissed) return;
            const p = Math.min(1, (now - start) / dur);
            const eased = 1 - Math.pow(1 - p, 3);
            if (loaderCount) loaderCount.textContent = String(Math.round(eased * 99)).padStart(2, "0");
            if (loaderLine) loaderLine.style.setProperty("--p", eased.toFixed(3));
            if (p < 1) requestAnimationFrame(tickLoader);
            else setTimeout(dismiss, 90);
        };
        requestAnimationFrame(tickLoader);
    } else {
        if (loader) loader.style.display = "none";
        revealHero();
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 3. LIVE JEDDAH BROADCAST CLOCK + VISIBILITY-GATED 24FPS TIMECODE
    // ═══════════════════════════════════════════════════════════════════════
    const clockEl = document.getElementById("jeddah-clock");
    const updateJeddahClock = () => {
        if (!clockEl) return;
        try {
            clockEl.textContent = new Intl.DateTimeFormat("en-GB", {
                timeZone: "Asia/Riyadh", hour: "2-digit", minute: "2-digit", hour12: false
            }).format(new Date());
        } catch (_) { clockEl.textContent = "KSA"; }
    };
    updateJeddahClock();
    setInterval(updateJeddahClock, 30000);

    let heroInView = true;
    const heroEl = document.getElementById("act-theater");
    if (heroEl && "IntersectionObserver" in window) {
        new IntersectionObserver((e) => { heroInView = e[0].isIntersecting; }, { threshold: 0.01 }).observe(heroEl);
    }

    const heroTc = document.getElementById("hero-tc");
    if (heroTc && !prefersReducedMotion) {
        let f = 0;
        setInterval(() => {
            if (!heroInView) return;
            f = (f + 6) % (24 * 60);
            heroTc.textContent = `00:00:${String(Math.floor(f / 24)).padStart(2, "0")}:${String(f % 24).padStart(2, "0")}`;
        }, 250);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 4. ON-DEMAND MAGNETIC CINEMA CURSOR (0% IDLE CPU ON INTEL MACS!)
    //    Spins rAF ONLY while pointer moves and stops immediately when settled.
    // ═══════════════════════════════════════════════════════════════════════
    const cursorEl = document.getElementById("cinema-cursor");
    const cursorLbl = document.getElementById("cursor-label");
    if (cursorEl && isFinePointer && !prefersReducedMotion) {
        let mx = -100, my = -100, cx = -100, cy = -100, visible = false, cRaf = null;

        const stepCursor = () => {
            cRaf = null;
            cx += (mx - cx) * 0.24;
            cy += (my - cy) * 0.24;
            cursorEl.style.transform = `translate3d(${cx.toFixed(1)}px, ${cy.toFixed(1)}px, 0) translate(-50%, -50%)`;
            if (Math.abs(mx - cx) > 0.35 || Math.abs(my - cy) > 0.35) {
                cRaf = requestAnimationFrame(stepCursor);
            }
        };

        window.addEventListener("pointermove", (e) => {
            mx = e.clientX;
            my = e.clientY;
            if (!visible) {
                visible = true;
                cx = mx; cy = my;
                cursorEl.classList.add("is-visible");
            }
            if (!cRaf) cRaf = requestAnimationFrame(stepCursor);
        }, { passive: true });

        document.addEventListener("pointerleave", () => {
            visible = false;
            cursorEl.classList.remove("is-visible");
        });

        document.querySelectorAll("[data-cursor]").forEach((el) => {
            el.addEventListener("pointerenter", () => {
                if (cursorLbl) cursorLbl.textContent = el.getAttribute("data-cursor") || "";
                cursorEl.classList.add("is-pill");
            });
            el.addEventListener("pointerleave", () => cursorEl.classList.remove("is-pill"));
        });
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 5. INTEL-MAC OPTIMIZED WEBGL OPTICAL LENS SHADER (0.7× DPR + IDLE SLEEP)
    //    Cuts fragment shader fill-rate by ~3.7× while keeping silky-smooth
    //    interactive optical refraction, RGB prism shift & anamorphic flare!
    // ═══════════════════════════════════════════════════════════════════════
    const initOpticalHeroShader = () => {
        const canvas = document.getElementById("anamorphic-shader");
        const srcImg = document.getElementById("hero-source-img");
        const backdrop = document.getElementById("theater-backdrop");
        if (!canvas || !srcImg || prefersReducedMotion) return;
        const gl = canvas.getContext("webgl", { alpha: false, antialias: false, powerPreference: "default" });
        if (!gl) return;

        const vs = gl.createShader(gl.VERTEX_SHADER);
        gl.shaderSource(vs, `attribute vec2 p; varying vec2 v_uv; void main(){ v_uv = p * 0.5 + 0.5; gl_Position = vec4(p,0.,1.); }`);
        gl.compileShader(vs);

        const fs = gl.createShader(gl.FRAGMENT_SHADER);
        gl.shaderSource(fs, `
            precision mediump float;
            varying vec2 v_uv;
            uniform sampler2D u_tex;
            uniform vec2 u_res;
            uniform vec2 u_imgRes;
            uniform float u_t;
            uniform vec2 u_m;
            uniform float u_vel;

            vec2 coverUV(vec2 uv, vec2 res, vec2 imgRes) {
                float rScr = res.x / max(res.y, 1.0);
                float rImg = imgRes.x / max(imgRes.y, 1.0);
                vec2 s = (rScr > rImg) ? vec2(1.0, rImg / rScr) : vec2(rScr / rImg, 1.0);
                vec2 outUv = (uv - 0.5) * s + 0.5;
                outUv.y = 1.0 - outUv.y;
                return outUv;
            }

            void main() {
                vec2 uv = coverUV(v_uv, u_res, u_imgRes);
                float asp = u_res.x / max(u_res.y, 1.0);
                vec2 p = (v_uv - 0.5) * vec2(asp, 1.0);
                vec2 m = (u_m - 0.5) * vec2(asp, 1.0);
                vec2 d = p - m;
                float dist = length(d);

                float wave = sin(dist * 15.0 - u_t * 2.6) * exp(-dist * 3.8) * (0.006 + u_vel * 0.024);
                vec2 dir = dist > 0.0001 ? d / dist : vec2(0.0);
                vec2 disp = dir * wave + (m * -0.01);

                float chroma = (0.0018 + u_vel * 0.011) * exp(-dist * 2.4);
                float r = texture2D(u_tex, clamp(uv + disp + vec2(chroma, 0.0), 0.002, 0.998)).r;
                float g = texture2D(u_tex, clamp(uv + disp, 0.002, 0.998)).g;
                float b = texture2D(u_tex, clamp(uv + disp - vec2(chroma, 0.0), 0.002, 0.998)).b;
                vec3 col = vec3(r, g, b);

                float flare = exp(-pow((p.y - m.y * 0.52) * 11.0, 2.0)) * exp(-abs(p.x - m.x * 0.6) * 1.15);
                col += vec3(0.875, 0.769, 0.573) * flare * 0.26;
                col += vec3(0.24, 0.04, 0.46) * exp(-dist * 2.6) * 0.13;

                gl_FragColor = vec4(max(col, 0.0), 1.0);
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

        const tex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

        const uRes = gl.getUniformLocation(prog, "u_res");
        const uImgRes = gl.getUniformLocation(prog, "u_imgRes");
        const uT = gl.getUniformLocation(prog, "u_t");
        const uM = gl.getUniformLocation(prog, "u_m");
        const uVel = gl.getUniformLocation(prog, "u_vel");

        let ready = false, gRaf = null, lastDraw = 0;
        let tx = 0.52, ty = 0.48, cx = 0.52, cy = 0.48, vel = 0;
        let iw = 1920, ih = 1080;
        const t0 = performance.now();

        const renderOnce = (now) => {
            gRaf = null;
            if (!ready || !heroInView) return;

            const active = vel > 0.004 || Math.abs(tx - cx) > 0.0015 || Math.abs(ty - cy) > 0.0015;
            // Smooth 60fps while interacting, gentle 20fps breathing when idle, 0fps off-screen
            if (!active && (now - lastDraw) < 50) {
                gRaf = requestAnimationFrame(renderOnce);
                return;
            }
            lastDraw = now;

            cx += (tx - cx) * 0.08;
            cy += (ty - cy) * 0.08;
            vel *= 0.90;

            gl.uniform2f(uRes, canvas.width, canvas.height);
            gl.uniform2f(uImgRes, iw, ih);
            gl.uniform1f(uT, (now - t0) * 0.001);
            gl.uniform2f(uM, cx, cy);
            gl.uniform1f(uVel, vel);
            gl.drawArrays(gl.TRIANGLES, 0, 6);

            if (active || !isLowPower) {
                gRaf = requestAnimationFrame(renderOnce);
            }
        };

        const wakeShader = () => {
            if (ready && heroInView && !gRaf) gRaf = requestAnimationFrame(renderOnce);
        };

        const upload = () => {
            if (!srcImg.naturalWidth) return;
            iw = srcImg.naturalWidth;
            ih = srcImg.naturalHeight;
            gl.bindTexture(gl.TEXTURE_2D, tex);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, srcImg);
            ready = true;
            if (backdrop) backdrop.classList.add("has-webgl");
            wakeShader();
        };
        if (srcImg.complete && srcImg.naturalWidth) upload();
        else srcImg.addEventListener("load", upload, { once: true });

        const resize = () => {
            // Render optical backdrop at 0.7x resolution (3.7x lighter for Intel GPUs!)
            const scale = isLowPower ? 0.55 : 0.72;
            const r = canvas.getBoundingClientRect();
            canvas.width = Math.max(1, Math.floor(r.width * scale));
            canvas.height = Math.max(1, Math.floor(r.height * scale));
            gl.viewport(0, 0, canvas.width, canvas.height);
            wakeShader();
        };
        resize();
        window.addEventListener("resize", resize, { passive: true });

        if (isFinePointer) {
            window.addEventListener("pointermove", (e) => {
                if (!heroInView) return;
                const nx = e.clientX / Math.max(window.innerWidth, 1);
                const ny = 1.0 - e.clientY / Math.max(window.innerHeight, 1);
                vel = Math.min(1.0, vel + Math.hypot(nx - tx, ny - ty) * 2.5);
                tx = nx;
                ty = ny;
                wakeShader();
            }, { passive: true });
        }

        if (heroEl && "IntersectionObserver" in window) {
            new IntersectionObserver((e) => {
                if (e[0].isIntersecting) wakeShader();
            }, { threshold: 0.01 }).observe(heroEl);
        }
    };
    initOpticalHeroShader();

    // ═══════════════════════════════════════════════════════════════════════
    // 6. 3D PERSPECTIVE TILT + SPECULAR GLINT ON IVORY LENS PORTAL
    // ═══════════════════════════════════════════════════════════════════════
    const portal = document.getElementById("trip-portal");
    if (portal && isFinePointer && !prefersReducedMotion) {
        let pRaf = null, lastEv = null;
        portal.addEventListener("pointermove", (e) => {
            lastEv = e;
            if (!pRaf) {
                pRaf = requestAnimationFrame(() => {
                    pRaf = null;
                    if (!lastEv) return;
                    const r = portal.getBoundingClientRect();
                    const nx = (lastEv.clientX - r.left) / r.width - 0.5;
                    const ny = (lastEv.clientY - r.top) / r.height - 0.5;
                    portal.style.transform = `perspective(900px) rotateY(${(nx * 10).toFixed(1)}deg) rotateX(${(-ny * 9).toFixed(1)}deg) scale(1.012)`;
                    portal.style.setProperty("--gx", `${(lastEv.clientX - r.left).toFixed(0)}px`);
                    portal.style.setProperty("--gy", `${(lastEv.clientY - r.top).toFixed(0)}px`);
                });
            }
        }, { passive: true });
        portal.addEventListener("pointerleave", () => {
            lastEv = null;
            portal.style.transform = "perspective(900px) rotateY(0deg) rotateX(0deg) scale(1)";
        });
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 7. UNIFIED COMPOSITOR-ONLY SCROLL ENGINE (ZERO PAINT THRASH)
    // ═══════════════════════════════════════════════════════════════════════
    const header = document.getElementById("cinema-header");
    const progressBar = document.getElementById("scroll-progress-bar");
    const heroBg = document.getElementById("theater-backdrop");
    const heroCanvas = document.getElementById("anamorphic-shader");
    const lbTop = document.getElementById("lb-top");
    const lbBot = document.getElementById("lb-bot");
    const reelSec = document.getElementById("act-reel");
    const reelTrack = document.getElementById("reel-track");
    const reelCounter = document.getElementById("reel-frame-num");
    const sprocketTop = document.getElementById("sprocket-top");
    const sprocketBot = document.getElementById("sprocket-bot");
    const reelParallaxImgs = Array.from(document.querySelectorAll(".reel-parallax-img"));
    const themedSections = Array.from(document.querySelectorAll("[data-section-theme]"));
    const reveals = Array.from(document.querySelectorAll(".reveal"));

    let lastScrollY = window.scrollY;
    let currentSkew = 0;
    let lastFrameIdx = 1;
    let lastTheme = "dark";
    let rafId = null;

    const syncScroll = () => {
        rafId = null;
        const y = window.scrollY;
        const vh = window.innerHeight || 900;
        const maxScroll = Math.max(1, document.documentElement.scrollHeight - vh);
        const ratio = Math.min(1, Math.max(0, y / maxScroll));

        if (progressBar) progressBar.style.transform = `scaleX(${ratio.toFixed(4)})`;

        if (header) {
            let activeTheme = "dark";
            for (const sec of themedSections) {
                const r = sec.getBoundingClientRect();
                if (r.top <= 48 && r.bottom > 48) {
                    activeTheme = sec.getAttribute("data-section-theme") || "dark";
                    break;
                }
            }
            if (activeTheme !== lastTheme) {
                lastTheme = activeTheme;
                header.setAttribute("data-theme", activeTheme);
            }
        }

        if (!prefersReducedMotion && y < vh * 1.2) {
            const heroP = Math.min(1, y / vh);
            const scaleVal = (1 + heroP * 0.08).toFixed(4);
            if (heroBg) heroBg.style.transform = `translate3d(0, ${(y * 0.14).toFixed(1)}px, 0) scale(${scaleVal})`;
            if (heroCanvas) heroCanvas.style.transform = `scale(${scaleVal})`;
            if (lbTop) lbTop.style.transform = `translate3d(0, ${(-heroP * 26).toFixed(1)}px, 0)`;
            if (lbBot) lbBot.style.transform = `translate3d(0, ${(heroP * 26).toFixed(1)}px, 0)`;
        }

        // Pinned Horizontal 35mm Film-Strip Roll (100% GPU translate3d — zero repaints!)
        if (reelSec && reelTrack && !prefersReducedMotion && window.innerWidth > 1060) {
            const r = reelSec.getBoundingClientRect();
            if (r.bottom > -100 && r.top < vh + 100) {
                const scrollable = Math.max(1, reelSec.offsetHeight - vh);
                const p = Math.min(1, Math.max(0, -r.top / scrollable));
                const maxShift = Math.max(0, reelTrack.scrollWidth - (window.innerWidth - 64));
                const isRtl = document.documentElement.dir === "rtl";
                const shiftX = (isRtl ? 1 : -1) * (p * maxShift);

                const vel = Math.max(-16, Math.min(16, (y - lastScrollY) * 0.12));
                currentSkew += (vel - currentSkew) * 0.2;

                reelTrack.style.transform = `translate3d(${shiftX.toFixed(1)}px, 0, 0) skewX(${(currentSkew * (isRtl ? -0.22 : 0.22)).toFixed(2)}deg)`;

                // GPU-only cyclic sprocket shift (30px pattern period -> 0 paint!)
                const spMod = ((shiftX * 0.5) % 30).toFixed(1);
                const spTf = `translate3d(${spMod}px, 0, 0)`;
                if (sprocketTop) sprocketTop.style.transform = spTf;
                if (sprocketBot) sprocketBot.style.transform = spTf;

                const imgShift = ((p - 0.5) * -10).toFixed(2);
                const imgTf = `translate3d(${imgShift}%, 0, 0)`;
                for (let i = 0; i < reelParallaxImgs.length; i++) {
                    reelParallaxImgs[i].style.transform = imgTf;
                }

                const frameIdx = Math.min(4, Math.max(1, Math.floor(p * 3.99) + 1));
                if (frameIdx !== lastFrameIdx) {
                    lastFrameIdx = frameIdx;
                    playCinemaTick(420, 0.035, 0.025);
                    if (reelCounter) reelCounter.textContent = `0${frameIdx} / 04`;
                }
            }
        }

        if (!prefersReducedMotion) {
            const trig = vh * 0.90;
            for (let i = 0; i < reveals.length; i++) {
                const el = reveals[i];
                if (!el.classList.contains("is-visible")) {
                    const r = el.getBoundingClientRect();
                    if (r.top <= trig && r.bottom > 0) el.classList.add("is-visible");
                }
            }
        }

        lastScrollY = y;
    };

    const requestSync = () => { if (!rafId) rafId = requestAnimationFrame(syncScroll); };
    window.addEventListener("scroll", requestSync, { passive: true });
    window.addEventListener("resize", requestSync, { passive: true });
    syncScroll();

    // ═══════════════════════════════════════════════════════════════════════
    // 8. MICHAEL BAY BRACKETED [ ] REEL + ON-DEMAND FLOATING MONITOR (0% IDLE CPU)
    // ═══════════════════════════════════════════════════════════════════════
    const SCENES = {
        broadcast: {
            code: "SCENE 01 // 4K BROADCAST MASTER",
            shortCode: "SCENE 01 · CONTENT CITY",
            img: "../img/cinema/broadcast-suite.webp",
            label: "مدينة المحتوى // SCENE 01",
            scope: "Broadcast & Cinema Production",
            pills: ["TV Programs", "Documentaries", "Digital Series", "Editorial Scripts"],
            ar: "نبتكر وننتج برامج تلفزيونية ووثائقية وسلاسل رقمية متكاملة بفرق تحرير وإخراج كوّنت خبراتها أبرز البرامج التلفزيونية في العالم العربي.",
            en: "Flagship television programs, documentaries, and digital series produced by veteran broadcast teams across the Arab world."
        },
        cinema: {
            code: "SCENE 02 // ARRI & DOLBY CINEMA",
            shortCode: "SCENE 02 · BUILDING 99",
            img: "../img/videographer.webp",
            label: "مبنى 99 للإنتاج // SCENE 02",
            scope: "Broadcast & Cinema Production",
            pills: ["Brand Films", "Commercials", "DaVinci Color", "Sound Mastering"],
            ar: "للصورة في عالم 99 هيبتها: تكوينها، لونها، إضاءتها وحركتها بأحدث المعدات السينمائية وهندسة الصوت لتروي قصة الحدث بصمت وإبهار.",
            en: "High-craft brand films, commercial cinematography, theatrical color grading, and studio sound mastering."
        },
        aivideo: {
            code: "SCENE 03 // AI DIRECTORIAL LAB",
            shortCode: "SCENE 03 · AI CINEMA LAB",
            img: "../img/cinema/ai-cinema.webp",
            label: "مختبر سينما AI // SCENE 03",
            scope: "AI Video Production",
            pills: ["Generative Films", "AI Ads", "Virtual Worlds", "Hybrid VFX"],
            ar: "نختصر الزمن ونفتح عوالم بصرية مستحيلة بالتصوير التقليدي عبر توليد الفيديوهات بالذكاء الاصطناعي تحت إشراف مخرجين محترفين.",
            en: "Director-led generative AI brand films, conceptual worlds, and hybrid VFX workflows delivering bold visuals at 5× speed."
        },
        pr: {
            code: "SCENE 04 // STRATEGIC PR & SUMMITS",
            shortCode: "SCENE 04 · CREATIVITY ST.",
            img: "../img/cinema/pr-summit.webp",
            label: "شارع الإبداع // SCENE 04",
            scope: "Corporate PR & Communications",
            pills: ["PR Architecture", "Crisis Comms", "Flagship Events", "Media Positioning"],
            ar: "استراتيجيات اتصال مؤسسي طويلة الأمد، صناعة الأحداث والفعاليات الكبرى، وإدارة الأزمات والسمعة بأساليب إبداعية ورقمية حديثة.",
            en: "Long-term corporate communications, flagship forum coverage, executive positioning, and modern crisis governance."
        },
        marketing: {
            code: "SCENE 05 // FULL-FUNNEL DIGITAL REACH",
            shortCode: "SCENE 05 · INSPIRATION DIST.",
            img: "../img/studio-2.webp",
            label: "حي الإلهام // SCENE 05",
            scope: "Digital Marketing & Content",
            pills: ["Campaign Strategy", "Social Systems", "Paid Media", "EXOX Synergy"],
            ar: "من البحث وتحديد الهدف إلى بناء السردية وإدارة الحملات الرقمية عبر المنصات بالتكامل مع منظومات 99 الذكية لتحقيق نتائج قابلة للقياس.",
            en: "Research-led digital storytelling and omnichannel campaigns integrated with 99 Tech & EXOX for live performance intelligence."
        }
    };

    let activeScene = "broadcast";
    const dirRows = document.querySelectorAll(".dir-row");
    const dirBgs = document.querySelectorAll(".dir-bg");
    const floatMon = document.getElementById("dir-float-monitor");
    const dfmImg = document.getElementById("dfm-img");
    const dfmCode = document.getElementById("dfm-code");
    const dirIndex = document.querySelector(".director-index");

    const selectScene = (key, withSound = false) => {
        const sc = SCENES[key];
        if (!sc) return;
        const changed = activeScene !== key;
        activeScene = key;
        if (changed && withSound) playCinemaTick(580, 0.04, 0.03);
        const lang = window.currentLang === "en" ? "en" : "ar";

        dirRows.forEach((btn) => {
            const on = btn.getAttribute("data-scene") === key;
            btn.classList.toggle("is-active", on);
            btn.setAttribute("aria-selected", String(on));
        });
        dirBgs.forEach((img) => {
            img.classList.toggle("is-active", img.getAttribute("data-bg") === key);
        });

        if (dfmImg) dfmImg.src = sc.img;
        if (dfmCode) dfmCode.textContent = sc.shortCode;

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

    const dirRowList = Array.from(dirRows);
    dirRowList.forEach((btn, idx) => {
        const k = btn.getAttribute("data-scene");
        btn.addEventListener("click", () => selectScene(k, true));
        if (isFinePointer) btn.addEventListener("pointerenter", () => selectScene(k, true));
        btn.addEventListener("keydown", (e) => {
            if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                e.preventDefault();
                const next = dirRowList[(idx + (e.key === "ArrowDown" ? 1 : -1) + dirRowList.length) % dirRowList.length];
                next.focus();
                selectScene(next.getAttribute("data-scene"), true);
            }
        });
    });

    // Touch-friendly true-color partner toggle on mobile / tablets
    const partnerCards = Array.from(document.querySelectorAll(".royal-laurel"));
    if (!isFinePointer && partnerCards.length) {
        partnerCards.forEach((card) => {
            card.addEventListener("click", () => {
                const wasOn = card.classList.contains("is-colored");
                partnerCards.forEach((c) => c.classList.remove("is-colored"));
                if (!wasOn) card.classList.add("is-colored");
            });
        });
    }

    // On-demand floating monitor animation (0% CPU when not hovering or settled!)
    if (floatMon && dirIndex && isFinePointer && !prefersReducedMotion) {
        let fx = -400, fy = -400, ftx = -400, fty = -400, fTilt = 0, fActive = false, fRaf = null;

        const stepMonitor = () => {
            fRaf = null;
            if (!fActive) return;
            fx += (ftx - fx) * 0.16;
            fy += (fty - fy) * 0.16;
            fTilt *= 0.85;
            floatMon.style.transform = `translate3d(${fx.toFixed(1)}px, ${fy.toFixed(1)}px, 0) rotateZ(${fTilt.toFixed(2)}deg) scale(1)`;
            if (Math.abs(ftx - fx) > 0.4 || Math.abs(fty - fy) > 0.4 || Math.abs(fTilt) > 0.1) {
                fRaf = requestAnimationFrame(stepMonitor);
            }
        };

        dirIndex.addEventListener("pointerenter", (e) => {
            fActive = true;
            const isRtl = document.documentElement.dir === "rtl";
            ftx = isRtl ? Math.max(24, e.clientX - 360) : Math.min(window.innerWidth - 334, e.clientX + 54);
            fty = Math.max(96, Math.min(window.innerHeight - 230, e.clientY - 105));
            fx = ftx; fy = fty;
            floatMon.style.transform = `translate3d(${fx.toFixed(1)}px, ${fy.toFixed(1)}px, 0) scale(1)`;
            floatMon.classList.add("is-shown");
        });
        dirIndex.addEventListener("pointerleave", () => {
            fActive = false;
            floatMon.classList.remove("is-shown");
        });
        dirIndex.addEventListener("pointermove", (e) => {
            const isRtl = document.documentElement.dir === "rtl";
            const nextX = isRtl ? Math.max(24, e.clientX - 360) : Math.min(window.innerWidth - 334, e.clientX + 54);
            fTilt = Math.max(-6, Math.min(6, (nextX - ftx) * 0.14));
            ftx = nextX;
            fty = Math.max(96, Math.min(window.innerHeight - 230, e.clientY - 105));
            if (!fRaf) fRaf = requestAnimationFrame(stepMonitor);
        }, { passive: true });
    }

    document.addEventListener("media:langchange", () => selectScene(activeScene, false));
    selectScene(activeScene, false);

    // ═══════════════════════════════════════════════════════════════════════
    // 9. NAV, LANG TOGGLE, MOBILE DRAWER, REVEALS & WEB3FORMS
    // ═══════════════════════════════════════════════════════════════════════
    const langBtn = document.getElementById("lang-toggle");
    if (langBtn) {
        langBtn.addEventListener("click", () => {
            switchLang(window.currentLang === "ar" ? "en" : "ar");
            playCinemaTick(620, 0.04, 0.03);
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
    const selectScope = (scopeVal, withSound = true) => {
        scopeChips.forEach((c) => {
            c.classList.toggle("is-selected", c.getAttribute("data-scope") === scopeVal);
        });
        if (withSound) playCinemaTick(500, 0.035, 0.025);
        if (scopeInput) scopeInput.value = scopeVal || "Broadcast & Cinema Production";
    };
    scopeChips.forEach((chip) => {
        chip.addEventListener("click", () => {
            selectScope(chip.getAttribute("data-scope") || "Broadcast & Cinema Production", true);
        });
    });

    const briefCta = document.getElementById("brief-cta");
    if (briefCta) {
        briefCta.addEventListener("click", () => {
            const sc = SCENES[activeScene];
            if (sc && sc.scope) selectScope(sc.scope, true);
            const nameInput = document.getElementById("media-name");
            if (nameInput) setTimeout(() => nameInput.focus({ preventScroll: true }), 650);
        });
    }

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
                    playCinemaTick(760, 0.08, 0.04);
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
