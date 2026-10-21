/* Page behaviour: template helpers (related-work dropdown, BibTeX copy, scroll-to-top),
   the YouTube slot, result tabs, plot switchers and the simulator pop-up. */

// ---------- template helpers ----------
function toggleMoreWorks() {
  const dropdown = document.getElementById('moreWorksDropdown');
  const button = document.querySelector('.more-works-btn');
  const open = !dropdown.classList.contains('show');
  dropdown.classList.toggle('show', open);
  button.classList.toggle('active', open);
}

document.addEventListener('click', function (event) {
  const container = document.querySelector('.more-works-container');
  if (container && !container.contains(event.target)) {
    document.getElementById('moreWorksDropdown').classList.remove('show');
    document.querySelector('.more-works-btn').classList.remove('active');
  }
});

function copyBibTeX() {
  const text = document.getElementById('bibtex-code').textContent;
  const button = document.querySelector('.copy-bibtex-btn');
  const label = button.querySelector('.copy-text');
  const done = function () {
    button.classList.add('copied');
    label.textContent = 'Cop';
    setTimeout(function () {
      button.classList.remove('copied');
      label.textContent = 'Copy';
    }, 2000);
  };
  navigator.clipboard.writeText(text).then(done).catch(function () {
    const area = document.createElement('textarea');
    area.value = text;
    document.body.appendChild(area);
    area.select();
    document.execCommand('copy');
    document.body.removeChild(area);
    done();
  });
}

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

window.addEventListener('scroll', function () {
  document.querySelector('.scroll-to-top').classList.toggle('visible', window.pageYOffset > 300);
});

// ---------- YouTube slot: fill in data-youtube-id in index.html and the player appears ----------
function setupVideo() {
  const slot = document.getElementById('video-slot');
  const id = slot && slot.dataset.youtubeId.trim();
  if (!id) return;
  const frame = document.createElement('iframe');
  frame.src = 'https://www.youtube-nocookie.com/embed/' + encodeURIComponent(id) + '?rel=0';
  frame.title = 'Reflection-Based Relative Localization: video';
  frame.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
  frame.allowFullscreen = true;
  frame.loading = 'lazy';
  frame.referrerPolicy = 'strict-origin-when-cross-origin';
  slot.replaceChildren(frame);
}

// ---------- result tabs ----------
function setupTabs() {
  const links = document.querySelectorAll('.results-tabs a[data-tab]');
  const panels = document.querySelectorAll('.tab-panel');
  function activate(name) {
    links.forEach(function (a) {
      const on = a.dataset.tab === name;
      a.parentElement.classList.toggle('is-active', on);
      a.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    panels.forEach(function (p) {
      p.hidden = p.dataset.panel !== name;
    });
  }
  links.forEach(function (a) {
    a.addEventListener('click', function (e) {
      e.preventDefault();
      activate(a.dataset.tab);
      history.replaceState(null, '', '#results-' + a.dataset.tab);
    });
  });
  const m = location.hash.match(/^#results-(\w+)$/);
  if (m && document.querySelector('.tab-panel[data-panel="' + m[1] + '"]')) {
    activate(m[1]);
    document.getElementById('results').scrollIntoView();
  }
}

// ---------- plot switchers (flight 1/2/3 etc.) ----------
function setupPlotSwitches() {
  document.querySelectorAll('.plot-switch').forEach(function (bar) {
    const img = document.getElementById(bar.dataset.target);
    bar.querySelectorAll('.chip').forEach(function (chip) {
      chip.addEventListener('click', function () {
        bar.querySelectorAll('.chip').forEach(function (c) { c.classList.toggle('is-active', c === chip); });
        img.src = chip.dataset.src;
        img.alt = chip.dataset.alt;
      });
    });
  });
}

// ---------- simulator pop-up ----------
function setupSimulator() {
  const modal = document.getElementById('sim-modal');
  const frame = document.getElementById('sim-frame');
  let opener = null;

  function open(e) {
    // Let modified clicks (new tab / window) behave like a normal link.
    if (e && (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1)) return;
    if (e) e.preventDefault();
    opener = document.activeElement;
    if (!frame.getAttribute('src')) frame.setAttribute('src', 'simulator.html');
    modal.hidden = false;
    document.body.classList.add('modal-open');
    modal.querySelector('[data-close-sim].sim-bar-btn').focus();
  }
  function close() {
    modal.hidden = true;
    document.body.classList.remove('modal-open');
    if (opener) opener.focus();
  }

  document.querySelectorAll('.js-open-sim').forEach(function (a) { a.addEventListener('click', open); });
  modal.querySelectorAll('[data-close-sim]').forEach(function (b) { b.addEventListener('click', close); });
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (!modal.hidden) close();
    document.getElementById('moreWorksDropdown').classList.remove('show');
    document.querySelector('.more-works-btn').classList.remove('active');
  });
  if (location.hash === '#demo') open();
}

document.addEventListener('DOMContentLoaded', function () {
  setupVideo();
  setupTabs();
  setupPlotSwitches();
  setupSimulator();
  if (window.__renderMath) {
    document.querySelectorAll('.insight, .sim-text, .tab-panel').forEach(window.__renderMath);
  }
});
