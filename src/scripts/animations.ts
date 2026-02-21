/**
 * AMG Sneakers — animations.ts
 * Central animation controller. Imported once in Layout.astro.
 * Uses only native browser APIs: IntersectionObserver, requestAnimationFrame, MutationObserver.
 */

// ═══════════════════════════════════════════════════════
// 1. SCROLL REVEAL — Intersection Observer
// ═══════════════════════════════════════════════════════
function initScrollReveal() {
    const revealEls = document.querySelectorAll<HTMLElement>('.reveal');
    if (!revealEls.length) return;

    const observer = new IntersectionObserver(
        (entries) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) return;
                const el = entry.target as HTMLElement;
                const delay = parseInt(el.dataset.revealDelay || '0', 10);

                setTimeout(() => {
                    el.classList.add('is-visible');
                }, delay);

                observer.unobserve(el);
            });
        },
        { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
    );

    revealEls.forEach((el) => observer.observe(el));
}

// ═══════════════════════════════════════════════════════
// 2. NUMBER COUNTERS — rAF-based ease-out counting
// ═══════════════════════════════════════════════════════
function animateCounter(el: HTMLElement, target: number, suffix: string, duration = 1200) {
    const start = performance.now();

    function step(now: number) {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        // ease-out cubic
        const eased = 1 - Math.pow(1 - progress, 3);
        const current = Math.round(eased * target);
        el.textContent = current + suffix;
        if (progress < 1) requestAnimationFrame(step);
    }

    requestAnimationFrame(step);
}

function initCounters() {
    const counterEls = document.querySelectorAll<HTMLElement>('[data-counter-target]');
    if (!counterEls.length) return;

    const observer = new IntersectionObserver(
        (entries) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) return;
                const el = entry.target as HTMLElement;
                const target = parseInt(el.dataset.counterTarget || '0', 10);
                const suffix = el.dataset.counterSuffix || '';
                animateCounter(el, target, suffix);
                observer.unobserve(el);
            });
        },
        { threshold: 0.4 }
    );

    counterEls.forEach((el) => observer.observe(el));
}

// ═══════════════════════════════════════════════════════
// 3. "CÓMO FUNCIONA" STEP CIRCLES
// ═══════════════════════════════════════════════════════
function initStepCircles() {
    const circles = document.querySelectorAll<HTMLElement>('.anim-step-circle');
    if (!circles.length) return;

    const observer = new IntersectionObserver(
        (entries) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) return;
                const el = entry.target as HTMLElement;
                const idx = parseInt(el.dataset.stepIdx || '0', 10);
                el.style.animationDelay = `${idx * 120}ms`;
                el.classList.add('running');
                observer.unobserve(el);
            });
        },
        { threshold: 0.3 }
    );

    circles.forEach((el) => observer.observe(el));
}

// ═══════════════════════════════════════════════════════
// 4. SCROLL-SPY — active nav link indicator
// ═══════════════════════════════════════════════════════
function initScrollSpy() {
    const navEl = document.querySelector<HTMLElement>('nav[aria-label="Navegación principal"]');
    const indicator = document.getElementById('nav-indicator');
    if (!navEl || !indicator) return;

    const navLinks = Array.from(navEl.querySelectorAll<HTMLAnchorElement>('a'));
    if (!navLinks.length) return;

    // Attach indicator to the nav's positioning context
    navEl.style.position = 'relative';
    navEl.appendChild(indicator);

    function setActive(link: HTMLAnchorElement | null) {
        if (!link) {
            indicator!.style.opacity = '0';
            return;
        }
        const linkRect = link.getBoundingClientRect();
        const navRect = navEl!.getBoundingClientRect();
        indicator!.style.left = `${linkRect.left - navRect.left}px`;
        indicator!.style.width = `${linkRect.width}px`;
        indicator!.style.opacity = '1';
    }

    // Check which section is active based on scroll position
    const sectionIds = ['hero', 'productos', 'como-funciona', 'manifesto'];

    function updateActive() {
        let activeIdx = -1;
        sectionIds.forEach((id, i) => {
            const section = document.getElementById(id);
            if (!section) return;
            const rect = section.getBoundingClientRect();
            if (rect.top <= 120) activeIdx = i;
        });

        if (activeIdx >= 0 && navLinks[activeIdx]) {
            setActive(navLinks[Math.min(activeIdx, navLinks.length - 1)]);
        } else {
            setActive(null);
        }
    }

    window.addEventListener('scroll', updateActive, { passive: true });
    updateActive();
}

// ═══════════════════════════════════════════════════════
// 5. WHATSAPP FLOAT — delayed entry + pulse
// ═══════════════════════════════════════════════════════
function initWhatsAppFloat() {
    const wa = document.getElementById('whatsapp-float');
    if (!wa) return;

    setTimeout(() => {
        wa.classList.add('wa-ready');
    }, 2000);
}

// ═══════════════════════════════════════════════════════
// 6. CART BADGE POP — observe DOM mutations on count
// ═══════════════════════════════════════════════════════
function initCartBadge() {
    const badge = document.getElementById('cart-count');
    if (!badge) return;

    let lastCount = badge.textContent?.trim() || '0';

    const mutObs = new MutationObserver(() => {
        const newCount = badge.textContent?.trim() || '0';
        if (newCount !== lastCount) {
            lastCount = newCount;
            badge.classList.remove('badge-pop');
            // Force reflow
            void badge.offsetWidth;
            badge.classList.add('badge-pop');
        }
    });

    mutObs.observe(badge, { characterData: true, childList: true, subtree: true });
}

// ═══════════════════════════════════════════════════════
// 7. PRODUCT GALLERY CROSSFADE
// ═══════════════════════════════════════════════════════
function initGalleryCrossfade() {
    const mainImg = document.getElementById('main-product-image') as HTMLImageElement | null;
    const thumbBtns = document.querySelectorAll<HTMLElement>('.thumb-btn');
    if (!mainImg || !thumbBtns.length) return;

    thumbBtns.forEach((btn) => {
        btn.addEventListener('click', () => {
            const src = btn.dataset.src;
            if (!src || src === mainImg.src) return;

            // Fade out
            mainImg.classList.add('main-img-fade-out');
            mainImg.classList.remove('main-img-fade-in');

            setTimeout(() => {
                mainImg.src = src;
                // Fade in
                mainImg.classList.remove('main-img-fade-out');
                mainImg.classList.add('main-img-fade-in');

                // Update active thumbnail border
                thumbBtns.forEach((b) => {
                    b.classList.remove('border-[#16A34A]');
                    b.classList.add('border-[#2A2A2A]');
                });
                btn.classList.add('border-[#16A34A]');
                btn.classList.remove('border-[#2A2A2A]');
            }, 150);
        });
    });
}

// ═══════════════════════════════════════════════════════
// 8. SIZE SELECTOR — selection flash + shake for OOS
// ═══════════════════════════════════════════════════════
function initSizeSelector() {
    const sButtons = document.querySelectorAll<HTMLElement>('.s-selector');
    if (!sButtons.length) return;

    sButtons.forEach((btn) => {
        btn.addEventListener('click', () => {
            // If marked out of stock, shake
            if (btn.dataset.oos === 'true') {
                btn.classList.remove('shake');
                void btn.offsetWidth;
                btn.classList.add('shake');
                btn.addEventListener('animationend', () => btn.classList.remove('shake'), { once: true });
                return;
            }

            // Normal selection — brief green border pulse
            sButtons.forEach((b) => {
                b.style.transition = 'background 150ms ease, border-color 150ms ease, color 150ms ease';
            });
        });
    });
}

// ═══════════════════════════════════════════════════════
// 9. ADD-TO-CART BUTTON — loading state
// ═══════════════════════════════════════════════════════
function initAddToCart() {
    const btn = document.getElementById('add-to-cart-action');
    if (!btn) return;

    const originalHTML = btn.innerHTML;

    btn.addEventListener('click', () => {
        if (btn.classList.contains('loading')) return;
        btn.classList.add('loading');
        btn.innerHTML = '<span class="btn-spinner"></span>';
        btn.setAttribute('disabled', 'true');

        setTimeout(() => {
            btn.classList.remove('loading');
            btn.innerHTML = originalHTML;
            btn.removeAttribute('disabled');
        }, 800);
    });
}

// ═══════════════════════════════════════════════════════
// 10. CART ITEM REMOVE — slide out animation
// ═══════════════════════════════════════════════════════
// Note: cart items are rendered via JS in CartDrawer.
// We patch removeFromCart behavior via event delegation.
function initCartItemRemove() {
    const content = document.getElementById('cart-content');
    if (!content) return;

    content.addEventListener('click', (e) => {
        const btn = (e.target as Element).closest('.remove-item-btn');
        if (!btn) return;
        const row = btn.closest('.flex.gap-3\\.5') as HTMLElement | null;
        if (!row) return;
        row.style.transition = 'opacity 250ms ease, transform 250ms ease, max-height 250ms ease, padding 250ms ease';
        row.style.maxHeight = row.scrollHeight + 'px';
        // Trigger animation
        requestAnimationFrame(() => {
            row.style.opacity = '0';
            row.style.transform = 'translateX(24px)';
            row.style.maxHeight = '0';
            row.style.paddingTop = '0';
            row.style.paddingBottom = '0';
        });
    });
}

// ═══════════════════════════════════════════════════════
// BOOT
// ═══════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
    initScrollReveal();
    initCounters();
    initStepCircles();
    initScrollSpy();
    initWhatsAppFloat();
    initCartBadge();
    initGalleryCrossfade();
    initSizeSelector();
    initAddToCart();
    initCartItemRemove();
});
