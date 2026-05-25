(function () {
    "use strict";

    var prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var canHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    var resizeTimer = null;

    function setupReveal() {
        var reveals = Array.prototype.slice.call(document.querySelectorAll(".reveal"));

        if (prefersReducedMotion || !("IntersectionObserver" in window)) {
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
            threshold: 0.1,
            rootMargin: "0px 0px -8% 0px"
        });

        reveals.forEach(function (element, index) {
            element.style.transitionDelay = Math.min(index % 3, 2) * 50 + "ms";
            observer.observe(element);
        });
    }

    function setupMagneticButtons() {
        if (!canHover || prefersReducedMotion) {
            return;
        }

        Array.prototype.forEach.call(document.querySelectorAll(".magnetic"), function (button) {
            var rect = null;
            var frame = null;
            var nextX = 0;
            var nextY = 0;

            function applyTransform() {
                frame = null;
                button.style.transform = "translate3d(" + nextX.toFixed(1) + "px, " + nextY.toFixed(1) + "px, 0) scale(1.02)";
            }

            button.addEventListener("pointerenter", function () {
                rect = button.getBoundingClientRect();
            }, { passive: true });

            button.addEventListener("pointermove", function (event) {
                if (!rect) {
                    return;
                }

                nextX = (event.clientX - rect.left - rect.width / 2) * 0.1;
                nextY = (event.clientY - rect.top - rect.height / 2) * 0.12;

                if (!frame) {
                    frame = window.requestAnimationFrame(applyTransform);
                }
            }, { passive: true });

            button.addEventListener("pointerleave", function () {
                rect = null;
                if (frame) {
                    window.cancelAnimationFrame(frame);
                    frame = null;
                }
                button.style.transform = "";
            }, { passive: true });
        });
    }

    function setViewportHeight() {
        document.documentElement.style.setProperty("--app-height", window.innerHeight + "px");
    }

    function init() {
        setViewportHeight();
        setupReveal();
        setupMagneticButtons();

        window.addEventListener("resize", function () {
            window.clearTimeout(resizeTimer);
            resizeTimer = window.setTimeout(setViewportHeight, 120);
        }, { passive: true });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init, { once: true });
    } else {
        init();
    }
}());
