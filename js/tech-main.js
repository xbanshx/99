document.addEventListener("DOMContentLoaded", () => {

    // 1. VANTA.JS 3D BACKGROUND INIT (OPTIMIZED)
    if (window.VANTA && window.VANTA.NET) {
        try {
            VANTA.NET({
                el: "#vanta-bg",
                mouseControls: true,
                touchControls: true,
                gyroControls: false,
                minHeight: 200.00,
                minWidth: 200.00,
                scale: 1.00,
                scaleMobile: 1.00,
                color: 0x3b82f6,
                backgroundColor: 0x07070a,
                points: 10.00,
                maxDistance: 20.00,
                spacing: 18.00,
                showDots: true
            });
        } catch (e) {
            // Fallback silently if WebGL is unavailable
        }
    }

    // 2. STICKY HEADER & ACTIVE SECTION NAV
    const siteHeader = document.querySelector(".site-header");
    const updateHeader = () => {
        if (siteHeader) {
            siteHeader.classList.toggle("scrolled", window.scrollY > 24);
        }
    };
    window.addEventListener("scroll", updateHeader, { passive: true });
    updateHeader();

    const navLinks = document.querySelectorAll(".nav-links a");
    if ("IntersectionObserver" in window && navLinks.length > 0) {
        const navObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const id = entry.target.getAttribute("id");
                    navLinks.forEach(link => {
                        link.classList.toggle("active", link.getAttribute("href") === `#${id}`);
                    });
                }
            });
        }, { rootMargin: "-40% 0px -50% 0px" });

        ["tech-services", "tech-works", "tech-process", "tech-about", "tech-contact"].forEach(id => {
            const el = document.getElementById(id);
            if (el) navObserver.observe(el);
        });
    }

    // 3. SPOTLIGHT CURSOR TRACKING ON CARDS
    document.querySelectorAll(".spotlight").forEach(card => {
        card.addEventListener("pointermove", (e) => {
            const rect = card.getBoundingClientRect();
            card.style.setProperty("--mx", `${e.clientX - rect.left}px`);
            card.style.setProperty("--my", `${e.clientY - rect.top}px`);
        });
    });

    if (typeof window.gsap !== "undefined" && typeof window.ScrollTrigger !== "undefined") {
        gsap.registerPlugin(ScrollTrigger);

        // 4. MAGNETIC BUTTONS
        const magneticBtns = document.querySelectorAll(".magnetic-btn");
        magneticBtns.forEach(btn => {
            btn.addEventListener("mousemove", (e) => {
                const rect = btn.getBoundingClientRect();
                const x = (e.clientX - rect.left) - (rect.width / 2);
                const y = (e.clientY - rect.top) - (rect.height / 2);

                gsap.to(btn, { x: x * 0.25, y: y * 0.25, duration: 0.35, ease: "power2.out", overwrite: true });

                const text = btn.querySelector(".btn-text");
                if (text) {
                    gsap.to(text, { x: x * 0.12, y: y * 0.12, duration: 0.35, ease: "power2.out", overwrite: true });
                }
            });

            btn.addEventListener("mouseleave", () => {
                gsap.to(btn, { x: 0, y: 0, duration: 0.65, ease: "elastic.out(1, 0.3)" });
                const text = btn.querySelector(".btn-text");
                if (text) gsap.to(text, { x: 0, y: 0, duration: 0.65, ease: "elastic.out(1, 0.3)" });
            });
        });

        // 5. HERO REVEAL
        setTimeout(() => {
            const heroHidden = document.querySelectorAll("#tech-hero .hidden");
            if (heroHidden.length > 0) {
                gsap.fromTo(heroHidden,
                    { opacity: 0, y: 28 },
                    {
                        opacity: 1,
                        y: 0,
                        duration: 0.75,
                        stagger: 0.12,
                        ease: "power2.out",
                        onComplete: () => {
                            heroHidden.forEach(el => {
                                el.classList.remove("hidden");
                                gsap.set(el, { clearProps: "opacity,transform" });
                            });
                        }
                    }
                );
            }
        }, 80);

        // 6. SECTION & CARD REVEALS
        const restHidden = gsap.utils.toArray("section:not(#tech-hero) .hidden");
        if (restHidden.length > 0) {
            ScrollTrigger.batch(restHidden, {
                start: "top 88%",
                onEnter: (elements) => {
                    gsap.fromTo(elements,
                        { opacity: 0, y: 36 },
                        {
                            opacity: 1,
                            y: 0,
                            duration: 0.6,
                            stagger: 0.08,
                            ease: "power2.out",
                            overwrite: true,
                            onComplete: () => {
                                elements.forEach(el => {
                                    el.classList.remove("hidden");
                                    gsap.set(el, { clearProps: "opacity,transform" });
                                });
                            }
                        }
                    );
                },
                once: true
            });
        }
    } else {
        document.querySelectorAll(".hidden").forEach(el => el.classList.remove("hidden"));
    }

    // 7. Web3Forms AJAX Handler for Tech Contact Form
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
