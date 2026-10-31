(() => {
  'use strict';

  const device = document.getElementById('device');
  const frame = document.getElementById('frame');
  const buy = document.getElementById('buyThis');
  const mobile = window.matchMedia('(max-width: 600px)');

  function fit() {
    if (mobile.matches) {
      device.style.removeProperty('--demo-scale');
      return;
    }
    const scale = Math.min(1, (window.innerHeight - 90) / 654, (window.innerWidth - 40) / 318);
    device.style.setProperty('--demo-scale', String(Math.max(0.45, scale)));
  }

  let frameId = 0;
  function scheduleFit() {
    window.cancelAnimationFrame(frameId);
    frameId = window.requestAnimationFrame(fit);
  }

  window.addEventListener('resize', scheduleFit);
  window.addEventListener('orientationchange', scheduleFit);
  fit();

  buy.addEventListener('click', () => {
    try {
      if (frame.contentWindow && typeof frame.contentWindow.openBookingModal === 'function') {
        frame.contentWindow.openBookingModal();
      } else {
        frame.src = './card.html?book=1';
      }
    } catch (error) {
      frame.src = './card.html?book=1';
    }
  });
})();
