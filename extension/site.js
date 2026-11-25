// On the aochat page: announces the extension, hands a waiting skin to the page,
// and passes the page's "Send to AO3" requests on to the background script.
window.postMessage({ source: 'aochat-ext', type: 'hello' }, location.origin);
chrome.storage.local.get('pending', ({ pending }) => {
  if (!pending) return;
  chrome.storage.local.remove('pending');
  window.postMessage({ source: 'aochat-ext', css: pending.css, name: pending.name }, location.origin);
});
window.addEventListener('message', e => {
  const d = e.data;
  if (e.source !== window || e.origin !== location.origin || !d || d.source !== 'aochat-page' || d.type !== 'send-ao3') return;
  if ((d.kind !== 'css' && d.kind !== 'html') || typeof d.text !== 'string') return;
  chrome.runtime.sendMessage({ type: 'to-ao3', kind: d.kind, text: d.text.slice(0, 300000) });
});
