// Receives a skin from the AO3 page, keeps it until the aochat tab has picked it up, and opens aochat.
const SITE = 'https://rtpyr.github.io/aochat/';
chrome.runtime.onMessage.addListener((msg, sender) => {
  if (!msg || msg.type !== 'send-skin' || typeof msg.css !== 'string') return;
  if (!sender.url || !/^https:\/\/archiveofourown\.org\/skins\//.test(sender.url)) return;
  chrome.storage.local.set({ pending: { css: msg.css.slice(0, 300000), name: String(msg.name || '').slice(0, 60) } },
    () => chrome.tabs.create({ url: SITE }));
});
