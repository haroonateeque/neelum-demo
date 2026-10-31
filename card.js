(() => {
  'use strict';

  const DATA = window.NEELUM;
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  const state = {
    lang: 'en',
    scaleIndex: 0,
    opened: false,
    muted: false,
    scratch: [false, false, false],
    scratchLocked: false,
    scratchComplete: false,
    name: '',
    message: '',
    rsvp: {},
    reduceMotion: reduceMotion.matches,
  };

  const els = {
    gate: $('#gate'),
    seal: $('#openSeal'),
    controls: $('#topControls'),
    bottom: $('#bottomActions'),
    music: $('#musicToggle'),
    audio: $('#music'),
    textToggle: $('#textToggle'),
    langToggle: $('#langToggle'),
    heroDate: $('#heroDate'),
    scrollDown: $('#scrollDown'),
    scratchSection: $('#scratchSection'),
    scratchCircles: $$('.scratch-circle'),
    scratchProgress: $('#scratchProgress'),
    revealAll: $('#revealAll'),
    scratchContinue: $('#scratchContinue'),
    continueBtn: $('#continueBtn'),
    eventList: $('#eventList'),
    scheduleList: $('#scheduleList'),
    attireList: $('#attireList'),
    rsvpEvents: $('#rsvpEvents'),
    rsvpForm: $('#rsvpForm'),
    guestName: $('#guestName'),
    guestMessage: $('#guestMessage'),
    formStatus: $('#formStatus'),
    bookingModal: $('#bookingModal'),
    bookingForm: $('#bookingForm'),
    bookingStatus: $('#bookingStatus'),
    bookBtn: $('#bookBtn'),
    closeBooking: $('#closeBooking'),
  };

  const scales = [1, 1.08, 1.16];

  function t(key) {
    return (DATA.i18n[state.lang] && DATA.i18n[state.lang][key]) || DATA.i18n.en[key] || key;
  }

  function eventText(event, key) {
    return (event[state.lang] && event[state.lang][key]) || event.en[key] || '';
  }

  function init() {
    DATA.events.forEach((event) => {
      state.rsvp[event.id] = { attending: true, guests: 2 };
    });

    els.heroDate.textContent = DATA.couple.dateLabel[state.lang];
    bindStatic();
    renderDynamic();
    applyLanguage(state.lang, { rerender: false });
    setupScratch();
    setupReveal();
    updateCountdown();
    window.setInterval(updateCountdown, 30000);
    updateMusicButton();

    if (new URLSearchParams(window.location.search).get('book') === '1') {
      window.setTimeout(openBookingModal, 500);
    }
  }

  function bindStatic() {
    els.seal.addEventListener('click', openCard);
    els.gate.addEventListener('click', (event) => {
      if (event.target === els.gate || event.target.closest('.envelope')) {
        openCard();
      }
    });
    els.scrollDown.addEventListener('click', () => {
      $('#invitation').scrollIntoView({ behavior: state.reduceMotion ? 'auto' : 'smooth', block: 'start' });
    });
    els.music.addEventListener('click', toggleMusic);
    els.textToggle.addEventListener('click', cycleTextSize);
    els.langToggle.addEventListener('click', () => applyLanguage(state.lang === 'en' ? 'ur' : 'en'));
    els.revealAll.addEventListener('click', revealAll);
    els.continueBtn.addEventListener('click', unlockAfterScratch);
    els.rsvpForm.addEventListener('submit', submitRsvp);
    els.guestName.addEventListener('input', () => { state.name = els.guestName.value; });
    els.guestMessage.addEventListener('input', () => { state.message = els.guestMessage.value; });
    els.bookBtn.addEventListener('click', openBookingModal);
    els.closeBooking.addEventListener('click', closeBookingModal);
    els.bookingModal.addEventListener('click', (event) => {
      if (event.target.closest('[data-close-modal]')) closeBookingModal();
    });
    els.bookingForm.addEventListener('submit', submitBooking);
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && !els.bookingModal.hidden) closeBookingModal();
    });

    window.addEventListener('scroll', checkScratchGate, { passive: true });
    window.addEventListener('resize', () => {
      sizeScratchCanvases();
      checkScratchGate();
    });

    if (typeof reduceMotion.addEventListener === 'function') {
      reduceMotion.addEventListener('change', (event) => {
        state.reduceMotion = event.matches;
      });
    }
  }

  function openCard() {
    if (state.opened) return;
    state.opened = true;
    els.gate.classList.add('is-opening');
    window.setTimeout(() => {
      els.gate.hidden = true;
      document.body.classList.remove('is-locked');
      els.controls.hidden = false;
      els.bottom.hidden = false;
      window.scrollTo({ top: 0, behavior: 'auto' });
      startMusic();
      checkScratchGate();
      window.setTimeout(checkScratchGate, 700);
    }, state.reduceMotion ? 150 : 1150);
  }

  function startMusic() {
    if (state.muted) return;
    els.audio.volume = 0.32;
    const promise = els.audio.play();
    if (promise && promise.catch) {
      promise.catch(() => {
        state.muted = true;
        updateMusicButton();
      });
    }
    updateMusicButton();
  }

  function toggleMusic() {
    if (els.audio.paused) {
      state.muted = false;
      const promise = els.audio.play();
      if (promise && promise.catch) {
        promise.catch(() => {
          state.muted = true;
          updateMusicButton();
        });
      }
    } else {
      state.muted = true;
      els.audio.pause();
    }
    updateMusicButton();
  }

  function updateMusicButton() {
    const playing = !els.audio.paused && !state.muted;
    els.music.setAttribute('aria-pressed', String(playing));
    els.music.setAttribute('aria-label', playing ? 'Turn the music off' : 'Turn the music on');
  }

  function cycleTextSize() {
    state.scaleIndex = (state.scaleIndex + 1) % scales.length;
    const scale = scales[state.scaleIndex];
    document.documentElement.style.fontSize = `${16 * scale}px`;
    els.textToggle.setAttribute('aria-label', `Text size ${Math.round(scale * 100)} percent`);
    els.textToggle.title = `Text size ${Math.round(scale * 100)}%`;
    sizeScratchCanvases();
  }

  function applyLanguage(lang, options = {}) {
    state.lang = lang === 'ur' ? 'ur' : 'en';
    document.documentElement.lang = state.lang;
    document.documentElement.dir = state.lang === 'ur' ? 'rtl' : 'ltr';
    document.body.classList.toggle('lang-ur', state.lang === 'ur');
    els.langToggle.textContent = state.lang === 'en' ? 'اردو' : 'EN';
    els.langToggle.setAttribute('aria-label', state.lang === 'en' ? 'Switch to Urdu' : 'Switch to English');

    $$('[data-i18n]').forEach((node) => {
      const key = node.getAttribute('data-i18n');
      if (key) node.textContent = t(key);
    });

    $$('[data-i18n-placeholder]').forEach((node) => {
      const key = node.getAttribute('data-i18n-placeholder');
      if (key) node.setAttribute('placeholder', t(key));
    });

    $$('[data-i18n-aria]').forEach((node) => {
      const key = node.getAttribute('data-i18n-aria');
      if (key) node.setAttribute('aria-label', t(key));
    });

    els.heroDate.textContent = DATA.couple.dateLabel[state.lang];

    if (options.rerender !== false) {
      renderDynamic();
    }

    if (els.bookingModal && !els.bookingModal.hidden) {
      renderBookingCopy();
    }
  }

  function renderDynamic() {
    const nameValue = els.guestName ? els.guestName.value : state.name;
    const messageValue = els.guestMessage ? els.guestMessage.value : state.message;
    state.name = nameValue;
    state.message = messageValue;

    renderEvents();
    renderSchedule();
    renderAttire();
    renderRsvp();
    setupReveal();
    sizeScratchCanvases();
  }

  function renderEvents() {
    els.eventList.innerHTML = DATA.events.map((event) => {
      const copy = event[state.lang] || event.en;
      const googleUrl = buildGoogleCalendarUrl(event);
      return `
        <article class="event-card reveal" data-event="${event.id}">
          <p class="event-card__day">${escapeHtml(copy.day)}</p>
          <h3>${escapeHtml(copy.title)}</h3>
          <p class="event-card__venue">${escapeHtml(copy.venue)}</p>
          <p class="event-card__address">${escapeHtml(copy.address)}</p>
          <p class="event-card__date">${escapeHtml(copy.date)}</p>
          <p class="event-card__time">${escapeHtml(copy.time)}</p>
          ${copy.note ? `<p class="event-card__note">${escapeHtml(copy.note)}</p>` : ''}
          <div class="event-card__actions">
            <a class="event-link" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.map)}" target="_blank" rel="noopener">${escapeHtml(t('maps'))}</a>
            <details class="cal">
              <summary>${escapeHtml(t('addToCalendar'))}</summary>
              <div class="cal__menu">
                <a href="${googleUrl}" target="_blank" rel="noopener">${escapeHtml(t('googleCalendar'))}</a>
                <a href="#" data-ics="${event.id}">${escapeHtml(t('appleCalendar'))}</a>
              </div>
            </details>
          </div>
        </article>
      `;
    }).join('');

    $$('[data-ics]', els.eventList).forEach((link) => {
      link.addEventListener('click', (event) => {
        event.preventDefault();
        const eventData = DATA.events.find((item) => item.id === link.dataset.ics);
        if (eventData) downloadIcs(eventData);
        const details = link.closest('details');
        if (details) details.open = false;
      });
    });
  }

  function renderSchedule() {
    els.scheduleList.innerHTML = DATA.schedule.map((day) => {
      const copy = day[state.lang] || day.en;
      return `
        <section class="day-block reveal">
          <h3>${escapeHtml(copy.title)}</h3>
          <p class="day-block__date">${escapeHtml(copy.date)}</p>
          <p class="day-block__desc">${escapeHtml(copy.desc)}</p>
          <ol class="timeline">
            ${copy.times.map(([time, text]) => `<li><time>${escapeHtml(time)}</time><span>${escapeHtml(text)}</span></li>`).join('')}
          </ol>
        </section>
      `;
    }).join('');
  }

  function renderAttire() {
    els.attireList.innerHTML = DATA.attire.map((item) => {
      const copy = item[state.lang] || item.en;
      return `
        <article class="attire-card reveal" style="--swatch:${item.swatch}">
          <span class="attire-card__swatch" aria-hidden="true"></span>
          <div>
            <h3>${escapeHtml(copy.title)}</h3>
            <p class="attire-card__date">${escapeHtml(copy.date)}</p>
            <p class="attire-card__colors">${escapeHtml(copy.colors)}</p>
          </div>
        </article>
      `;
    }).join('');
  }

  function renderRsvp() {
    els.rsvpEvents.innerHTML = DATA.events.map((event) => {
      const copy = event[state.lang] || event.en;
      const current = state.rsvp[event.id];
      return `
        <div class="rsvp-event" data-rsvp="${event.id}">
          <h3>${escapeHtml(copy.title)}</h3>
          <div class="rsvp-options">
            <label><input type="radio" name="rsvp-${event.id}" value="yes" ${current.attending ? 'checked' : ''}> ${escapeHtml(t('yes'))}</label>
            <label><input type="radio" name="rsvp-${event.id}" value="no" ${current.attending ? '' : 'checked'}> ${escapeHtml(t('no'))}</label>
          </div>
          <div class="guest-row">
            <span>${escapeHtml(t('guests'))}</span>
            <button type="button" data-guest="-1" aria-label="One fewer guest" ${current.attending ? '' : 'disabled'}>−</button>
            <output data-guest-count>${current.attending ? current.guests : 0}</output>
            <button type="button" data-guest="1" aria-label="One more guest" ${current.attending ? '' : 'disabled'}>+</button>
          </div>
        </div>
      `;
    }).join('');

    $$('.rsvp-event', els.rsvpEvents).forEach((block) => {
      const id = block.dataset.rsvp;
      const current = state.rsvp[id];
      $$('input[type="radio"]', block).forEach((radio) => {
        radio.addEventListener('change', () => {
          current.attending = radio.value === 'yes';
          if (!current.attending) current.guests = 0;
          if (current.attending && current.guests < 1) current.guests = 2;
          renderRsvp();
        });
      });
      $$('[data-guest]', block).forEach((button) => {
        button.addEventListener('click', () => {
          if (!current.attending) return;
          const next = current.guests + Number(button.dataset.guest);
          current.guests = Math.max(1, Math.min(8, next));
          renderRsvp();
        });
      });
    });

    els.guestName.value = state.name;
    els.guestMessage.value = state.message;
  }

  function submitRsvp(event) {
    event.preventDefault();
    const name = els.guestName.value.trim();
    state.name = name;
    state.message = els.guestMessage.value;
    if (!name) {
      els.formStatus.textContent = t('rsvpNameError');
      els.guestName.focus();
      return;
    }
    const attending = DATA.events.filter((item) => state.rsvp[item.id].attending).map((item) => {
      const copy = item[state.lang] || item.en;
      return `${copy.title} (${state.rsvp[item.id].guests})`;
    });
    const summary = attending.length ? attending.join(' · ') : 'No events selected';
    els.formStatus.textContent = `${t('rsvpSuccess')} ${name} — ${summary}`;
  }

  function buildGoogleCalendarUrl(event) {
    const start = toUtcStamp(new Date(event.start));
    const end = toUtcStamp(new Date(event.end));
    const title = `${eventText(event, 'title')} — ${DATA.couple.groom} & ${DATA.couple.bride}`;
    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: title,
      dates: `${start}/${end}`,
      location: `${eventText(event, 'venue')}, ${eventText(event, 'address')}`,
      details: `With love — ${DATA.couple.groom} & ${DATA.couple.bride}`,
    });
    return `https://calendar.google.com/calendar/render?${params.toString()}`;
  }

  function downloadIcs(event) {
    const start = toUtcStamp(new Date(event.start));
    const end = toUtcStamp(new Date(event.end));
    const title = `${eventText(event, 'title')} — ${DATA.couple.groom} & ${DATA.couple.bride}`;
    const location = `${eventText(event, 'venue')}, ${eventText(event, 'address')}`;
    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Neelum//Invitation//EN',
      'CALSCALE:GREGORIAN',
      'BEGIN:VEVENT',
      `UID:${event.id}-${start}@neelum`,
      `DTSTAMP:${toUtcStamp(new Date())}`,
      `DTSTART:${start}`,
      `DTEND:${end}`,
      `SUMMARY:${escapeIcs(title)}`,
      `LOCATION:${escapeIcs(location)}`,
      `DESCRIPTION:${escapeIcs(`With love — ${DATA.couple.groom} & ${DATA.couple.bride}`)}`,
      'END:VEVENT',
      'END:VCALENDAR',
    ];
    const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `neelum-${event.id}.ics`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 4000);
  }

  function toUtcStamp(date) {
    return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
  }

  function escapeIcs(value) {
    return String(value).replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/;/g, '\\;').replace(/,/g, '\\,');
  }

  function updateCountdown() {
    const target = new Date(DATA.couple.dateISO).getTime();
    const remaining = target - Date.now();
    if (remaining <= 0) {
      setCount('days', 0); setCount('hours', 0); setCount('minutes', 0);
      return;
    }
    setCount('days', Math.floor(remaining / 86400000));
    setCount('hours', Math.floor(remaining / 3600000) % 24);
    setCount('minutes', Math.floor(remaining / 60000) % 60);
  }

  function setCount(name, value) {
    const node = document.querySelector(`[data-count="${name}"]`);
    if (node) node.textContent = String(value).padStart(2, '0');
  }

  /* Scratch gate --------------------------------------------------------- */

  function setupScratch() {
    els.scratchCircles.forEach((circle, index) => {
      const canvas = $('canvas', circle);
      const ctx = canvas.getContext && canvas.getContext('2d');
      if (!ctx) {
        revealScratch(index);
        return;
      }
      circle._ctx = ctx;
      circle._index = index;
      canvas.addEventListener('pointerdown', onScratchDown);
      canvas.addEventListener('pointermove', onScratchMove);
      canvas.addEventListener('pointerup', onScratchUp);
      canvas.addEventListener('pointercancel', onScratchUp);
    });
    window.requestAnimationFrame(() => window.requestAnimationFrame(sizeScratchCanvases));
  }

  function sizeScratchCanvases() {
    els.scratchCircles.forEach((circle) => {
      if (state.scratch[circle._index] || !circle._ctx) return;
      const rect = circle.getBoundingClientRect();
      if (!rect.width) return;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const canvas = $('canvas', circle);
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      circle._ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawFoil(circle._ctx, rect.width, rect.height, circle._index);
    });
  }

  function drawFoil(ctx, width, height, index) {
    ctx.clearRect(0, 0, width, height);
    const grad = ctx.createLinearGradient(0, 0, width, height);
    grad.addColorStop(0, '#e7c987');
    grad.addColorStop(0.48, '#d3ad62');
    grad.addColorStop(1, '#b88c47');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    for (let i = 0; i < 38; i += 1) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      ctx.fillStyle = i % 4 === 0 ? 'rgba(47,76,134,.22)' : 'rgba(255,250,235,.4)';
      ctx.beginPath();
      ctx.arc(x, y, Math.random() * 1.6 + 0.3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = 'rgba(255,250,235,.16)';
    ctx.lineWidth = 1;
    for (let x = -height; x < width + height; x += 10) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + height, height);
      ctx.stroke();
    }
    ctx.restore();
  }

  function scratchPoint(canvas, event) {
    const rect = canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function onScratchDown(event) {
    const circle = event.currentTarget.closest('.scratch-circle');
    if (!circle || state.scratch[circle._index]) return;
    event.preventDefault();
    circle._drawing = true;
    circle._last = scratchPoint(event.currentTarget, event);
    event.currentTarget.setPointerCapture?.(event.pointerId);
    scratchAt(circle, circle._last);
  }

  function onScratchMove(event) {
    const circle = event.currentTarget.closest('.scratch-circle');
    if (!circle || !circle._drawing || state.scratch[circle._index]) return;
    event.preventDefault();
    const point = scratchPoint(event.currentTarget, event);
    scratchAt(circle, point);
  }

  function onScratchUp(event) {
    const circle = event.currentTarget.closest('.scratch-circle');
    if (!circle || !circle._drawing) return;
    circle._drawing = false;
    circle._last = null;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    checkScratch(circle);
  }

  function scratchAt(circle, point) {
    const ctx = circle._ctx;
    if (!ctx) return;
    const rect = circle.getBoundingClientRect();
    const radius = Math.max(10, rect.width * 0.22);
    const last = circle._last;
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    if (last && last !== point) {
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = radius * 2;
      ctx.beginPath();
      ctx.moveTo(last.x, last.y);
      ctx.lineTo(point.x, point.y);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    circle._last = point;
  }

  function checkScratch(circle) {
    const canvas = $('canvas', circle);
    const ctx = circle._ctx;
    if (!canvas || !ctx) return;
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let clear = 0;
    let total = 0;
    const step = 8;
    for (let y = 0; y < canvas.height; y += step) {
      for (let x = 0; x < canvas.width; x += step) {
        total += 1;
        if (data[(y * canvas.width + x) * 4 + 3] < 60) clear += 1;
      }
    }
    if (total && clear / total > 0.44) revealScratch(circle._index);
  }

  function revealScratch(index) {
    if (state.scratch[index]) return;
    state.scratch[index] = true;
    const circle = els.scratchCircles[index];
    if (circle) {
      circle.classList.add('is-revealed');
      const canvas = $('canvas', circle);
      if (canvas) canvas.style.pointerEvents = 'none';
    }
    updateScratchProgress();
  }

  function updateScratchProgress() {
    const count = state.scratch.filter(Boolean).length;
    els.scratchProgress.textContent = `${count} / 3`;
    if (count === 3 && !state.scratchComplete) {
      state.scratchComplete = true;
      els.scratchContinue.hidden = false;
      els.revealAll.hidden = true;
      els.scratchProgress.textContent = '3 / 3';
    }
  }

  function revealAll() {
    state.scratch.forEach((_, index) => revealScratch(index));
  }

  function lockScratch() {
    if (state.scratchLocked || state.scratchComplete) return;
    state.scratchLocked = true;
    document.documentElement.classList.add('scratch-locked');
    document.body.classList.add('scratch-locked');
    const top = window.scrollY + els.scratchSection.getBoundingClientRect().top;
    window.scrollTo({ top, behavior: 'auto' });
    els.revealAll.focus({ preventScroll: true });
  }

  function unlockAfterScratch() {
    if (!state.scratchComplete) return;
    document.documentElement.classList.remove('scratch-locked');
    document.body.classList.remove('scratch-locked');
    state.scratchLocked = false;
    $('#celebrations').scrollIntoView({ behavior: state.reduceMotion ? 'auto' : 'smooth', block: 'start' });
  }

  function checkScratchGate() {
    if (!state.opened || state.scratchComplete) return;
    const rect = els.scratchSection.getBoundingClientRect();
    const viewport = window.innerHeight;
    if (!state.scratchLocked && rect.top <= 8 && rect.bottom > 0) {
      lockScratch();
    } else if (!state.scratchLocked && rect.bottom <= 0) {
      lockScratch();
    }
  }

  /* Booking -------------------------------------------------------------- */

  function openBookingModal() {
    renderBookingCopy();
    els.bookingModal.hidden = false;
    els.bookingStatus.textContent = '';
    window.setTimeout(() => $('#bookName').focus({ preventScroll: true }), 50);
  }

  function closeBookingModal() {
    els.bookingModal.hidden = true;
  }

  function renderBookingCopy() {
    $$('[data-i18n]', els.bookingModal).forEach((node) => {
      const key = node.getAttribute('data-i18n');
      if (key) node.textContent = t(key);
    });
    $$('[data-i18n-placeholder]', els.bookingModal).forEach((node) => {
      const key = node.getAttribute('data-i18n-placeholder');
      if (key) node.setAttribute('placeholder', t(key));
    });
    const close = $('#closeBooking');
    if (close) close.setAttribute('aria-label', t('close'));
  }

  function submitBooking(event) {
    event.preventDefault();
    const name = $('#bookName').value.trim();
    const contact = $('#bookContact').value.trim();
    if (!name || !contact) {
      els.bookingStatus.textContent = state.lang === 'ur' ? 'براہ کرم اپنا نام اور رابطہ لکھیں۔' : 'Please add your name and contact.';
      return;
    }
    els.bookingStatus.textContent = t('bookSuccess');
    $('#bookName').value = '';
    $('#bookContact').value = '';
  }

  window.openBookingModal = openBookingModal;

  /* Reveal --------------------------------------------------------------- */

  let revealObserver;
  function setupReveal() {
    const nodes = $$('.section, .footer, .event-card, .day-block, .attire-card');
    nodes.forEach((node) => node.classList.add('reveal'));
    if (state.reduceMotion) {
      nodes.forEach((node) => node.classList.add('is-visible'));
      return;
    }
    if (!revealObserver) {
      revealObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            revealObserver.unobserve(entry.target);
          }
        });
      }, { threshold: 0.08 });
    }
    nodes.forEach((node) => {
      if (!node.classList.contains('is-visible')) revealObserver.observe(node);
    });
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (char) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    })[char]);
  }

  init();
})();
