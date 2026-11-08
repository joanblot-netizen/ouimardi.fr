/* ==========================================================================
   oui mardi. — moteur d'animation (vanilla, sans dépendance)
   ========================================================================== */
(() => {
  'use strict';

  /* ---------- À configurer avant la mise en ligne ---------- */
  const CONFIG = {
    reservation: 'https://calendly.com/joanblot/15-minutes-avec-joan', // lien de réservation
    email: '',                                                         // adresse e-mail (vide = liens e-mail masqués)
    linkedin: 'https://www.linkedin.com/in/joan-blot-/'                // profil LinkedIn
  };

  const doc = document.documentElement;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

  /* ---------- Liens ---------- */
  $$('[data-booking]').forEach((a) => {
    a.href = CONFIG.reservation || '#contact';
    if (CONFIG.reservation) { a.target = '_blank'; a.rel = 'noopener'; }
  });
  $$('[data-mail]').forEach((a) => { if (CONFIG.email) a.href = 'mailto:' + CONFIG.email; else a.remove(); });
  $$('[data-linkedin]').forEach((a) => {
    a.href = CONFIG.linkedin || '#contact';
    if (CONFIG.linkedin) { a.target = '_blank'; a.rel = 'noopener'; }
  });
  const year = $('#year');
  if (year) year.textContent = new Date().getFullYear();

  /* ---------- Découpage des titres mot à mot ---------- */
  function split(el) {
    // la ponctuation collée après un mot en italique rejoint ce mot
    $$('em', el).forEach((em) => {
      const n = em.nextSibling;
      if (n && n.nodeType === 3) {
        const m = n.textContent.match(/^[,.;:!?»)]+/);
        if (m) { em.textContent += m[0]; n.textContent = n.textContent.slice(m[0].length); }
      }
    });
    let i = 0;
    const walk = (node) => {
      Array.from(node.childNodes).forEach((n) => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/([ \t\n\r]+)/).forEach((part) => {
            if (!part) return;
            if (/^[ \t\n\r]+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
            const w = document.createElement('span');
            w.className = 'w';
            const wi = document.createElement('span');
            wi.className = 'wi';
            wi.style.setProperty('--i', i++);
            wi.textContent = part;
            w.appendChild(wi);
            frag.appendChild(w);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1 && n.tagName !== 'BR') {
          walk(n);
        }
      });
    };
    walk(el);
  }
  $$('[data-split]').forEach(split);

  /* ---------- Apparitions au scroll ---------- */
  const revealIO = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add('is-in'); revealIO.unobserve(e.target); }
    });
  }, { rootMargin: '0px 0px -10% 0px', threshold: 0.12 });
  $$('[data-reveal], [data-split]').forEach((el) => revealIO.observe(el));

  /* ---------- Compteurs ---------- */
  const countIO = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      countIO.unobserve(e.target);
      const el = e.target;
      const to = parseInt(el.dataset.count, 10);
      if (reduce) { el.textContent = to; return; }
      const t0 = performance.now(), dur = 1800;
      const step = (t) => {
        const p = clamp((t - t0) / dur, 0, 1);
        el.textContent = Math.round(to * (1 - Math.pow(2, -10 * p)));
        if (p < 1) requestAnimationFrame(step); else el.textContent = to;
      };
      requestAnimationFrame(step);
    });
  }, { threshold: 0.6 });
  $$('[data-count]').forEach((el) => countIO.observe(el));

  /* ---------- Visibilité (pour lancer / suspendre les simulations) ---------- */
  function whenVisible(el, onShow, onHide) {
    new IntersectionObserver(([e]) => (e.isIntersecting ? onShow() : onHide()), { threshold: 0.2 }).observe(el);
  }

  /* ---------- Navigation mobile ---------- */
  const nav = $('#nav');
  const burger = $('.burger');
  const menu = $('#menu');
  function setMenu(open) {
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Fermer le menu' : 'Ouvrir le menu');
    menu.hidden = !open;
    nav.classList.toggle('menu-open', open);
    document.body.style.overflow = open ? 'hidden' : '';
  }
  burger.addEventListener('click', () => setMenu(burger.getAttribute('aria-expanded') !== 'true'));
  $$('a', menu).forEach((a) => a.addEventListener('click', () => setMenu(false)));
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !menu.hidden) setMenu(false); });

  /* ---------- FAQ ---------- */
  $$('.qa').forEach((qa, idx) => {
    const btn = $('.qa-q', qa);
    const set = (open) => { qa.classList.toggle('is-open', open); btn.setAttribute('aria-expanded', String(open)); };
    if (idx === 0) set(true);
    btn.addEventListener('click', () => {
      const open = !qa.classList.contains('is-open');
      $$('.qa.is-open').forEach((o) => { if (o !== qa) { o.classList.remove('is-open'); $('.qa-q', o).setAttribute('aria-expanded', 'false'); } });
      set(open);
    });
  });

  /* ---------- Curseur personnalisé ---------- */
  const cursor = $('.cursor');
  const dot = $('.cursor-dot');
  const ring = $('.cursor-ring');
  let mx = -100, my = -100, rx = -100, ry = -100;
  const useCursor = fine && !reduce;
  if (useCursor) {
    doc.classList.add('has-cursor');
    window.addEventListener('pointermove', (e) => {
      mx = e.clientX; my = e.clientY;
      cursor.classList.add('is-active');
    }, { passive: true });
    document.addEventListener('pointerover', (e) => {
      const t = e.target;
      cursor.classList.toggle('is-hover', !!t.closest('a, button, .chip, .step, [data-hover]'));
      cursor.classList.toggle('on-paper', !!t.closest('.s-papier') && !t.closest('[data-dark], .pair-sol'));
    });
    document.documentElement.addEventListener('pointerleave', () => cursor.classList.remove('is-active'));
  }

  /* ---------- Boutons magnétiques ---------- */
  if (useCursor) {
    $$('[data-magnetic]').forEach((el) => {
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        const x = e.clientX - (r.left + r.width / 2);
        const y = e.clientY - (r.top + r.height / 2);
        el.style.transition = 'transform .18s ease-out';
        el.style.transform = `translate(${x * 0.22}px, ${y * 0.32}px)`;
      });
      el.addEventListener('pointerleave', () => {
        el.style.transition = 'transform .7s cubic-bezier(.2,.7,.1,1)';
        el.style.transform = '';
      });
    });
  }

  /* ---------- Cartes inclinées ---------- */
  if (useCursor) {
    $$('[data-tilt]').forEach((el) => {
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width;
        const py = (e.clientY - r.top) / r.height;
        el.classList.add('is-moving');
        el.style.setProperty('--mx', (px * 100).toFixed(1) + '%');
        el.style.setProperty('--my', (py * 100).toFixed(1) + '%');
        el.style.transform = `perspective(1400px) rotateX(${((0.5 - py) * 5).toFixed(2)}deg) rotateY(${((px - 0.5) * 7).toFixed(2)}deg)`;
      });
      el.addEventListener('pointerleave', () => { el.classList.remove('is-moving'); el.style.transform = ''; });
    });
  }

  /* ---------- Défilement horizontal épinglé (méthode) ---------- */
  const hScroll = $('#hScroll');
  const hTrack = $('#hTrack');
  const hBar = $('#hBar');
  let hOn = false, hMax = 0;
  function layoutH() {
    hOn = !reduce && window.innerWidth > 980 && window.innerHeight > 640;
    hScroll.classList.toggle('is-pinned', hOn);
    if (!hOn) { hScroll.style.height = ''; hTrack.style.transform = ''; return; }
    const last = hTrack.lastElementChild;
    const padR = parseFloat(getComputedStyle(hTrack).paddingRight) || 0;
    hMax = Math.max(0, last.offsetLeft + last.offsetWidth + padR - hTrack.clientWidth);
    hScroll.style.height = (window.innerHeight + hMax) + 'px';
  }

  /* ---------- Effets liés au scroll ---------- */
  const bar = $('.progress span');
  const links = $$('[data-link]');
  const sections = links.map((a) => $(a.getAttribute('href'))).filter(Boolean);
  const parallax = $$('[data-parallax]');
  const portraitImg = $('[data-parallax-inner] img');
  const strike = $('[data-strike]');
  let prevY = window.scrollY;

  function onScrollFx(y) {
    const vh = window.innerHeight;
    const max = document.documentElement.scrollHeight - vh;
    bar.style.transform = `scaleX(${max > 0 ? clamp(y / max, 0, 1) : 0})`;

    // navigation : fond après 40 px, masquée en descente, visible en montée
    if (menu.hidden) {
      nav.classList.toggle('is-solid', y > 40);
      if (y > prevY + 4 && y > 320) nav.classList.add('is-hidden');
      else if (y < prevY - 4) nav.classList.remove('is-hidden');
    }
    prevY = y;

    // lien actif
    let current = null;
    sections.forEach((s) => { if (s.getBoundingClientRect().top <= vh * 0.4) current = s; });
    links.forEach((a) => a.classList.toggle('is-active', current && a.getAttribute('href') === '#' + current.id));

    if (reduce) return;

    // parallaxe du motif
    parallax.forEach((el) => {
      const r = el.parentElement.getBoundingClientRect();
      const off = (r.top + r.height / 2 - vh / 2) * parseFloat(el.dataset.parallax);
      el.style.transform = `translate3d(0, ${off.toFixed(1)}px, 0)`;
    });
    if (portraitImg) {
      const r = portraitImg.parentElement.getBoundingClientRect();
      const off = (r.top + r.height / 2 - vh / 2) * -0.06;
      portraitImg.style.transform = `translate3d(0, ${off.toFixed(1)}px, 0) scale(1.08)`;
    }

    // rature « curieux » → « qualifiés »
    if (strike) {
      const r = strike.getBoundingClientRect();
      strike.style.setProperty('--p', clamp((vh * 0.82 - r.top) / (vh * 0.4), 0, 1).toFixed(3));
    }

    // méthode horizontale
    if (hOn && hMax > 0) {
      const r = hScroll.getBoundingClientRect();
      const p = clamp(-r.top / hMax, 0, 1);
      hTrack.style.transform = `translate3d(${(-p * hMax).toFixed(1)}px, 0, 0)`;
      hBar.style.transform = `scaleX(${p.toFixed(3)})`;
    }
  }

  let lastY = -1;
  function tick() {
    if (useCursor) {
      rx = lerp(rx, mx, 0.16); ry = lerp(ry, my, 0.16);
      dot.style.transform = `translate3d(${mx}px, ${my}px, 0)`;
      ring.style.transform = `translate3d(${rx.toFixed(1)}px, ${ry.toFixed(1)}px, 0)`;
    }
    const y = window.scrollY;
    if (y !== lastY) { lastY = y; onScrollFx(y); }
    requestAnimationFrame(tick);
  }

  let rz;
  window.addEventListener('resize', () => {
    clearTimeout(rz);
    rz = setTimeout(() => { layoutH(); lastY = -1; }, 120);
  });
  layoutH();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { layoutH(); lastY = -1; });
  window.addEventListener('load', () => {
    layoutH();
    lastY = -1;
    // la section méthode change de hauteur une fois épinglée : on recale l'ancre de l'URL
    const target = location.hash.length > 1 && document.getElementById(location.hash.slice(1));
    if (target) target.scrollIntoView({ behavior: 'instant', block: 'start' });
  });
  requestAnimationFrame(tick);

  /* ---------- Dates utiles ---------- */
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const fmtLong = (d) => cap(d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }));
  const nextTuesday = (() => {
    const d = new Date(today);
    d.setDate(d.getDate() + (((2 - d.getDay()) + 7) % 7 || 7));
    return d;
  })();

  /* ==========================================================================
     Simulation 1 — l'agenda qui se remplit
     ========================================================================== */
  const agenda = $('#agenda');
  if (agenda) {
    const grid = $('#agGrid');
    const countEl = $('#agCount');
    const toast = $('#agToast');
    const toastTxt = $('#agToastTxt');
    const jours = ['Lun.', 'Mar.', 'Mer.', 'Jeu.', 'Ven.'];
    const heures = ['09:00', '10:30', '14:00', '15:30', '17:00'];

    const monday = new Date(today);
    monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7) + 7);
    $('#agWeek').textContent = 'Semaine du ' + monday.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });

    const mk = (cls, html) => { const e = document.createElement('div'); e.className = cls; if (html) e.innerHTML = html; grid.appendChild(e); return e; };
    mk('ag-corner');
    jours.forEach((j, i) => {
      const d = new Date(monday); d.setDate(monday.getDate() + i);
      mk('ag-dh' + (i === 1 ? ' is-tue' : ''), `${j}<b>${d.getDate()}</b>`);
    });
    const cells = [];
    heures.forEach((h, r) => {
      mk('ag-time', h);
      jours.forEach((_, i) => { cells[r * 5 + i] = mk('ag-cell' + (i === 1 ? ' is-tue' : '')); });
    });

    const rdv = [
      { d: 1, r: 0, t: 'DG', m: 'SaaS RH' },
      { d: 3, r: 1, t: 'VP Sales', m: 'Logistique' },
      { d: 1, r: 2, t: 'CEO', m: 'Fintech' },
      { d: 0, r: 3, t: 'DAF', m: 'Industrie' },
      { d: 4, r: 2, t: 'Fondatrice', m: 'Agence' },
      { d: 1, r: 4, t: 'COO', m: 'E-commerce' },
      { d: 2, r: 1, t: 'CMO', m: 'SaaS' }
    ];
    let idx = 0, count = 0, timer = null, running = false;

    const place = (m) => {
      const chip = document.createElement('div');
      chip.className = 'chip';
      chip.innerHTML = `<b>${m.t}</b><span>${m.m}</span><em>4/4 critères</em><i class="ok"></i>`;
      cells[m.r * 5 + m.d].appendChild(chip);
    };
    function step() {
      if (!running) return;
      if (idx >= rdv.length) { timer = setTimeout(clear, 4200); return; }
      const m = rdv[idx++];
      place(m);
      countEl.textContent = ++count;
      toastTxt.textContent = `${jours[m.d]} ${heures[m.r]} · ${m.t} · ${m.m}`;
      toast.classList.remove('is-show');
      void toast.offsetWidth;
      toast.classList.add('is-show');
      timer = setTimeout(step, 1750);
    }
    function clear() {
      $$('.chip', grid).forEach((c) => c.classList.add('is-out'));
      toast.classList.remove('is-show');
      timer = setTimeout(() => {
        $$('.chip', grid).forEach((c) => c.remove());
        idx = 0; count = 0; countEl.textContent = '0';
        timer = setTimeout(step, 500);
      }, 600);
    }

    if (reduce) {
      rdv.forEach(place);
      countEl.textContent = rdv.length;
    } else {
      whenVisible(agenda, () => {
        if (running) return;
        running = true;
        if (grid.querySelector('.chip.is-out') || idx >= rdv.length) clear();
        else timer = setTimeout(step, idx ? 400 : 900);
      }, () => { running = false; clearTimeout(timer); });
    }
  }

  /* ==========================================================================
     Simulation 2 — l'appel de qualification
     ========================================================================== */
  const call = $('#call');
  if (call) {
    const linesEl = $('#callLines');
    const wave = $('#callWave');
    const timerEl = $('#callTimer');
    const booked = $('#callBooked');
    const pills = $$('#callCrit span');
    const crits = $$('.crit-list li');
    $('#callBookedTxt').textContent = `${fmtLong(nextTuesday)} · 14:30`;
    for (let i = 0; i < 34; i++) wave.appendChild(document.createElement('i'));
    const bars = $$('i', wave);

    const script = [
      ['s', 'Aujourd’hui, comment trouvez-vous vos nouveaux clients ?'],
      ['p', 'Surtout par le réseau. Mais on plafonne depuis six mois.', 0],
      ['s', 'Qui valide ce type de projet chez vous ?'],
      ['p', 'Moi, avec notre DG. On décide à deux.', 1],
      ['s', 'Vous avez une enveloppe prévue pour ça ?'],
      ['p', 'Oui, c’est budgété pour le prochain trimestre.', 2],
      ['s', 'Idéalement, vous voudriez démarrer quand ?'],
      ['p', 'Le plus tôt possible. Avant la fin du mois.', 3],
      ['s', 'Mardi 14 h 30, ça vous irait ?'],
      ['p', 'Oui, mardi c’est parfait.']
    ];

    let run = 0, secs = 0, clock = null, waveTimer = null, speaking = '';
    const fmt = (s) => String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
    const setCrit = (i, on) => { pills[i].classList.toggle('is-on', on); crits[i].classList.toggle('is-on', on); };
    const addLine = (who, text) => {
      const el = document.createElement('div');
      el.className = 'line ' + who;
      el.innerHTML = `<small>${who === 's' ? 'Joan · oui mardi.' : 'Prospect'}</small><span></span>`;
      if (text) el.lastChild.textContent = text;
      linesEl.appendChild(el);
      while (linesEl.children.length > 6) linesEl.firstChild.remove();
      return el.lastChild;
    };
    function resetCall() {
      linesEl.innerHTML = '';
      booked.classList.remove('is-show');
      pills.forEach((_, i) => setCrit(i, false));
      secs = 0; timerEl.textContent = '00:00';
      clearInterval(clock);
    }
    async function say(who, text, id) {
      const span = addLine(who, '');
      speaking = who; wave.className = 'call-wave is-' + who;
      for (let i = 1; i <= text.length; i++) {
        if (id !== run) return;
        span.textContent = text.slice(0, i);
        await wait(text[i - 1] === ' ' ? 30 : 21);
      }
      speaking = ''; wave.className = 'call-wave';
    }
    async function play(id) {
      resetCall();
      clock = setInterval(() => { secs += 1; timerEl.textContent = fmt(secs); }, 1000);
      await wait(500);
      for (const [who, text, crit] of script) {
        if (id !== run) return;
        await say(who, text, id);
        if (id !== run) return;
        if (crit !== undefined) setCrit(crit, true);
        await wait(who === 's' ? 380 : 750);
      }
      if (id !== run) return;
      clearInterval(clock);
      booked.classList.add('is-show');
      await wait(4800);
      if (id === run) play(id);
    }
    const animateWave = () => {
      bars.forEach((b, i) => {
        const h = speaking ? 18 + Math.random() * 82 * (0.55 + 0.45 * Math.sin(i * 0.5 + secs)) : 8 + Math.random() * 8;
        b.style.height = clamp(h, 8, 100).toFixed(0) + '%';
      });
    };

    if (reduce) {
      script.slice(-6).forEach(([who, text]) => addLine(who, text));
      pills.forEach((_, i) => setCrit(i, true));
      booked.classList.add('is-show');
      timerEl.textContent = '04:12';
    } else {
      whenVisible(call, () => {
        run += 1;
        play(run);
        clearInterval(waveTimer);
        waveTimer = setInterval(animateWave, 110);
      }, () => {
        run += 1;
        clearInterval(clock);
        clearInterval(waveTimer);
      });
    }
  }

  /* ==========================================================================
     Simulation 3 — la réservation d'un mardi
     ========================================================================== */
  const book = $('#book');
  if (book) {
    const daysEl = $('#bookDays');
    const slotsEl = $('#bookSlots');
    const slotBtns = $$('button', slotsEl);
    const slotsTitle = $('#bookSlotsTitle');
    const selEl = $('#bookSel');
    const confirmBtn = $('#bookConfirm');
    const done = $('#bookDone');
    const doneTxt = $('#bookDoneTxt');
    const cur = $('#bookCursor');

    const tuesdaysAfter = (y, m, from) => {
      const out = [];
      const last = new Date(y, m + 1, 0).getDate();
      for (let d = 1; d <= last; d++) {
        const dt = new Date(y, m, d);
        if (dt.getDay() === 2 && dt > from) out.push(d);
      }
      return out;
    };
    let y = today.getFullYear(), mo = today.getMonth();
    let tues = tuesdaysAfter(y, mo, today);
    if (tues.length < 2) { mo += 1; if (mo > 11) { mo = 0; y += 1; } tues = tuesdaysAfter(y, mo, today); }
    $('#bookMonth').textContent = new Date(y, mo, 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });

    const lead = (new Date(y, mo, 1).getDay() + 6) % 7;
    const lastDay = new Date(y, mo + 1, 0).getDate();
    for (let i = 0; i < lead; i++) daysEl.appendChild(document.createElement('i'));
    const dayEls = {};
    for (let d = 1; d <= lastDay; d++) {
      const s = document.createElement('span');
      const dt = new Date(y, mo, d);
      const wd = dt.getDay();
      s.textContent = d;
      if (dt > today && wd >= 1 && wd <= 5) s.classList.add('av');
      dayEls[d] = s;
      daysEl.appendChild(s);
    }
    const dateOf = (d) => new Date(y, mo, d);
    const combos = [[tues[0], 2], [tues[1] || tues[0], 0], [tues[2] || tues[0], 3], [tues[1] || tues[0], 1]];
    let ci = 0, brun = 0;

    const center = (el) => {
      const b = book.getBoundingClientRect();
      const r = el.getBoundingClientRect();
      return [r.left - b.left + r.width / 2, r.top - b.top + r.height / 2];
    };
    const moveTo = async (el, ms = 950) => {
      const [x, yy] = center(el);
      cur.style.transform = `translate(${x.toFixed(1)}px, ${yy.toFixed(1)}px)`;
      await wait(ms);
    };
    const tap = async () => { cur.classList.remove('is-click'); void cur.getBoundingClientRect(); cur.classList.add('is-click'); await wait(280); };
    const park = () => { cur.style.transform = `translate(${book.clientWidth * 0.78}px, ${book.clientHeight * 0.92}px)`; };

    function resetBook() {
      Object.values(dayEls).forEach((e) => e.classList.remove('sel'));
      slotBtns.forEach((b) => b.classList.remove('sel'));
      slotsEl.classList.remove('is-on');
      slotsTitle.textContent = 'Choisissez un jour';
      selEl.textContent = 'Aucun créneau';
      confirmBtn.classList.remove('is-ready', 'is-press');
      done.classList.remove('is-show');
    }
    async function playBook(id) {
      resetBook();
      const [day, si] = combos[ci++ % combos.length];
      const label = cap(dateOf(day).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' }));
      await wait(800); if (id !== brun) return;
      await moveTo(dayEls[day]); if (id !== brun) return;
      await tap(); dayEls[day].classList.add('sel');
      slotsEl.classList.add('is-on'); slotsTitle.textContent = label;
      await wait(550); if (id !== brun) return;
      await moveTo(slotBtns[si], 800); if (id !== brun) return;
      await tap(); slotBtns[si].classList.add('sel');
      selEl.textContent = `${label} · ${slotBtns[si].textContent}`;
      confirmBtn.classList.add('is-ready');
      await wait(500); if (id !== brun) return;
      await moveTo(confirmBtn, 850); if (id !== brun) return;
      await tap(); confirmBtn.classList.add('is-press');
      await wait(320); if (id !== brun) return;
      doneTxt.textContent = `${fmtLong(dateOf(day))} · ${slotBtns[si].textContent}`;
      done.classList.add('is-show');
      park();
      await wait(3800); if (id !== brun) return;
      playBook(id);
    }

    if (reduce) {
      dayEls[tues[0]].classList.add('sel');
      slotsEl.classList.add('is-on');
      slotBtns[2].classList.add('sel');
      confirmBtn.classList.add('is-ready');
      selEl.textContent = `${fmtLong(dateOf(tues[0]))} · 14:30`;
      cur.style.display = 'none';
    } else {
      park();
      whenVisible(book, () => { brun += 1; park(); playBook(brun); }, () => { brun += 1; });
    }
  }
})();
