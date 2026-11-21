/* ===================================================================
   AO3 ground truth — from otwcode/otwarchive
     config.yml ................ SUPPORTED_CSS_PROPERTIES / SHORTHAND
     lib/css_cleaner.rb ........ scoping + property/value rules
     sanitizer_config.rb ....... allowed elements + attributes
   =================================================================== */
const PROPS=new Set(`-replace -use-link-source accelerator accent-color align-content
align-items align-self alignment-adjust alignment-baseline appearance aspect-ratio azimuth
baseline-shift behavior binding bookmark-label bookmark-level bookmark-target bottom box-align
box-direction box-flex box-flex-group box-lines box-orient box-pack box-shadow box-sizing
caption-side clear clip color color-profile color-scheme content counter-increment counter-reset
crop cue cue-after cue-before cursor direction display dominant-baseline elevation empty-cells
fill filter fit fit-position float float-offset font font-effect font-emphasize font-family
font-size font-size-adjust font-smooth font-stretch font-style font-variant font-weight
grid-columns grid-rows hanging-punctuation height hyphens icon image-orientation image-resolution
ime-mode inline-box-align justify-content layout-flow left letter-spacing line-break line-height
mark marks max-height max-width min-height min-width move-to opacity order orphans page
page-policy pitch position presentation-level punctuation-trim quotes rendering-intent resize
rest richness right rotation ruby-align ruby-overhang ruby-position ruby-span size speak
speech-rate stress string-set stroke stroke-width tab-side table-layout target top unicode-bidi
user-select vertical-align visibility voice-family volume white-space widows width word-break
word-spacing word-wrap writing-mode z-index`.trim().split(/\s+/));
const SHORT=`background border column cue flex font layer-background layout-grid list-style
margin marker outline overflow padding page-break pause scrollbar text transform
transition`.trim().split(/\s+/);

/* AO3's shorthand test is an UNANCHORED regex: substring match. That is why
   border-radius / margin-top / text-align survive despite not being listed.
   The vendor-prefix test is unanchored too. (lib/css_cleaner.rb) */
const PROP_PFX_RE=new RegExp('-(moz|ms|o|webkit)-('+[...PROPS].join('|')+')');
const SHORT_RE=new RegExp(SHORT.join('|'));
const legalProp=p=>PROPS.has(p)||PROP_PFX_RE.test(p);
const legalShort=p=>SHORT_RE.test(p);
const customProp=p=>/^--[0-9a-z\-_]+$/i.test(p);
function propOk(p){return legalProp(p)||legalShort(p)||customProp(p);}
const EL=new Set(`a abbr acronym address b big blockquote br caption center cite code col
colgroup details figcaption figure dd del dfn div dl dt em h1 h2 h3 h4 h5 h6 hr i img ins kbd li
ol p pre q rp rt ruby s samp small span strike strong sub summary sup table tbody td tfoot th
thead tr tt u ul var`.trim().split(/\s+/));
const GATTR=new Set(['align','dir','lang','title','class']);
const PEREL={a:['href','name'],img:['align','alt','border','height','src','width'],
  td:['abbr','axis','colspan','height','rowspan','width'],
  th:['abbr','axis','colspan','height','rowspan','scope','width'],
  ol:['start','type'],ul:['type'],details:['open'],hr:['align','width'],
  table:['border','summary','width'],col:['span','width'],colgroup:['span','width'],
  blockquote:['cite'],q:['cite']};
const NUKE=new Set(['iframe','math','noembed','noframes','noscript','plaintext','script','style','svg','xmp']);

/* ---- cleaners (what AO3 would keep) ---- */
function cleanHtml(src){
  const bad=[],doc=new DOMParser().parseFromString(src,'text/html');
  (function w(n){[...n.children].forEach(el=>{
    const t=el.tagName.toLowerCase();
    if(NUKE.has(t)){bad.push('<'+t+'> removed with contents');el.remove();return;}
    if(!EL.has(t)){bad.push('<'+t+'> unwrapped');const p=el.parentNode;
      while(el.firstChild)p.insertBefore(el.firstChild,el);p.removeChild(el);return;}
    [...el.attributes].forEach(a=>{const n2=a.name.toLowerCase();
      if(!(GATTR.has(n2)||(PEREL[t]||[]).includes(n2))){bad.push(n2+' on <'+t+'> stripped');el.removeAttribute(a.name);}
      else if(t==='img'&&n2==='src'&&!/^https?:/i.test(a.value)){bad.push('img src must be http(s)');el.removeAttribute('src');}});
    w(el);});})(doc.body);
  return {html:doc.body.innerHTML,bad};
}
/* ---- AO3's CSS value rules, ported from lib/css_cleaner.rb ----
   Ruby builds some of these regexes from double-quoted strings, where "\s" is a
   literal SPACE, so the number patterns below match spaces only. Same here.
   tools/ao3check runs the real Ruby code against this port. */
const AO3V=(()=>{
  const g=x=>'(?:'+x+')';
  const NUMBER='-?\\.?\\d{1,3}\\.?\\d{0,3}', UNITS='deg|cm|em|ex|in|mm|pc|pt|px|s|%';
  const NUM_RATIO=NUMBER+'(?: */ *'+NUMBER+')?';
  const NUM_UNIT=NUMBER+' *'+g(UNITS)+'? *,? *';
  const PAREN_NUM='\\(\\s*'+g(NUM_UNIT)+'+\\s*\\)';
  const ALPHA='[a-z\\-]+';
  /* AO3's ALPHA can be split at any letter inside (...)+ , which backtracks exponentially
     on a failing value like width:-webkit-linear-gradient(top,#fff,#000). AO3 catches
     Regexp::TimeoutError and rejects the value; a page has no timeout, so ALPHA is made
     greedy-only here. Differs from AO3 only for run-ons like "foorgba(1,2,3)". */
  const ALPHA_G=ALPHA+'(?![a-z\\-])';
  const COLOR=g('#[0-9a-f]{3,6}|'+ALPHA_G+'|'+g('rgba?')+PAREN_NUM+'|'+g('hsla?')+PAREN_NUM);
  const TRANSFORM=g('scalex?y?|translatex?y?|skewx?y?|rotatex?y?|matrix')+PAREN_NUM;
  const SHAPE=g('rect')+PAREN_NUM;
  const COLOR_STOP='color-stop\\s*\\('+g(NUM_UNIT)+'\\s*\\,?\\s*'+COLOR+'\\s*\\)';
  const FILTER=g('blur|brightness|contrast|grayscale|hue-rotate|invert|opacity|saturate|sepia')+PAREN_NUM;
  const DROP='drop-shadow\\(\\s*('+g(NUM_UNIT)+'|'+COLOR+'\\s*)+\\s*\\)';
  const VARFN='var\\(\\s*\\-\\-[0-9a-z\\-_]+\\s*\\)';
  const TLD='ac ad ae aero af ag ai al am an ao aq ar arpa as asia at au aw ax az ba bb bd be bf bg bh bi biz bj bm bn bo br bs bt bv bw by bz ca cat cc cd cf cg ch ci ck cl cm cn co com coop cr cu cv cx cy cz de dj dk dm do dz ec edu ee eg er es et eu fi fj fk fm fo fr ga gb gd ge gf gg gh gi gl gm gn gov gp gq gr gs gt gu gw gy hk hm hn hr ht hu id ie il im in info int io iq ir is it je jm jo jobs jp ke kg kh ki km kn kp kr kw ky kz la lb lc li lk lr ls lt lu lv ly ma mc md me mg mh mil mk ml mm mn mo mobi mp mq mr ms mt mu museum mv mw mx my mz na name nc ne net nf ng ni nl no np nr nu nz om org pa pe pf pg ph pk pl pm pn pr pro ps pt pw py qa re ro rs ru rw sa sb sc sd se sg sh si sj sk sl sm sn so sr st su sv sy sz tc td tel tf tg th tj tk tl tm tn to tp tr travel tt tv tw tz ua ug uk us uy uz va vc ve vg vi vn vu wf ws xn xxx ye yt za zm zw'.split(' ');
  const URI=g(g('\\/images|https?://\\w[\\w\\-\\.]+\\.('+TLD.join('|')+')'))+'/[\\w\\-\\.\\/]*[\\w\\-]\\.(jpg|jpeg|png|gif)';
  const URLFN='url\\(\\s*'+g(g(URI)+'|"'+g(URI)+'"|\''+g(URI)+'\'')+'\\s*\\)';
  const VALUE=[TRANSFORM,URLFN,COLOR_STOP,COLOR,NUM_UNIT,ALPHA_G,SHAPE,FILTER,DROP,VARFN].join('|');
  return {
    value:new RegExp('^('+g(VALUE)+',?\\s*)+$','im'),
    varFn:new RegExp(VARFN,'gi'), varTest:new RegExp(VARFN,'i'),
    aspect:new RegExp('^'+g(ALPHA+'|(?:auto\\s+)?'+NUM_RATIO+'(?:\\s+auto)?')+'$','i'),
    urlOnly:new RegExp('^'+URLFN+'$')
  };
})();
const KEYWORDS=['!important','url'];
const URL_PROPS=['background','background-image','border','border-image','list-style','list-style-image'];
const blank=x=>x==null||/^\s*$/.test(x);
const rsplit=(s,sep)=>{const a=s.split(sep);while(a.length&&a[a.length-1]==='')a.pop();return a;}; // Ruby drops trailing empties
const stripValue=v=>v.toLowerCase().replace(/!important/g,'').trim();
const scanUntil=(sc,re)=>{const g=new RegExp(re.source,'g');g.lastIndex=sc.p;const m=g.exec(sc.s);
  if(!m)return null;const t=sc.s.slice(sc.p,m.index+m[0].length);sc.p=m.index+m[0].length;return t;};
const scanAhead=(sc,re)=>{const g=new RegExp(re.source,'g');g.lastIndex=sc.p;return g.test(sc.s);};

function cssValue(value){                       // sanitize_css_value
  const vs=stripValue(value);
  if(vs.length>2000) return '';                 // AO3 times the regex out; we cap instead of hanging the page
  if(AO3V.value.test(vs)) return AO3V.varTest.test(value)?value.replace(AO3V.varFn,m=>m.toLowerCase()):value;
  if(rsplit(vs,',').every(x=>KEYWORDS.includes(x.trim()))) return value;
  return '';
}
function cssGradient(value){                    // sanitize_css_gradient
  const m=/^([a-z\-]+)\((.*)\)/m.exec(value);
  if(m){const inner=cssTokens(m[2]); if(/gradient/.test(m[1])&&!blank(inner)) return m[1]+'('+inner+')';}
  return '';
}
const cssToken=t=>/gradient/.test(t)?cssGradient(t):cssValue(t);
function cssTokens(value){                      // tokenize_and_sanitize_css_value
  let clean='';const sc={s:value,p:0};
  while(scanAhead(sc,/\s+|,|\(/)){
    let depth=0, token=scanUntil(sc,/\s+|,|\(/);
    if(blank(token)||token===','){clean+=token;continue;}
    if(/\($/m.test(token)) depth=1;
    while(depth>0){
      const next=scanUntil(sc,/\(|\)/);
      if(next===null) return '';
      token+=next;
      if(/\($/m.test(token)) depth++;
      if(/\)$/m.test(token)) depth--;
    }
    const sep=(/(\s|,)$/m.exec(token)||['',''])[1];
    token=token.trim(); if(token.endsWith(',')) token=token.slice(0,-1);
    const ct=cssToken(token); if(blank(ct)) return '';
    clean+=ct+sep;
  }
  const rest=value.slice(sc.p);
  if(!blank(rest)){const ct=cssToken(rest); if(blank(ct)) return ''; clean+=ct;}
  return clean;
}
function cssFont(value){                        // sanitize_css_font
  return rsplit(stripValue(value),',').every(f=>/^('?[a-z0-9\- ]+'?|"?[a-z0-9\- ]+"?)$/m.test(f.trim()));
}
function cssContent(value){                     // sanitize_css_content
  if(/^'([^']*)'$/.test(value)||/^"([^"]*)"$/.test(value)||AO3V.urlOnly.test(value)||value==='none') return value;
  return '';
}
function cssDeclValue(prop,value){              // sanitize_css_declaration_value
  let c='';
  if(prop==='font-family'){ if(cssFont(value)) c=value; }
  else if(prop==='aspect-ratio'){ if(AO3V.aspect.test(value)) c=value; }
  else if(prop==='content'){ c=/\bvar\b/i.test(value)?'':cssContent(value); }
  else if(/\burl\b/i.test(value)&&(!KEYWORDS.includes('url')||!URL_PROPS.includes(prop))) c='';
  else if(legalShort(prop)||customProp(prop)) c=cssTokens(value);
  else if(legalProp(prop)) c=cssValue(value);
  return c.trim();
}
function splitDecls(body){                      // css_parser splits on ; outside parentheses (quotes do not protect it)
  const out=[];let cur='',d=0;
  for(const ch of body){
    if(ch==='(')d++; else if(ch===')'&&d>0)d--;
    if(ch===';'&&!d){out.push(cur);cur='';} else cur+=ch;
  }
  out.push(cur);return out;
}
function cleanCss(css){
  const bad=[];let out='';
  css.replace(/\/\*[\s\S]*?\*\//g,'').replace(/([^{}]+)\{([^}]*)\}/g,(m,sel,decl)=>{
    if(/^\s*@/.test(sel)){bad.push(sel.trim().split(/\s/)[0]+' rules are removed by AO3');return '';}
    const keep=[];
    splitDecls(decl).forEach(d=>{const i=d.indexOf(':');if(i<0)return;
      const p=d.slice(0,i).trim().toLowerCase();let v=d.slice(i+1).trim();
      const imp=/\s*!\s*important\s*$/i.test(v); if(imp) v=v.replace(/\s*!\s*important\s*$/i,'');
      if(!p||!v)return;
      if(!propOk(p)){bad.push('"'+p+'" stripped by AO3');return;}
      const cv=cssDeclValue(p,v);
      if(blank(cv)){bad.push('"'+p+': '+v+'" value not allowed by AO3');return;}
      keep.push(p+':'+cv+(imp?' !important':''));});
    const s=sel.split(',').map(x=>{x=x.trim();return x?(x.startsWith('#workskin')?x:'#workskin '+x):'';})
      .filter(Boolean).join(', ');
    if(s&&keep.length) out+=s+'{'+keep.join(';')+';}\n';
    return '';});
  return {css:out,bad};
}

/* ===================================================================
   SKINS — pure-CSS phone chrome. No svg, no url(), no gap, no id/style.
   Layout uses float + inline-block, the pattern AO3 workskins rely on.
   =================================================================== */
const SKINS={
 whatsapp:{label:'WhatsApp',chat:'#ece5dd',mine:'#d9fdd3',theirs:'#ffffff',
   head:'#f0f2f5',headInk:'#111b21',tick:'✓✓',accent:'#54656f',avR:'50%'},
 imessage:{label:'iMessage',chat:'#ffffff',mine:'#3797f0',theirs:'#e9e9eb',
   head:'#f6f6f6',headInk:'#000000',tick:'',accent:'#007aff',mineInk:'#ffffff',avR:'50%'},
 line:{label:'LINE',chat:'#8ca9c6',mine:'#8de055',theirs:'#ffffff',
   head:'#ffffff',headInk:'#111111',tick:'',accent:'#06c755',avR:'50%'},
 /* Measured from the Figma community file "Copying Kakaotalk":
    bound variables kt/chatMessage #282A2B, kt/chatBaloonBGWhite #FFFFFF;
    colours sampled off the rendered frame; geometry from node metadata
    (414x896 frame, 395 message column, 68px row pitch on 61px rows,
    34px rounded-square avatar, 78px input board). */
 kakao:{label:'KakaoTalk',chat:'#afc0cf',mine:'#fae64c',theirs:'#ffffff',
   head:'#afc0cf',headInk:'#282a2b',tick:'',accent:'#282a2b',mineInk:'#282a2b',
   comp:'#f8f8f8',avR:'12px',nameAbove:true,timeOutside:true}
};
const PFX='chat';   // class prefix — change here, everything follows

function buildCss(k,w,h){
  const s=SKINS[k],mi=s.mineInk||'#111111',comp=s.comp||s.head,P=PFX;
  return `.${P}-phone {
  width: 100%; max-width: ${w}px; margin: 1.5em auto;
  border: 5px solid #1f2024; border-radius: 30px;
  background: ${s.chat}; overflow: hidden; box-sizing: border-box;
  font-family: Helvetica, Arial, sans-serif; font-size: 13px;
  line-height: 1.35; color: #111111;
}

/* ---- status bar: clock is text, signal is decoration ---- */
.${P}-bar {
  background: ${s.head}; color: ${s.headInk}; margin: 0;
  padding: 9px 14px 3px; height: 25px; font-size: 10.5px; font-weight: bold;
}
.${P}-bar::after { content: "▮▮▮"; float: right; font-size: 9px; letter-spacing: 1px; }

/* ---- header: back chevron is decoration ---- */
.${P}-head {
  background: ${s.head}; color: ${s.headInk}; margin: 0;
  border-bottom: 1px solid #00000014; padding: 8px 12px 10px; min-height: 44px;
}
.${P}-head::before {
  content: "‹"; float: left; color: ${s.accent};
  font-size: 19px; line-height: 30px; margin-right: 8px; font-weight: bold;
}
.${P}-av {
  float: left; width: 30px; height: 30px; line-height: 30px; text-align: center;
  border-radius: ${s.avR}; background: ${s.accent}; color: #ffffff;
  font-size: 11px; font-weight: bold; margin-right: 8px;
}
.${P}-nm { display: block; font-size: 14px; font-weight: bold; padding-top: 1px; }
.${P}-on { display: block; font-size: 10.5px; color: #6b7a86; line-height: 13px; }

/* ---- conversation ---- */
.${P}-body { background: ${s.chat}; padding: 11px 8px 14px; min-height: ${h}px; }
.${P}-day { text-align: center; margin: 0 0 11px; }
.${P}-daytag {
  background: #ffffffcc; color: #54656f; font-size: 10.5px;
  padding: 3px 10px; border-radius: 8px;
}
.${P}-row { margin: 0 0 7px; clear: both; overflow: hidden; }
.${P}-in { text-align: left; }
.${P}-out { text-align: right; }
.${P}-bub {
  display: inline-block; max-width: 78%; text-align: left;
  background: ${s.theirs}; color: #111111;
  border-radius: 9px; padding: 6px 9px 6px;
  font-size: 13px; line-height: 1.35;
  word-wrap: break-word; overflow-wrap: break-word; box-sizing: border-box;
  box-shadow: 0 1px 0.5px #0000001f;
}
.${P}-mine { background: ${s.mine}; color: ${mi}; }
.${P}-time {
  display: block; text-align: right; font-size: 9.5px;
  line-height: 1.2; color: #00000073; margin: 2px 0 0;
}
.${P}-mine .${P}-time { color: ${mi==='#ffffff'?'#ffffffbb':'#00000073'}; }

/* ---- skins that hang the name above and the time beside the bubble ---- */
.${P}-av2 {
  float: left; width: 34px; height: 34px; line-height: 34px; text-align: center;
  border-radius: ${s.avR}; background: #d7dce0; color: #5b6770;
  font-size: 11px; font-weight: bold; margin-right: 7px;
}
.${P}-stack { display: inline-block; max-width: 78%; vertical-align: top; }
.${P}-who { display: block; font-size: 11px; color: #3f4a52; margin: 0 0 3px; line-height: 1.2; }
.${P}-ot { display: inline-block; vertical-align: bottom; font-size: 9.5px; color: #4a555e; margin: 0 3px; }

/* ---- compose bar and home indicator: all decoration ---- */
.${P}-comp {
  background: ${comp}; padding: 9px 12px; color: #7d8a94; font-size: 12px; margin: 0;
}
.${P}-comp::before { content: "+"; display: inline-block; width: 16px; font-size: 17px; vertical-align: middle; }
.${P}-comp::after { content: "●"; float: right; font-size: 13px; line-height: 26px; }
.${P}-field {
  display: inline-block; width: 70%; background: #ffffff; border: 1px solid #00000014;
  border-radius: 18px; padding: 5px 11px; color: #9aa4ad; box-sizing: border-box;
}
.${P}-field::before { content: "Message"; }
.${P}-home { background: ${comp}; text-align: center; padding: 5px 0 8px; margin: 0; }
.${P}-home::before {
  content: ""; display: inline-block; background: #222222;
  border-radius: 6px; width: 84px; height: 4px;
}
`;
}

/* Pretty-printer: one declaration per line, like FicFormatter's Format CSS.
   Whitespace-only — it cannot change what AO3 keeps. */
function formatCss(css){
  const out=[]; const re=/(\/\*[\s\S]*?\*\/)|([^{}]+)\{([^}]*)\}/g; let m;
  while((m=re.exec(css))!==null){
    if(m[1]){ out.push(m[1].trim()); continue; }
    const sel=m[2].trim().replace(/\s*,\s*/g,', ').replace(/\s+/g,' ');
    if(!sel) continue;
    const decls=m[3].split(';').map(d=>d.trim()).filter(Boolean).map(d=>{
      const i=d.indexOf(':');
      return i<0 ? d : d.slice(0,i).trim()+': '+d.slice(i+1).trim().replace(/\s+/g,' ');
    });
    out.push(sel+' {\n'+decls.map(d=>'  '+d+';').join('\n')+'\n}');
  }
  return out.join('\n')+'\n';
}
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
function buildHtml(st){
  const s=SKINS[st.skin],P=PFX;
  const ini=st.name.trim().split(/\s+/).map(w=>w[0]||'').slice(0,2).join('').toUpperCase()||'?';
  const rows=st.msgs.map(m=>{
    const me=m.from==='me';
    const tick=(me&&s.tick)?' '+s.tick:'';
    // Skins like KakaoTalk hang the time outside the bubble, name above it.
    if(s.timeOutside){
      const bub=`<span class="${P}-bub${me?' '+P+'-mine':''}">`+esc(m.text)+`</span>`;
      const t=`<span class="${P}-ot">`+esc(m.time)+`</span>`;
      if(me) return `    <p class="${P}-row ${P}-out">`+t+bub+`</p>`;
      return `    <p class="${P}-row ${P}-in"><span class="${P}-av2">`+esc(ini)+`</span><span class="${P}-stack">`
        +(s.nameAbove?`<span class="${P}-who">`+esc(st.name)+`</span>`:'')+bub+`</span>`+t+`</p>`;
    }
    return `    <p class="${P}-row ${P}-${me?'out':'in'}"><span class="${P}-bub${me?' '+P+'-mine':''}">`
      +esc(m.text)+` <span class="${P}-time">`+esc(m.time)+tick+`</span></span></p>`;
  }).join('\n');
  return `<div class="${P}-phone">
  <p class="${P}-bar">9:41</p>
  <p class="${P}-head"><span class="${P}-av">${esc(ini)}</span><span class="${P}-nm">${esc(st.name)}</span><span class="${P}-on">${esc(st.status)}</span></p>
  <div class="${P}-body">
    <p class="${P}-day"><span class="${P}-daytag">Today</span></p>
${rows}
  </div>
  <p class="${P}-comp"><span class="${P}-field"></span></p>
  <p class="${P}-home"></p>
</div>`;
}

/* ---- AO3 base (still approximate — reader's site skin varies) ---- */
const BASE=`html,body{margin:0}body{background:#fff;color:#2a2a2a;
 font-family:'Lucida Grande','Lucida Sans Unicode',Verdana,Helvetica,sans-serif;
 font-size:100%;line-height:1.5;padding:14px}
 #workskin{max-width:72em;margin:0 auto}
 .userstuff p{margin:0 0 1.286em}.userstuff a{color:#111}
 .userstuff blockquote{margin:1em 2em}`;

/* ---- state + wiring ---- */
const st={skin:'whatsapp',w:300,h:360,name:'Maya Rivera',status:'online',msgs:[
 {from:'them',text:'did you tell Sam dinner is at 8?',time:'9:41'},
 {from:'me',text:'I told him 7:30.',time:'9:41'},
 {from:'them',text:"smart. he'll arrive at 8.",time:'9:42'}]};
const $=s=>document.querySelector(s);

function drawSkins(){
  $('#skins').innerHTML=Object.entries(SKINS).map(([k,v])=>
    `<button class="skin${k===st.skin?' on':''}" data-k="${k}">${v.label}</button>`).join('');
  $('#skins').querySelectorAll('.skin').forEach(b=>b.onclick=()=>{st.skin=b.dataset.k;drawSkins();render();});
}
function drawMsgs(){
  $('#msgs').innerHTML=st.msgs.map((m,i)=>`
    <div class="msg">
      <div class="top">
        <button class="side${m.from==='them'?' on':''}" data-i="${i}" data-s="them">Them</button>
        <button class="side${m.from==='me'?' on':''}" data-i="${i}" data-s="me">Me</button>
        <input class="tm" data-i="${i}" value="${String(m.time).replace(/&/g,'&amp;').replace(/"/g,'&quot;')}">
        <button class="rm" data-i="${i}">&times;</button>
      </div>
      <textarea data-i="${i}">${m.text.replace(/&/g,'&amp;').replace(/</g,'&lt;')}</textarea>
    </div>`).join('');
  const box=$('#msgs');
  box.querySelectorAll('.side').forEach(b=>b.onclick=()=>{st.msgs[+b.dataset.i].from=b.dataset.s;drawMsgs();render();});
  box.querySelectorAll('.rm').forEach(b=>b.onclick=()=>{st.msgs.splice(+b.dataset.i,1);drawMsgs();render();});
  box.querySelectorAll('textarea').forEach(t=>t.oninput=()=>{st.msgs[+t.dataset.i].text=t.value;render();});
  box.querySelectorAll('.tm').forEach(t=>t.oninput=()=>{st.msgs[+t.dataset.i].time=t.value;render();});
}

/* ---- preview editing -------------------------------------------------
   Runs INSIDE the preview frame and reports edits out by postMessage, so
   it never depends on the parent reading contentDocument. The styles are
   cursor / hover / focus only, so the static render AO3 would produce is
   unchanged. ---------------------------------------------------------- */
const EDIT_CSS=`
.ao3t{cursor:text;outline:none}
.ao3t:empty{display:inline-block;min-width:1.5em;min-height:1em}
.ao3t:hover{outline:1px dashed rgba(122,125,132,.5);outline-offset:2px;border-radius:4px}
.ao3t:focus{outline:2px solid #7a7d84;outline-offset:2px;border-radius:5px}
`;
const EDIT_JS=`(function(){var P=${JSON.stringify(PFX)};
// Wrap only the message text so the focus ring hugs the words. Preview-only.
function wrap(bub){if(!bub)return null;var kids=[],i,n,stop=null;
  for(i=0;i<bub.childNodes.length;i++){n=bub.childNodes[i];
    if(n.nodeType===1&&String(n.className).indexOf(P+'-time')>-1){stop=n;break;}
    kids.push(n);}
  var w=document.createElement('span');w.className='ao3t';
  if(stop)bub.insertBefore(w,stop);else bub.appendChild(w);
  for(i=0;i<kids.length;i++)w.appendChild(kids[i]);
  return w;}
// Editable from the start: the browser handles caret placement, double-click
// word select and drag select natively. No dblclick handler fighting it.
function bind(el,kind,idx){if(!el)return;
  el.setAttribute('contenteditable','true');
  el.setAttribute('spellcheck','false');
  el.addEventListener('input',function(){
    parent.postMessage({ao3edit:1,kind:kind,idx:idx,value:el.textContent},'*');});
  el.addEventListener('keydown',function(e){
    if(e.key==='Enter'||e.key==='Escape'){e.preventDefault();el.blur();}});
  el.addEventListener('blur',function(){
    parent.postMessage({ao3edit:1,kind:kind,idx:idx,value:el.textContent.trim(),done:1},'*');});}
var b=document.querySelectorAll('.'+P+'-bub');
for(var i=0;i<b.length;i++)bind(wrap(b[i]),'msg',i);
bind(wrap(document.querySelector('.'+P+'-nm')),'name',-1);
bind(wrap(document.querySelector('.'+P+'-on')),'status',-1);})();`;

window.addEventListener('message',function(e){
  const m=e.data; if(!m||!m.ao3edit) return;
  if(m.kind==='msg'){
    if(!st.msgs[m.idx]) return;
    st.msgs[m.idx].text=m.value;
    const ta=document.querySelector('#msgs textarea[data-i="'+m.idx+'"]');
    if(ta) ta.value=m.value;
  } else if(m.kind==='name'){ st.name=m.value; }
  else if(m.kind==='status'){ st.status=m.value; }
  // A message edit is already visible in the frame, so outputs are enough.
  // Name/status can also appear per row (KakaoTalk), so refresh once settled.
  if(m.done&&m.kind!=='msg') render(); else renderOut();
  if(m.done) snapshot();    // one history entry per finished edit
});

function renderOut(){
  const rawH=buildHtml(st), rawC=buildCss(st.skin,st.w,st.h);
  const ch=cleanHtml(rawH), cc=cleanCss(rawC);
  $('#o-html').textContent=rawH;
  $('#o-css').textContent=formatCss(rawC);
  const bad=[...cc.bad,...ch.bad];
  $('#lint').innerHTML=bad.length?bad.map(b=>`<div class="lrow">${b}</div>`).join(''):'';
  $('#lint').style.display=bad.length?'block':'none';
  return {ch,cc};
}
function render(){
  const r=renderOut();
  $('#pv').srcdoc=`<!DOCTYPE html><html><head><meta charset="utf-8">
    <style>${BASE}</style><style>${r.cc.css}</style><style>${EDIT_CSS}</style></head>
    <body><div id="workskin"><div class="userstuff">${r.ch.html}</div></div>
    <scr`+`ipt>${EDIT_JS}</scr`+`ipt></body></html>`;
  snapshot();
}
$('#addm').onclick=()=>{st.msgs.push({from:'them',text:'new message',time:'9:43'});drawMsgs();render();};
document.querySelectorAll('.tab').forEach(t=>t.onclick=()=>{
  document.querySelectorAll('.tab').forEach(x=>x.classList.remove('on'));
  document.querySelectorAll('.pane').forEach(p=>p.classList.remove('on'));
  t.classList.add('on');$('#p-'+t.dataset.p).classList.add('on');});
const cp=(txt,btn)=>{navigator.clipboard.writeText(txt).then(()=>{
  const o=btn.textContent;btn.textContent='Copied';setTimeout(()=>btn.textContent=o,1200);});};
$('#cpH').onclick=e=>cp($('#o-html').textContent,e.target);
$('#cpC').onclick=e=>cp($('#o-css').textContent,e.target);


/* ---- undo / redo ----------------------------------------------------
   Snapshots the whole document after each settled change. render() is
   debounced, so a burst of typing collapses into one entry. ---------- */
let hist=[],hi=-1,restoring=false;
function snapshot(){
  if(restoring) return;
  const j=JSON.stringify(st);
  if(hist[hi]===j) return;
  hist=hist.slice(0,hi+1); hist.push(j); hi=hist.length-1;
  if(hist.length>80){ hist.shift(); hi--; }
  syncHist();
}
function syncHist(){ $('#undo').disabled=hi<=0; $('#redo').disabled=hi>=hist.length-1; }
function restore(j){
  restoring=true;
  const o=JSON.parse(j); Object.keys(o).forEach(k=>st[k]=o[k]);
  drawSkins(); drawMsgs(); render();
  restoring=false; syncHist();
}
function setTheme(t){ document.documentElement.setAttribute('data-theme',t);
  $('#theme').setAttribute('aria-checked',String(t==='dark'));
  try{ localStorage.setItem('aochat-theme',t); }catch(e){} }
$('#theme').onclick=()=>setTheme(document.documentElement.getAttribute('data-theme')==='dark'?'light':'dark');
$('#theme').setAttribute('aria-checked',String(document.documentElement.getAttribute('data-theme')==='dark'));
$('#undo').onclick=()=>{ if(hi>0){ hi--; restore(hist[hi]); } };
$('#redo').onclick=()=>{ if(hi<hist.length-1){ hi++; restore(hist[hi]); } };
window.addEventListener('keydown',e=>{
  if(!(e.metaKey||e.ctrlKey)) return;
  const k=e.key.toLowerCase();
  if(k==='z'&&!e.shiftKey){ e.preventDefault(); $('#undo').click(); }
  else if((k==='z'&&e.shiftKey)||k==='y'){ e.preventDefault(); $('#redo').click(); }
});

drawSkins();drawMsgs();render();
