/**
 * Browser device fingerprint — canvas (dual-draw evasion), WebGL, audio, composite.
 * Pass a vertical-specific label so clusters stay scoped per formType on the server.
 */

export interface DeviceFpResult {
  canvas: string;
  composite: string;
  evasion: boolean;
  canvas_stable: boolean;
}

function cyrb53(str: string, seed = 0): string {
  let h1 = 0xdeadbeef ^ seed;
  let h2 = 0x41c6ce57 ^ seed;
  for (let i = 0, ch: number; i < str.length; i++) {
    ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16);
}

function drawCanvas(verticalLabel: string): string {
  const c = document.createElement('canvas');
  c.width = 280;
  c.height = 60;
  const x = c.getContext('2d');
  if (!x) return '';
  const label = verticalLabel || 'Quote';
  x.textBaseline = 'top';
  x.font = "14px 'Arial'";
  x.fillStyle = '#f60';
  x.fillRect(0, 0, 100, 20);
  x.fillStyle = '#069';
  x.fillText(label + ' \u00A0fp\ud83d\ude03 1234', 2, 15);
  x.fillStyle = 'rgba(102,204,0,0.7)';
  x.fillText(label + ' \u00A0fp\ud83d\ude03 1234', 4, 17);
  x.globalCompositeOperation = 'multiply';
  x.fillStyle = '#0ff';
  x.beginPath();
  x.arc(50, 25, 20, 0, Math.PI * 2);
  x.fill();
  return c.toDataURL();
}

function webglFP(): string {
  try {
    const gl = document.createElement('canvas').getContext('webgl');
    if (!gl) return 'nogl';
    const d = gl.getExtension('WEBGL_debug_renderer_info');
    return cyrb53(
      [
        d ? gl.getParameter(d.UNMASKED_VENDOR_WEBGL) : '',
        d ? gl.getParameter(d.UNMASKED_RENDERER_WEBGL) : '',
        gl.getParameter(gl.VERSION),
        gl.getParameter(gl.MAX_TEXTURE_SIZE),
        (gl.getSupportedExtensions() || []).join(','),
      ].join('|')
    );
  } catch {
    return 'errgl';
  }
}

async function audioFP(): Promise<string> {
  try {
    const C = window.OfflineAudioContext || (window as unknown as { webkitOfflineAudioContext?: typeof OfflineAudioContext }).webkitOfflineAudioContext;
    if (!C) return 'erraud';
    const ctx = new C(1, 5000, 44100);
    const o = ctx.createOscillator();
    const k = ctx.createDynamicsCompressor();
    o.type = 'triangle';
    o.frequency.value = 10000;
    o.connect(k);
    k.connect(ctx.destination);
    o.start(0);
    const b = await ctx.startRendering();
    const d = b.getChannelData(0).slice(0, 500);
    let s = 0;
    for (let i = 0; i < d.length; i++) s += Math.abs(d[i]);
    return cyrb53(String(s));
  } catch {
    return 'erraud';
  }
}

function hardwareBlock(): string {
  const nav = typeof navigator !== 'undefined' ? navigator : ({} as Navigator);
  const scr = typeof window !== 'undefined' && window.screen ? window.screen : ({} as Screen);
  const n = nav as Navigator & { deviceMemory?: number };
  let tz = '';
  try {
    tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
  } catch {
    tz = '';
  }
  return [
    scr.width + 'x' + scr.height,
    window.devicePixelRatio || 1,
    nav.hardwareConcurrency || 0,
    n.deviceMemory || 0,
    nav.platform || '',
    tz,
  ].join('|');
}

export function fingerprintLabelForFormType(formType: string): string {
  if (!formType) return 'Quote';
  const parts = String(formType).trim().toLowerCase().split('_').filter(Boolean);
  if (!parts.length) return 'Quote';
  return parts.map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join('') + 'Quote';
}

export function getHardwareInfo(): Record<string, unknown> {
  try {
    const nav = typeof navigator !== 'undefined' ? (navigator as Navigator & { deviceMemory?: number }) : ({} as Navigator & { deviceMemory?: number });
    const scr = typeof window !== 'undefined' && window.screen ? window.screen : ({} as Screen);
    return {
      platform: nav.platform || '',
      screenW: scr.width || 0,
      screenH: scr.height || 0,
      cores: nav.hardwareConcurrency || 0,
      memory: nav.deviceMemory || 0,
      userAgent: nav.userAgent || '',
    };
  } catch {
    return {};
  }
}

/** Collect fingerprint; call once on form load and again at submit if needed. */
export async function collectDeviceFingerprint(verticalLabel: string): Promise<DeviceFpResult> {
  const a = drawCanvas(verticalLabel);
  const b = drawCanvas(verticalLabel);
  const gl = webglFP();
  const au = await audioFP();
  const hw = hardwareBlock();
  const evasion = a !== b;
  return {
    canvas: a ? cyrb53(a) : '',
    composite: cyrb53([gl, au, hw].join('::')),
    evasion,
    canvas_stable: !evasion,
  };
}
