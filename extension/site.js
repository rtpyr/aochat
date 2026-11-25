// On the aochat page: hands a waiting skin to the page, which converts it.
chrome.storage.local.get('pending', ({ pending }) => {
  if (!pending) return;
  chrome.storage.local.remove('pending');
  window.postMessage({ source: 'aochat-ext', css: pending.css, name: pending.name }, location.origin);
});
