const INTERACTIVE_CHILD = 'input, select, textarea, button, a';
const PIXELS_PER_STEP = 4;
const DRAG_THRESHOLD = 2;

function finiteAttribute(input, name, fallback) {
  const value = Number.parseFloat(input.getAttribute(name));
  return Number.isFinite(value) ? value : fallback;
}

function decimalPlaces(value) {
  const text = String(value).toLowerCase();
  if (text.includes('e-')) return Number.parseInt(text.split('e-')[1], 10) || 0;
  return (text.split('.')[1] || '').length;
}

function labelText(label, input) {
  return Array.from(label.childNodes)
    .filter(node => node !== input)
    .map(node => node.textContent)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim() || input.id || 'Value';
}

function modifierScale(event) {
  if (event.ctrlKey || event.metaKey) return 0.01;
  if (event.shiftKey) return 0.1;
  return 1;
}

function normalizedValue(input, rawValue, effectiveStep) {
  const min = finiteAttribute(input, 'min', -Infinity);
  const max = finiteAttribute(input, 'max', Infinity);
  const baseStep = finiteAttribute(input, 'step', 1);
  const integerField = Number.isInteger(baseStep)
    && (!Number.isFinite(min) || Number.isInteger(min))
    && (!Number.isFinite(max) || Number.isInteger(max));
  const clamped = Math.min(max, Math.max(min, rawValue));

  if (integerField) return String(Math.round(clamped));

  const precision = Math.min(10, Math.max(
    decimalPlaces(baseStep),
    decimalPlaces(effectiveStep),
    decimalPlaces(min),
    decimalPlaces(max)
  ));
  return String(Number(clamped.toFixed(precision)));
}

function dispatchValueEvent(input, type) {
  input.dispatchEvent(new Event(type, { bubbles: true }));
}

export function initNumericScrubbers(root = document, options = {}) {
  const labels = Array.from(root.querySelectorAll('label'))
    .map(label => ({ label, input: label.querySelector(':scope > input[type="number"]') }))
    .filter(item => item.input);
  const cleanups = [];

  labels.forEach(({ label, input }) => {
    const name = labelText(label, input);
    const previousTitle = label.getAttribute('title');
    let drag = null;
    let suppressClick = false;

    label.classList.add('numeric-scrub-label');
    label.title = `${name}: 좌우 드래그로 값 조정 (Shift 미세, Ctrl/⌘ 정밀)`;

    const finish = event => {
      if (!drag || event.pointerId !== drag.pointerId) return;
      const changed = drag.changed;
      drag = null;
      document.documentElement.classList.remove('numeric-scrubbing');
      if (label.hasPointerCapture?.(event.pointerId)) label.releasePointerCapture(event.pointerId);
      if (changed) {
        suppressClick = true;
        dispatchValueEvent(input, 'change');
        options.onEnd?.({ input, label: name, value: input.value });
      }
    };

    const onPointerDown = event => {
      const interactiveTarget = event.target instanceof Element && event.target.closest(INTERACTIVE_CHILD);
      if (event.button !== 0 || interactiveTarget || input.disabled || input.readOnly) return;
      const startValue = Number.parseFloat(input.value);
      if (!Number.isFinite(startValue)) return;
      drag = { pointerId: event.pointerId, startX: event.clientX, startValue, changed: false };
      label.setPointerCapture?.(event.pointerId);
    };

    const onPointerMove = event => {
      if (!drag || event.pointerId !== drag.pointerId) return;
      const deltaX = event.clientX - drag.startX;
      if (!drag.changed && Math.abs(deltaX) < DRAG_THRESHOLD) return;
      if (!drag.changed) {
        drag.changed = true;
        options.onStart?.({ input, label: name, value: input.value });
      }
      document.documentElement.classList.add('numeric-scrubbing');
      event.preventDefault();

      const baseStep = finiteAttribute(input, 'step', 1);
      const effectiveStep = baseStep * modifierScale(event);
      const nextValue = normalizedValue(input, drag.startValue + (deltaX / PIXELS_PER_STEP) * effectiveStep, effectiveStep);
      if (input.value === nextValue) return;
      input.value = nextValue;
      dispatchValueEvent(input, 'input');
      options.onChange?.({ input, label: name, value: input.value });
    };

    const onClick = event => {
      if (!suppressClick) return;
      suppressClick = false;
      event.preventDefault();
      event.stopPropagation();
    };

    label.addEventListener('pointerdown', onPointerDown);
    label.addEventListener('pointermove', onPointerMove);
    label.addEventListener('pointerup', finish);
    label.addEventListener('pointercancel', finish);
    label.addEventListener('lostpointercapture', finish);
    label.addEventListener('click', onClick, true);

    cleanups.push(() => {
      label.removeEventListener('pointerdown', onPointerDown);
      label.removeEventListener('pointermove', onPointerMove);
      label.removeEventListener('pointerup', finish);
      label.removeEventListener('pointercancel', finish);
      label.removeEventListener('lostpointercapture', finish);
      label.removeEventListener('click', onClick, true);
      label.classList.remove('numeric-scrub-label');
      if (previousTitle == null) label.removeAttribute('title');
      else label.setAttribute('title', previousTitle);
    });
  });

  return () => {
    cleanups.forEach(cleanup => cleanup());
    document.documentElement.classList.remove('numeric-scrubbing');
  };
}
