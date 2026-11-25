// On AO3's new work skin / new work / chapter pages: fills in what aochat sent. It never presses Create or Post.
chrome.storage.local.get('toAo3', ({ toAo3 }) => {
  if (!toAo3 || Date.now() - toAo3.at > 10 * 60 * 1000) return;
  const set = (el, v) => { el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); };
  const done = () => chrome.storage.local.remove('toAo3');
  if (toAo3.kind === 'css') {
    const css = document.getElementById('skin_css'), type = document.getElementById('skin_type'), title = document.getElementById('skin_title');
    if (!css || !type || type.value !== 'WorkSkin') return;
    set(css, toAo3.text);
    if (title && !title.value) set(title, 'Chat mockup');
    done();
  } else {
    let box = document.getElementById('content');
    if (!box) return;
    if (getComputedStyle(box).display === 'none') {          // Rich Text mode is on: switch to HTML first
      const link = document.querySelector('a.html-link'); if (link) link.click();
      box = document.getElementById('content');
    }
    set(box, toAo3.text);
    done();
  }
});
