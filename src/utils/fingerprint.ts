/**
 * Generates a lightweight, privacy-conscious device fingerprint.
 * This is used for risk analysis and multi-account detection.
 */
export async function getDeviceFingerprint(): Promise<string> {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const txt = 'PulseEarn_Integrity_v1';

  if (ctx) {
    ctx.textBaseline = 'top';
    ctx.font = '14px "Arial"';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#f60';
    ctx.fillRect(125, 1, 62, 20);
    ctx.fillStyle = '#069';
    ctx.fillText(txt, 2, 15);
    ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
    ctx.fillText(txt, 4, 17);
  }

  const canvasData = canvas.toDataURL();
  const screenData = `${window.screen.width}x${window.screen.height}x${window.screen.colorDepth}`;
  const hardwareData = `${navigator.hardwareConcurrency || 'N/A'}-${navigator.language}`;

  const rawId = `${canvasData}-${screenData}-${hardwareData}`;

  // Hash the raw data into a shorter string
  return hashString(rawId);
}

function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16);
}
