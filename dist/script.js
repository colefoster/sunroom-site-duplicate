const presets = {
  amber: { color: '#331f00', opacity: 30 },
  blue: { color: '#000d33', opacity: 25 },
  gray: { color: '#0d0d0d', opacity: 35 },
};
const clamp = (value, min, max) => Math.max(min, Math.min(value, max));

function initTintDemo(root) {
  const name = root.dataset.demo;
  const stage = root.querySelector('[data-stage]');
  const tint = root.querySelector('[data-tint]');
  const panel = root.querySelector('[data-controls]');
  const check = root.querySelector('[data-action="check"]');
  const feedback = root.closest('section').querySelector('[data-feedback]');
  const storageKey = `sunroom-demo-${name}-v3`;
  const initial = { color: '#261a00', opacity: 30, enabled: true, locked: false, rect: null };
  let state = { ...initial };

  panel.innerHTML = `
    <div class="control-title"><h3><svg aria-hidden="true"><use href="#sun"/></svg>Tint box</h3><span class="show-control"><span>Show</span><button class="toggle" data-action="enabled" role="switch" aria-checked="true" aria-label="Show tint box"><span></span></button></span></div>
    <fieldset class="mode-group"><legend>Box mode</legend>
      <button class="mode-choice" data-mode="unlocked" aria-pressed="true"><span><svg aria-hidden="true"><use href="#unlock"/></svg>Unlocked</span><small>Move &amp; resize</small></button>
      <button class="mode-choice" data-mode="locked" aria-pressed="false"><span><svg aria-hidden="true"><use href="#lock"/></svg>Locked</span><small>Click through</small></button>
    </fieldset>
    <p class="control-hint" data-hint>Drag the top bar or resize the corner. Lock when you’re done.</p>
    <div class="control-section"><label class="range-label" for="${name}-opacity">Opacity <output data-opacity-output>30%</output></label><input id="${name}-opacity" data-control="opacity" type="range" min="5" max="80" value="30"></div>
    <fieldset class="presets"><legend>Presets</legend>${Object.keys(presets).map(key => `<button data-preset="${key}" class="preset" aria-pressed="false"><i></i>${key[0].toUpperCase() + key.slice(1)}</button>`).join('')}</fieldset>
    <label class="custom-color">Tint colour <input type="color" data-control="color" value="#261a00" aria-label="Custom tint colour"></label>
    <button class="reset" data-action="reset">Reset demo</button>`;

  // Store proportions so a saved region still fits after changing device sizes.
  function placeRect(x, y, width, height, save = true) {
    const maxWidth = stage.clientWidth;
    const maxHeight = stage.clientHeight;
    const topInset = Math.min(31, maxHeight);
    width = clamp(width, Math.min(95, maxWidth), maxWidth);
    height = clamp(height, Math.min(65, maxHeight - topInset), maxHeight - topInset);
    x = clamp(x, 0, maxWidth - width);
    y = clamp(y, topInset, maxHeight - height);
    Object.assign(tint.style, { left: `${x}px`, top: `${y}px`, width: `${width}px`, height: `${height}px`, right: 'auto', bottom: 'auto' });
    if (save) state.rect = { x: x / maxWidth, y: y / maxHeight, width: width / maxWidth, height: height / maxHeight };
  }

  function restoreRect() {
    if (!state.rect) return;
    const { x, y, width, height } = state.rect;
    placeRect(x * stage.clientWidth, y * stage.clientHeight, width * stage.clientWidth, height * stage.clientHeight, false);
  }

  function persist() {
    try { localStorage.setItem(storageKey, JSON.stringify(state)); } catch { /* The demo also works when storage is unavailable. */ }
  }

  function announce(message) {
    feedback.textContent = message;
  }

  function render() {
    root.style.setProperty('--tint', state.color);
    root.style.setProperty('--opacity', state.opacity / 100);
    tint.classList.toggle('off', !state.enabled);
    tint.classList.toggle('moving', !state.locked && state.enabled);
    root.querySelectorAll('[data-action="enabled"]').forEach(button => button.setAttribute('aria-checked', String(state.enabled)));
    root.querySelectorAll('[data-control="opacity"]').forEach(input => { input.value = state.opacity; });
    root.querySelectorAll('[data-opacity-output]').forEach(output => { output.value = `${state.opacity}%`; });
    panel.querySelector('[data-control="color"]').value = state.color;
    panel.querySelectorAll('[data-preset]').forEach(button => {
      const preset = presets[button.dataset.preset];
      const active = preset.color === state.color && preset.opacity === state.opacity;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    panel.querySelectorAll('[data-mode]').forEach(button => button.setAttribute('aria-pressed', String((button.dataset.mode === 'locked') === state.locked)));
    tint.setAttribute('aria-hidden', String(!state.enabled || state.locked));
    panel.querySelector('[data-hint]').textContent = !state.enabled
      ? 'Hidden — your size, position, and lock mode are kept. Turn Show box on to bring it back.'
      : state.locked
      ? 'Clicks pass through. Choose Unlocked to move or resize the box.'
      : 'Drag the top bar or resize the corner. Lock when you’re done.';
    persist();
  }

  try {
    const saved = JSON.parse(localStorage.getItem(storageKey));
    if (saved && /^#[0-9a-f]{6}$/i.test(saved.color) && Number.isFinite(saved.opacity)) {
      state = {
        color: saved.color,
        opacity: clamp(saved.opacity, 5, 80),
        enabled: typeof saved.enabled === 'boolean' ? saved.enabled : true,
        locked: typeof saved.locked === 'boolean' ? saved.locked : false,
        rect: saved.rect && ['x', 'y', 'width', 'height'].every(key => Number.isFinite(saved.rect[key]) && saved.rect[key] >= 0 && saved.rect[key] <= 1) ? saved.rect : null,
      };
    }
  } catch { /* Ignore unavailable storage or an outdated saved demo. */ }

  root.querySelectorAll('[data-control="opacity"]').forEach(input => input.addEventListener('input', () => {
    state.opacity = Number(input.value);
    render();
  }));
  panel.querySelector('[data-control="color"]').addEventListener('input', event => {
    state.color = event.target.value;
    render();
  });
  panel.querySelectorAll('[data-preset]').forEach(button => button.addEventListener('click', () => {
    Object.assign(state, presets[button.dataset.preset]);
    render();
    announce(`${button.textContent} tint selected`);
  }));
  root.querySelectorAll('[data-action="enabled"]').forEach(button => button.addEventListener('click', () => {
    state.enabled = !state.enabled;
    render();
    announce(state.enabled ? 'Box shown. Its position and mode are unchanged.' : 'Box hidden. Size, position and mode are kept.');
  }));
  root.querySelector('[data-action="settings"]').addEventListener('click', () => {
    panel.querySelector('[data-action="enabled"]').focus();
  });
  panel.querySelectorAll('[data-mode]').forEach(button => button.addEventListener('click', () => {
    state.locked = button.dataset.mode === 'locked';
    render();
    announce(state.locked ? 'Locked. Click “Follow along” through the tint box.' : 'Unlocked. Drag the top bar or resize the corner.');
  }));
  tint.addEventListener('click', event => {
    if (!state.locked && !event.target.closest('[data-handle]')) {
      announce('The unlocked box caught that click. Choose Locked to click through it.');
    }
  });
  check.addEventListener('click', event => {
    const checked = check.getAttribute('aria-pressed') !== 'true';
    check.setAttribute('aria-pressed', String(checked));
    const box = tint.getBoundingClientRect();
    const through = event.detail > 0 && state.enabled && state.locked && event.clientX >= box.left && event.clientX <= box.right && event.clientY >= box.top && event.clientY <= box.bottom;
    announce(through ? 'That click passed through the locked tint box.' : checked ? 'Checked. Place the tint over this checkbox and lock it to try click-through.' : 'Checkbox cleared.');
  });
  panel.querySelector('[data-action="reset"]').addEventListener('click', () => {
    state = { ...initial };
    tint.removeAttribute('style');
    check.setAttribute('aria-pressed', 'false');
    render();
    announce('Demo reset');
  });

  root.querySelectorAll('[data-handle]').forEach(handle => {
    const resize = handle.dataset.handle === 'resize';
    handle.addEventListener('pointerdown', event => {
      if (state.locked || !state.enabled || !event.isPrimary || event.button !== 0) return;
      event.preventDefault();
      handle.setPointerCapture(event.pointerId);
      const start = { x: event.clientX, y: event.clientY, left: tint.offsetLeft, top: tint.offsetTop, width: tint.offsetWidth, height: tint.offsetHeight };
      const move = next => {
        if (state.locked || !state.enabled) return;
        const dx = next.clientX - start.x;
        const dy = next.clientY - start.y;
        placeRect(resize ? start.left : start.left + dx, resize ? start.top : start.top + dy, resize ? start.width + dx : start.width, resize ? start.height + dy : start.height);
      };
      const end = () => {
        handle.removeEventListener('pointermove', move);
        handle.removeEventListener('pointerup', end);
        handle.removeEventListener('pointercancel', end);
        handle.removeEventListener('lostpointercapture', end);
        persist();
      };
      handle.addEventListener('pointermove', move);
      handle.addEventListener('pointerup', end);
      handle.addEventListener('pointercancel', end);
      handle.addEventListener('lostpointercapture', end);
    });
    handle.addEventListener('keydown', event => {
      if (state.locked || !state.enabled) return;
      const deltas = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
      if (!deltas[event.key]) return;
      event.preventDefault();
      const step = event.shiftKey ? 25 : 10;
      const [dx, dy] = deltas[event.key].map(value => value * step);
      placeRect(tint.offsetLeft + (resize ? 0 : dx), tint.offsetTop + (resize ? 0 : dy), tint.offsetWidth + (resize ? dx : 0), tint.offsetHeight + (resize ? dy : 0));
      persist();
    });
  });

  new ResizeObserver(restoreRect).observe(stage);
  restoreRect();
  render();
}

document.querySelectorAll('[data-demo]').forEach(initTintDemo);
const copyButton = document.querySelector('[data-copy]');
copyButton.addEventListener('click', async () => {
  const command = document.querySelector('#clone-command');
  try {
    await navigator.clipboard.writeText(command.textContent.trim());
    copyButton.textContent = 'Copied';
  } catch {
    const range = document.createRange();
    range.selectNodeContents(command);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    copyButton.textContent = 'Press ⌘C';
  }
  setTimeout(() => { copyButton.textContent = 'Copy'; }, 1800);
});
