import { KiCadViewer } from './kivi-viewer.js';
import { AltiumViewer } from './kivi-viewer.js';

const query = new URLSearchParams(location.search);
try {
  if (!query.get('src')) throw new Error('Supply a design URL in the src query parameter.');
  const provider = query.get('provider') || 'kicad';
  if (!['kicad', 'altium'].includes(provider)) throw new Error('Choose the kicad or altium provider.');
  const viewer = provider === 'altium' ? new AltiumViewer('#drawing')
    : new KiCadViewer('#drawing', { theme: query.get('theme') || 'light', inspectOnSelect:query.get('inspectOnSelect')!=='false' });
  window.addEventListener('pagehide', () => viewer.dispose(), { once: true });
  const options = { view: query.get('view') || undefined };
  if (provider === 'kicad') {
    options.file = query.get('file') || undefined;
    options.ref = query.get('ref') || undefined;
  }
  await viewer.load(query.get('src'), options);
} catch (error) {
  const panel = document.querySelector('#error');
  panel.hidden = false;
  panel.textContent = error.message;
}
