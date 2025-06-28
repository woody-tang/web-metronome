export function isDesktop() {
    const ua = navigator.userAgent;
    const width = window.innerWidth;
    const isMobile = /Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua);
    const isTablet = /Tablet|iPad|PlayBook|Silk|Android(?!.*Mobile)/i.test(ua) ||
        (width >= 600 && width <= 1024 && ('ontouchstart' in window || navigator.maxTouchPoints > 0));
    return !isMobile && !isTablet;
}
// #TODO:现在的这个不准