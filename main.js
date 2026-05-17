(function () {
    "use strict";

    var root = document.documentElement;
    var canvas = document.getElementById("particles");
    var cursor = document.getElementById("cursorGlow");
    var spotlight = document.getElementById("spotlight");
    var ctx = canvas ? canvas.getContext("2d", { alpha: true }) : null;
    var prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    var particles = [];
    var parallaxItems = [];
    var magneticButtons = [];
    var tiltItems = [];
    var rafId = null;
    var resizeTimer = null;
    var lastParticleFrame = 0;
    var lastPointerAt = 0;
    var scrollY = window.scrollY || 0;
    var scrollDirty = true;

    var mouse = {
        x: window.innerWidth * 0.5,
        y: window.innerHeight * 0.42,
        tx: window.innerWidth * 0.5,
        ty: window.innerHeight * 0.42,
        visible: false
    };

    function clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

    function lerp(start, end, amount) {
        return start + (end - start) * amount;
    }

    function resizeCanvas() {
        if (!canvas || !ctx) {
            return;
        }

        var pixelRatio = Math.min(window.devicePixelRatio || 1, 1.25);
        canvas.width = Math.floor(window.innerWidth * pixelRatio);
        canvas.height = Math.floor(window.innerHeight * pixelRatio);
        canvas.style.width = window.innerWidth + "px";
        canvas.style.height = window.innerHeight + "px";
        ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
        createParticles();
    }

    function createParticles() {
        particles = [];

        var widthFactor = clamp(window.innerWidth / 1440, 0.55, 1);
        var baseCount = window.innerWidth < 720 ? 18 : 34;
        var count = Math.floor(baseCount * widthFactor);

        for (var index = 0; index < count; index += 1) {
            var radius = 0.8 + Math.random() * 2.1;
            particles.push({
                x: Math.random() * window.innerWidth,
                y: Math.random() * window.innerHeight,
                radius: radius,
                vx: (Math.random() - 0.5) * 0.16,
                vy: -(0.08 + Math.random() * 0.2),
                alpha: 0.16 + Math.random() * 0.22,
                drift: Math.random() * Math.PI * 2
            });
        }
    }

    function drawParticles(time) {
        if (!ctx) {
            return;
        }

        ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
        ctx.globalCompositeOperation = "lighter";

        particles.forEach(function (particle) {
            particle.drift += 0.004;
            particle.x += particle.vx + Math.sin(particle.drift) * 0.04;
            particle.y += particle.vy;

            if (particle.y < -16) {
                particle.y = window.innerHeight + 16;
                particle.x = Math.random() * window.innerWidth;
            }

            if (particle.x < -16) {
                particle.x = window.innerWidth + 16;
            } else if (particle.x > window.innerWidth + 16) {
                particle.x = -16;
            }

            var pulse = 0.86 + Math.sin(time * 0.001 + particle.drift) * 0.14;
            ctx.fillStyle = "rgba(255, 50, 50, " + (particle.alpha * pulse).toFixed(3) + ")";
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, particle.radius * pulse, 0, Math.PI * 2);
            ctx.fill();
        });

        ctx.globalCompositeOperation = "source-over";
    }

    function collectMotionTargets() {
        parallaxItems = Array.prototype.slice.call(document.querySelectorAll("[data-parallax]"));
        magneticButtons = Array.prototype.slice.call(document.querySelectorAll(".magnetic"));
        tiltItems = Array.prototype.slice.call(document.querySelectorAll(".tilt"));
    }

    function updateCssMotion() {
        mouse.x = lerp(mouse.x, mouse.tx, 0.05);
        mouse.y = lerp(mouse.y, mouse.ty, 0.05);

        root.style.setProperty("--smooth-x", Math.round(mouse.x) + "px");
        root.style.setProperty("--smooth-y", Math.round(mouse.y) + "px");

        if (cursor) {
            cursor.style.transform = "translate3d(" + Math.round(mouse.x) + "px, " + Math.round(mouse.y) + "px, 0)";
        }

        if (spotlight) {
            var x = (mouse.x / window.innerWidth - 0.5) * 14;
            spotlight.style.transform = "translate3d(" + x + "vw, 0, 0) rotate(" + x * 0.16 + "deg)";
        }
    }

    function updateScrollEffects() {
        if (!scrollDirty) {
            return;
        }

        scrollDirty = false;
        root.style.setProperty("--scroll-depth", scrollY.toFixed(0) + "px");

        parallaxItems.forEach(function (item) {
            var speed = Number(item.getAttribute("data-parallax")) || 0.04;
            var offset = scrollY * speed * -0.28;
            var drift = (mouse.x / window.innerWidth - 0.5) * speed * 22;
            item.style.transform = "translate3d(" + drift.toFixed(1) + "px, " + offset.toFixed(1) + "px, 0)";
        });
    }

    function animate(time) {
        updateCssMotion();
        updateScrollEffects();

        if (time - lastParticleFrame > 33) {
            drawParticles(time || 0);
            lastParticleFrame = time;
        }

        rafId = window.requestAnimationFrame(animate);
    }

    function setupReveal() {
        var reveals = Array.prototype.slice.call(document.querySelectorAll(".reveal"));

        if (!("IntersectionObserver" in window)) {
            reveals.forEach(function (element) {
                element.classList.add("is-visible");
            });
            return;
        }

        var observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add("is-visible");
                    observer.unobserve(entry.target);
                }
            });
        }, {
            threshold: 0.12,
            rootMargin: "0px 0px -6% 0px"
        });

        reveals.forEach(function (element, index) {
            element.style.transitionDelay = Math.min(index % 4, 3) * 60 + "ms";
            observer.observe(element);
        });
    }

    function setupPointer() {
        window.addEventListener("pointermove", function (event) {
            var now = performance.now();

            if (now - lastPointerAt < 32) {
                return;
            }

            lastPointerAt = now;
            mouse.tx = event.clientX;
            mouse.ty = event.clientY;
            mouse.visible = true;
            scrollDirty = true;

            if (cursor) {
                cursor.style.opacity = "1";
            }
        }, { passive: true });

        window.addEventListener("pointerleave", function () {
            mouse.visible = false;

            if (cursor) {
                cursor.style.opacity = "0";
            }
        });

        window.addEventListener("scroll", function () {
            scrollY = window.scrollY || window.pageYOffset || 0;
            scrollDirty = true;
        }, { passive: true });
    }

    function setupTilt() {
        tiltItems.forEach(function (item) {
            var rect = null;
            var lastMove = 0;

            item.addEventListener("pointerenter", function () {
                rect = item.getBoundingClientRect();
            }, { passive: true });

            item.addEventListener("pointermove", function (event) {
                var now = performance.now();

                if (!rect || now - lastMove < 48) {
                    return;
                }

                lastMove = now;

                var localX = event.clientX - rect.left;
                var localY = event.clientY - rect.top;
                var x = (localX / rect.width - 0.5) * 5;
                var y = (localY / rect.height - 0.5) * -5;

                item.style.setProperty("--card-x", localX + "px");
                item.style.setProperty("--card-y", localY + "px");
                item.style.transform = "perspective(900px) rotateX(" + y.toFixed(2) + "deg) rotateY(" + x.toFixed(2) + "deg) translate3d(0, -4px, 0)";
            }, { passive: true });

            item.addEventListener("pointerleave", function () {
                rect = null;
                item.style.transform = "";
                item.style.removeProperty("--card-x");
                item.style.removeProperty("--card-y");
            });
        });
    }

    function setupMagneticButtons() {
        magneticButtons.forEach(function (button) {
            var rect = null;
            var lastMove = 0;

            button.addEventListener("pointerenter", function () {
                rect = button.getBoundingClientRect();
            }, { passive: true });

            button.addEventListener("pointermove", function (event) {
                var now = performance.now();

                if (!rect || now - lastMove < 48) {
                    return;
                }

                lastMove = now;

                var x = (event.clientX - rect.left - rect.width / 2) * 0.14;
                var y = (event.clientY - rect.top - rect.height / 2) * 0.16;
                button.style.transform = "translate3d(" + x.toFixed(1) + "px, " + y.toFixed(1) + "px, 0) scale(1.025)";
            }, { passive: true });

            button.addEventListener("pointerleave", function () {
                rect = null;
                button.style.transform = "";
            });
        });
    }

    function init() {
        collectMotionTargets();
        setupReveal();
       //setupPointer();
       //setupTilt();
        setupMagneticButtons();
        resizeCanvas();
        updateCssMotion();
        updateScrollEffects();

        window.addEventListener("resize", function () {
            window.clearTimeout(resizeTimer);
            resizeTimer = window.setTimeout(function () {
                collectMotionTargets();
                resizeCanvas();
                scrollDirty = true;
            }, 160);
        }, { passive: true });

        if (prefersReducedMotion) {
            drawParticles(0);
            document.querySelectorAll(".reveal").forEach(function (element) {
                element.classList.add("is-visible");
            });
            return;
        }

        //rafId = window.requestAnimationFrame(animate);
    }

    window.addEventListener("beforeunload", function () {
        if (rafId) {
            window.cancelAnimationFrame(rafId);
        }
    });

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
}());
