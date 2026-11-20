// Compares the page's JS CSS cleaner with AO3's real Ruby one.
// usage: OTW_DIR=... [LIBS_DIR=...] node tools/ao3check/compare.mjs
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const html = fs.readFileSync(path.join(here, '../../app.js'), 'utf8');
const a = html.indexOf('const PROPS='), b = html.indexOf('function buildHtml');
if (a < 0 || b < 0) throw new Error('could not find the cleaner in app.js');
const api = new Function(html.slice(a, b) + '\nreturn {cleanCss,buildCss,SKINS};')();

const inputs = Object.keys(api.SKINS).map(k => [`skin:${k}`, api.buildCss(k, 300, 360)]);
// Every property x value pair, one rule each, so a rejected pair cannot hide another.
const FP = ['width','color','background','margin','padding','border','border-radius','font-family','font-size','content',
  'display','position','transform','box-shadow','line-height','opacity','flex','flex-direction','text-align','overflow-wrap',
  'filter','aspect-ratio','background-image','list-style','--x','-webkit-transform','gap','z-index','max-width','text-shadow'];
const FV = ['0','10px','1.5em','-1px','50%','100% !important','auto','none','inherit','calc(100% - 4px)','#fff','#abcdef','#ABC',
  'red','Red','rgb(1,2,3)','rgba(0,0,0,.2)','rgb(1, 2, 3)','hsla(10,20%,30%,.5)','0 1px 2px rgba(0,0,0,.2)','1px solid #ccc',
  '1px solid rgba(0,0,0,.1)','"Segoe UI", Arial, sans-serif','Arial,Helvetica','\'ab\'','"x"','"\\2713"','var(--x)','VAR(--X)',
  'linear-gradient(#fff,#000)','linear-gradient(to right, #fff 0%, #000 100%)','-webkit-linear-gradient(top,#fff,#000)',
  'radial-gradient(circle, red, blue)','rotate(10deg)','translate(1px, 2px)','translateX(5px) rotate(3deg)','scale(1.5)',
  'url(https://example.com/a.png)','url("https://example.com/a.jpg")','url(/images/a.gif)','url(https://example.com/a.svg)',
  'url(data:image/png;base64,AAAA)','url(a.png)','blur(2px)','drop-shadow(1px 2px 3px red)','16/9','auto 3/4','1.5','.5em',
  '12345px','1px  2px','1px\t2px','expression(alert(1))','javascript:x','red;color:blue','\\','!important','10px 20px 30px 40px',
  'inline-block','flex','sans-serif','bold','0 auto','rect(1px,2px,3px,4px)','attr(x)','"a;b"','1e3px','+5px','5 px','1PX'];
const fz = []; for (const p of FP) for (const v of FV) fz.push(`.f{${p}:${v}}`);
inputs.push(['fuzz', fz.join('\n')]);
inputs.push(['cases.css', fs.readFileSync(path.join(here, 'cases.css'), 'utf8')]);

const norm = v => v.replace(/\s+/g, ' ').replace(/\s*!important/i, ' !important').trim().toLowerCase();
function triples(css) {
  const out = new Set();
  for (const m of css.matchAll(/([^{}]+)\{([^}]*)\}/g)) {
    const sels = m[1].split(',').map(s => s.trim()).filter(Boolean);
    for (const d of m[2].split(/;(?![^(]*\))(?![^"']*["'][^"']*$)/)) {
      const i = d.indexOf(':'); if (i < 0) continue;
      const p = d.slice(0, i).trim().toLowerCase(), v = norm(d.slice(i + 1));
      if (p && v) for (const s of sels) out.add(`${s} | ${p}: ${v}`);
    }
  }
  return out;
}

let bad = 0;
for (const [name, css] of inputs) {
  const ruby = JSON.parse(execFileSync('ruby', [path.join(here, 'harness.rb')], { input: css, encoding: 'utf8' }));
  const T = triples(api.cleanCss(css).css), R = triples(ruby.css);
  const jsOnly = [...T].filter(x => !R.has(x)), rbOnly = [...R].filter(x => !T.has(x));
  console.log(`${name}: JS keeps ${T.size}, AO3 keeps ${R.size}` + (jsOnly.length || rbOnly.length ? '' : '  ✓ identical'));
  for (const x of jsOnly) { bad++; console.log(`   PREVIEW LIES  (page keeps, AO3 strips): ${x}`); }
  for (const x of rbOnly) { bad++; console.log(`   too strict    (AO3 keeps, page strips): ${x}`); }
}
console.log(bad ? `\n${bad} difference(s)` : '\nNo differences.');
process.exit(bad ? 1 : 0);
