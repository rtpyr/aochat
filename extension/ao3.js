// Adds a button above the CSS box on an AO3 skin page. Runs only when you press it.
(function () {
  const box = document.querySelector('.css.module');
  const pre = box && box.querySelector('pre');
  if (!pre || document.getElementById('aochat-send')) return;
  const p = document.createElement('p');
  p.className = 'actions';
  const a = document.createElement('a');
  a.id = 'aochat-send'; a.href = '#'; a.textContent = 'Send to aochat';
  a.addEventListener('click', e => {
    e.preventDefault();
    const name = document.title.split(' | ')[0].trim();
    chrome.runtime.sendMessage({ type: 'send-skin', css: pre.textContent, name });
    a.textContent = 'Sent. Check the aochat tab';
  });
  p.appendChild(a);
  box.parentNode.insertBefore(p, box);
})();
