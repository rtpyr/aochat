const SITE = 'https://rtpyr.github.io/aochat/';
const AO3 = { css: 'https://archiveofourown.org/skins/new?skin_type=WorkSkin', html: 'https://archiveofourown.org/works/new' };
chrome.runtime.onMessage.addListener((msg, sender) => {
  if (!msg) return;
  // a skin from an AO3 skin page -> aochat
  if (msg.type === 'send-skin' && typeof msg.css === 'string') {
    if (!sender.url || !/^https:\/\/archiveofourown\.org\/skins\//.test(sender.url)) return;
    chrome.storage.local.set({ pending: { css: msg.css.slice(0, 300000), name: String(msg.name || '').slice(0, 60) } },
      () => chrome.tabs.create({ url: SITE }));
  }
  // aochat's code -> AO3's forms (filled in, never submitted)
  if (msg.type === 'to-ao3' && AO3[msg.kind] && typeof msg.text === 'string') {
    if (!sender.url || sender.url.indexOf(SITE) !== 0) return;
    chrome.storage.local.set({ toAo3: { kind: msg.kind, text: msg.text, at: Date.now() } },
      () => chrome.tabs.create({ url: AO3[msg.kind] }));
  }
});
