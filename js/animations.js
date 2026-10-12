// Wait for DOM
document.addEventListener("DOMContentLoaded", () => {
    gsap.registerPlugin(ScrollTrigger);

    // Partner Logos - ScrollTrigger Stagger
    gsap.fromTo(".gsap-logo",
        { y: 30, opacity: 0 },
        {
            scrollTrigger: {
                trigger: "#partners-section",
                start: "top 80%",
                toggleActions: "play none none none"
            },
            y: 0,
            opacity: 1,
            duration: 0.5,
            stagger: 0.08,
            ease: "power2.out"
        }
    );
});
