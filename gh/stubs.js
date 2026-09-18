/* Headless browser stubs: lets the game's own code run inside Node so the
   server can host an authoritative simulation. Rendering and audio calls
   are swallowed. Loaded before the game sources inside each room's vm. */
(function () {
  const noop = () => { };
  const ctxProxy = el => new Proxy({ canvas: el }, {
    get(t, k) {
      if (k in t) return t[k];
      if (k === 'createLinearGradient' || k === 'createRadialGradient' || k === 'createPattern')
        return () => ({ addColorStop: noop });
      if (k === 'measureText') return () => ({ width: 8 });
      if (k === 'getImageData') return (x, y, w = 1, h = 1) => ({ data: new Uint8ClampedArray(Math.max(4, w * h * 4)), width: w, height: h });
      if (k === 'createImageData') return (w = 1, h = 1) => ({ data: new Uint8ClampedArray(Math.max(4, w * h * 4)), width: w, height: h });
      if (typeof k === 'string' && k.startsWith('set') || typeof k === 'string' && k.startsWith('get')) return () => 0;
      return noop;
    },
    set() { return true; },
  });
  function makeEl(tag = 'div') {
    const el = {
      tagName: (tag || 'div').toUpperCase(), nodeName: (tag || 'div').toUpperCase(),
      style: { setProperty: noop, removeProperty: noop, getPropertyValue: () => '' },
      classList: { add: noop, remove: noop, toggle: noop, contains: () => false },
      dataset: {}, children: [], childNodes: [], hidden: false, width: 300, height: 150,
      innerHTML: '', outerHTML: '', textContent: '', value: '', scrollTop: 0, scrollHeight: 0, clientHeight: 0,
      append: noop, appendChild: noop, prepend: noop, remove: noop, insertAdjacentHTML: noop, insertBefore: noop, removeChild: noop,
      addEventListener: noop, removeEventListener: noop, dispatchEvent: noop, focus: noop, blur: noop, click: noop,
      setPointerCapture: noop, releasePointerCapture: noop, setAttribute: noop, getAttribute: () => null, removeAttribute: noop,
      getBoundingClientRect: () => ({ left: 0, top: 0, right: 1280, bottom: 720, width: 1280, height: 720, x: 0, y: 0 }),
      querySelector: () => makeEl(), querySelectorAll: () => [], closest: () => null, contains: () => false,
      cloneNode: () => makeEl(tag), scrollIntoView: noop, animate: () => ({ finished: Promise.resolve(), cancel: noop }),
    };
    el.getContext = () => ctxProxy(el);
    el.toDataURL = () => '';
    el.parentNode = null; el.firstChild = null; el.lastChild = null;
    return el;
  }
  const doc = {
    documentElement: makeEl('html'), body: makeEl('body'), head: makeEl('head'),
    createElement: tag => makeEl(tag), createElementNS: (ns, tag) => makeEl(tag), createTextNode: () => makeEl('text'),
    createDocumentFragment: () => makeEl('fragment'),
    querySelector: () => makeEl(), querySelectorAll: () => [], getElementById: () => makeEl(),
    addEventListener: noop, removeEventListener: noop, dispatchEvent: noop,
    fonts: { ready: Promise.resolve(), load: () => Promise.resolve(), add: noop },
    hidden: false, visibilityState: 'visible', cookie: '',
  };
  const store = new Map();
  const g = globalThis;
  g.window = g;
  g.self = g;
  g.document = doc;
  g.navigator = { userAgent: 'shardfall-server', maxTouchPoints: 0, platform: 'node', language: 'en', clipboard: { writeText: () => Promise.resolve() } };
  g.location = { href: 'http://server/', search: '', hash: '', protocol: 'http:', host: 'server' };
  g.localStorage = { getItem: k => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k), clear: () => store.clear() };
  g.sessionStorage = g.localStorage;
  g.devicePixelRatio = 1;
  g.innerWidth = 1280; g.innerHeight = 720;
  g.addEventListener = noop; g.removeEventListener = noop; g.dispatchEvent = noop;
  g.requestAnimationFrame = () => 0; g.cancelAnimationFrame = noop;
  g.matchMedia = () => ({ matches: false, addEventListener: noop, removeEventListener: noop, addListener: noop, removeListener: noop });
  g.getComputedStyle = () => ({ getPropertyValue: () => '' });
  g.OffscreenCanvas = class { constructor(w, h) { this.width = w; this.height = h; } getContext() { return ctxProxy(this); } };
  g.Image = class { constructor() { this.width = 1; this.height = 1; } set src(v) { this._src = v; } get src() { return this._src; } addEventListener() { } };
  g.Path2D = class { constructor() { } addPath() { } };
  g.AudioContext = g.webkitAudioContext = class {
    constructor() { this.currentTime = 0; this.destination = {}; this.state = 'running'; }
    createGain() { return { gain: { value: 1, setValueAtTime: noop, linearRampToValueAtTime: noop, exponentialRampToValueAtTime: noop }, connect: noop, disconnect: noop }; }
    createOscillator() { return { type: '', frequency: { value: 1, setValueAtTime: noop, linearRampToValueAtTime: noop, exponentialRampToValueAtTime: noop }, connect: noop, start: noop, stop: noop, disconnect: noop }; }
    createBiquadFilter() { return { type: '', frequency: { value: 1, setValueAtTime: noop }, Q: { value: 1 }, connect: noop }; }
    createBufferSource() { return { buffer: null, connect: noop, start: noop, stop: noop, playbackRate: { value: 1 } }; }
    createBuffer(ch, len, rate) { return { length: len, sampleRate: rate, getChannelData: () => new Float32Array(len), numberOfChannels: ch }; }
    createDynamicsCompressor() { return { connect: noop, threshold: { value: 0 }, knee: { value: 0 }, ratio: { value: 1 }, attack: { value: 0 }, release: { value: 0 } }; }
    createStereoPanner() { return { pan: { value: 0 }, connect: noop }; }
    resume() { return Promise.resolve(); }
    close() { return Promise.resolve(); }
  };
  g.Audio = class { play() { return Promise.resolve(); } pause() { } };
  g.HEADLESS = true;
})();
