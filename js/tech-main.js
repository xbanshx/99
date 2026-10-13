document.addEventListener("DOMContentLoaded", () => {
    
    // 1. VANTA.JS 3D BACKGROUND INIT (OPTIMIZED)
    if (window.VANTA && window.VANTA.NET) {
        VANTA.NET({
            el: "#vanta-bg",
            mouseControls: true,
            touchControls: true,
            gyroControls: false,
            minHeight: 200.00,
            minWidth: 200.00,
            scale: 1.00,
            scaleMobile: 1.00,
            color: 0x3b82f6, // Accent blue
            backgroundColor: 0x07070a, // Dark BG
            points: 10.00, // Reduced from 15 to 10 for better performance
            maxDistance: 20.00,
            spacing: 18.00,
            showDots: true
        });
    }

    gsap.registerPlugin(ScrollTrigger);

    // 2. MAGNETIC BUTTONS (Premium UI Touch)
    const magneticBtns = document.querySelectorAll('.magnetic-btn');
    magneticBtns.forEach(btn => {
        btn.addEventListener('mousemove', (e) => {
            const rect = btn.getBoundingClientRect();
            const x = (e.clientX - rect.left) - (rect.width / 2);
            const y = (e.clientY - rect.top) - (rect.height / 2);
            
            gsap.to(btn, { x: x * 0.3, y: y * 0.3, duration: 0.4, ease: "power2.out", overwrite: true });
            
            const text = btn.querySelector('.btn-text');
            if (text) {
                gsap.to(text, { x: x * 0.15, y: y * 0.15, duration: 0.4, ease: "power2.out", overwrite: true });
            }
        });

        btn.addEventListener('mouseleave', () => {
            gsap.to(btn, { x: 0, y: 0, duration: 0.7, ease: "elastic.out(1, 0.3)" });
            const text = btn.querySelector('.btn-text');
            if (text) gsap.to(text, { x: 0, y: 0, duration: 0.7, ease: "elastic.out(1, 0.3)" });
        });
    });

    // 3. HERO TEXT REVEAL
    setTimeout(() => {
        gsap.fromTo("#tech-hero .hidden", 
            { opacity: 0, y: 30 },
            { 
                opacity: 1, y: 0, duration: 0.8, stagger: 0.15, ease: 'power2.out',
                onComplete: () => {
                    document.querySelectorAll("#tech-hero .hidden").forEach(el => el.classList.remove("hidden"));
                }
            }
        );
    }, 100);

    // 4. CIRCUIT SVG DRAWING ANIMATION
    const circuitPath = document.getElementById("circuit-path");
    if (circuitPath) {
        const pathLength = circuitPath.getTotalLength();
        circuitPath.style.strokeDasharray = pathLength;
        circuitPath.style.strokeDashoffset = pathLength;

        gsap.to(circuitPath, {
            strokeDashoffset: 0,
            ease: "none",
            scrollTrigger: {
                trigger: "body",
                start: "top top",
                end: "bottom bottom",
                scrub: 1
            }
        });
    }

    // 5. SERVICES GRID REVEAL (Fast & Smooth like Media Page)
    const techCards = gsap.utils.toArray(".tech-card");
    if (techCards.length > 0) {
        ScrollTrigger.batch(techCards, {
            start: "top 85%",
            onEnter: (elements) => {
                gsap.fromTo(elements, 
                    { opacity: 0, y: 50, scale: 0.95 },
                    {
                        opacity: 1,
                        y: 0,
                        scale: 1,
                        duration: 0.6,
                        stagger: 0.1,
                        ease: "power2.out",
                        overwrite: true,
                        onComplete: () => elements.forEach(el => el.classList.remove("hidden"))
                    }
                );
            },
            once: true
        });
    }

    // 6. STATS REVEAL & COUNTER
    const statsSection = document.getElementById("tech-about");
    if (statsSection) {
        gsap.fromTo("#tech-about .hidden:not(.stat)",
            { opacity: 0, y: 40 },
            {
                scrollTrigger: { trigger: "#tech-about", start: "top 80%" },
                opacity: 1, y: 0, duration: 0.8, stagger: 0.15, ease: "power2.out",
                onComplete: () => {
                    document.querySelectorAll("#tech-about .hidden:not(.stat)").forEach(el => el.classList.remove("hidden"));
                }
            }
        );

        const stats = gsap.utils.toArray(".stat");
        if (stats.length > 0) {
            ScrollTrigger.batch(stats, {
                start: "top 85%",
                onEnter: (elements) => {
                    gsap.fromTo(elements,
                        { opacity: 0, scale: 0.9, y: 30 },
                        {
                            opacity: 1, scale: 1, y: 0, duration: 0.6, stagger: 0.1, ease: "back.out(1.2)",
                            onComplete: () => elements.forEach(el => el.classList.remove("hidden"))
                        }
                    );

                    elements.forEach(stat => {
                        const numberEl = stat.querySelector(".stat-number");
                        if (!numberEl) return;
                        const text = numberEl.textContent.trim();
                        const hasPlus = text.includes("+");
                        const num = parseInt(text.replace(/[^0-9]/g, ""));
                        
                        if (!isNaN(num)) {
                            gsap.fromTo(numberEl, 
                                { textContent: 0 },
                                {
                                    textContent: num, duration: 2, ease: "power1.out", snap: { textContent: 1 },
                                    onUpdate: function() { numberEl.textContent = (hasPlus ? "+" : "") + Math.round(gsap.getProperty(numberEl, "textContent")); }
                                }
                            );
                        }
                    });
                },
                once: true
            });
        }
    }

    // 7. CONTACT FORM REVEAL
    const contactElements = gsap.utils.toArray("#tech-contact .hidden");
    if (contactElements.length > 0) {
        gsap.fromTo(contactElements,
            { opacity: 0, y: 30 },
            {
                scrollTrigger: { trigger: "#tech-contact", start: "top 85%" },
                opacity: 1, y: 0, duration: 0.6, stagger: 0.1, ease: "power2.out",
                onComplete: () => contactElements.forEach(el => el.classList.remove("hidden"))
            }
        );
    }

    // 8. Web3Forms AJAX Handler for Tech Contact Form
    const techForm = document.getElementById("tech-form");
    if (techForm) {
        techForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const statusDiv = techForm.querySelector(".form-status");
            const submitBtn = techForm.querySelector("button[type='submit'], .btn");
            const btnTextSpan = submitBtn ? submitBtn.querySelector(".btn-text") : null;
            const originalBtnText = btnTextSpan ? btnTextSpan.textContent : (submitBtn ? submitBtn.textContent : "");

            const nameInput = techForm.querySelector("#tech-name");
            const emailInput = techForm.querySelector("#tech-email");
            const messageInput = techForm.querySelector("#tech-message");
            const botcheck = techForm.querySelector('input[name="botcheck"]');

            if (botcheck && botcheck.checked) return;

            const isEn = (document.documentElement.lang === "en");

            if (!nameInput.value.trim() || !emailInput.value.trim() || !messageInput.value.trim()) {
                if (statusDiv) {
                    statusDiv.style.display = "block";
                    statusDiv.style.color = "var(--color-pink)";
                    statusDiv.textContent = isEn ? "Please fill in all required fields." : "يرجى تعبئة جميع الحقول المطلوبة.";
                }
                return;
            }

            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(emailInput.value.trim())) {
                if (statusDiv) {
                    statusDiv.style.display = "block";
                    statusDiv.style.color = "var(--color-pink)";
                    statusDiv.textContent = isEn ? "Please enter a valid email address." : "يرجى إدخال بريد إلكتروني صحيح.";
                }
                return;
            }

            if (btnTextSpan) btnTextSpan.textContent = isEn ? "Sending..." : "جاري الإرسال...";
            else if (submitBtn) submitBtn.textContent = isEn ? "Sending..." : "جاري الإرسال...";
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.style.opacity = "0.7";
            }
            if (statusDiv) statusDiv.style.display = "none";

            const formData = new FormData(techForm);
            const object = Object.fromEntries(formData);
            const json = JSON.stringify(object);

            try {
                const response = await fetch("https://api.web3forms.com/submit", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Accept": "application/json"
                    },
                    body: json
                });
                const result = await response.json();
                if (response.status === 200 && result.success) {
                    techForm.reset();
                    if (statusDiv) {
                        statusDiv.style.display = "block";
                        statusDiv.style.color = "var(--color-cyan)";
                        statusDiv.textContent = isEn ? "Your message has been sent successfully! We will contact you soon." : "تم إرسال رسالتك بنجاح! سنتواصل معك قريباً.";
                    }
                } else {
                    throw new Error(result.message || "Submission failed");
                }
            } catch (err) {
                if (statusDiv) {
                    statusDiv.style.display = "block";
                    statusDiv.style.color = "var(--color-pink)";
                    statusDiv.textContent = isEn ? "Failed to send. Please try again or contact us at Info@i99.sa." : "حدث خطأ أثناء الإرسال. يرجى المحاولة لاحقاً أو مراسلتنا عبر Info@i99.sa.";
                }
            } finally {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.style.opacity = "1";
                    if (btnTextSpan) btnTextSpan.textContent = originalBtnText;
                    else submitBtn.textContent = originalBtnText;
                }
            }
        });
    }
});
