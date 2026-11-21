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
/* Per-skin options. Only the skins that list an option show it in the sidebar. They change the
   generated markup only (same div/span/p + class), never the CSS. */
const OPTDEF={ticks:true,read:false,names:true,outside:true,day:'Today'};
const SKOPT={
 whatsapp:[['ticks','Read ticks on sent messages']],
 imessage:[['read','Show "Read" on the last sent message']],
 line:[['read','Show "Read" on the last sent message']],
 kakao:[['names','Sender name above the bubble'],['outside','Time beside the bubble']]
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
  const s=SKINS[st.skin],P=PFX, o=Object.assign({},OPTDEF,st.opt);
  const lastMe=st.msgs.reduce((a,m,i)=>m.from==='me'?i:a,-1);
  const timeOut=s.timeOutside&&o.outside, nameOn=s.nameAbove&&o.names;
  const ini=st.name.trim().split(/\s+/).map(w=>w[0]||'').slice(0,2).join('').toUpperCase()||'?';
  const rows=st.msgs.map((m,i)=>{
    const me=m.from==='me';
    const tick=(me&&s.tick&&o.ticks)?' '+s.tick:'';
    const rd=(me&&o.read&&SKOPT[st.skin].some(x=>x[0]==='read')&&i===lastMe)?'Read ':'';
    // Skins like KakaoTalk hang the time outside the bubble, name above it.
    if(timeOut){
      const bub=`<span class="${P}-bub${me?' '+P+'-mine':''}">`+esc(m.text)+`</span>`;
      const t=`<span class="${P}-ot">`+esc(m.time)+`</span>`;
      if(me) return `    <p class="${P}-row ${P}-out">`+t+bub+`</p>`;
      return `    <p class="${P}-row ${P}-in"><span class="${P}-av2">`+esc(ini)+`</span><span class="${P}-stack">`
        +(nameOn?`<span class="${P}-who">`+esc(st.name)+`</span>`:'')+bub+`</span>`+t+`</p>`;
    }
    return `    <p class="${P}-row ${P}-${me?'out':'in'}"><span class="${P}-bub${me?' '+P+'-mine':''}">`
      +esc(m.text)+` <span class="${P}-time">`+rd+esc(m.time)+tick+`</span></span></p>`;
  }).join('\n');
  return `<div class="${P}-phone">
  <p class="${P}-bar">9:41</p>
  <p class="${P}-head"><span class="${P}-av">${esc(ini)}</span><span class="${P}-nm">${esc(st.name)}</span><span class="${P}-on">${esc(st.status)}</span></p>
  <div class="${P}-body">
    <p class="${P}-day"><span class="${P}-daytag">${esc(o.day||'Today')}</span></p>
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
const st={skin:'whatsapp',w:300,h:360,name:'Maya Rivera',status:'online',opt:Object.assign({},OPTDEF),msgs:[
 {from:'them',text:'did you tell Sam dinner is at 8?',time:'9:41 AM'},
 {from:'me',text:'I told him 7:30.',time:'9:41 AM'},
 {from:'them',text:"smart. he'll arrive at 8.",time:'9:42 AM'}]};
const $=s=>document.querySelector(s);

/* App tiles for the Skin picker. WhatsApp uses the supplied icon; the others are plain
   placeholders (brand colour + generic bubble) until real icons are added here. */
const BUB='<path d="M16 6c-5.5 0-10 3.6-10 8.1 0 2.6 1.5 4.8 3.8 6.3L9 25l5-2.8c.6.1 1.3.2 2 .2 5.5 0 10-3.6 10-8.2S21.5 6 16 6z"/>';
const WAP='<path d="M26.576 5.363c-2.69-2.69-6.406-4.354-10.511-4.354-8.209 0-14.865 6.655-14.865 14.865 0 2.732 0.737 5.291 2.022 7.491l-0.038-0.070-2.109 7.702 7.879-2.067c2.051 1.139 4.498 1.809 7.102 1.809h0.006c8.209-0.003 14.862-6.659 14.862-14.868 0-4.103-1.662-7.817-4.349-10.507l0 0zM16.062 28.228h-0.005c-0 0-0.001 0-0.001 0-2.319 0-4.489-0.64-6.342-1.753l0.056 0.031-0.451-0.267-4.675 1.227 1.247-4.559-0.294-0.467c-1.185-1.862-1.889-4.131-1.889-6.565 0-6.822 5.531-12.353 12.353-12.353s12.353 5.531 12.353 12.353c0 6.822-5.53 12.353-12.353 12.353h-0zM22.838 18.977c-0.371-0.186-2.197-1.083-2.537-1.208-0.341-0.124-0.589-0.185-0.837 0.187-0.246 0.371-0.958 1.207-1.175 1.455-0.216 0.249-0.434 0.279-0.805 0.094-1.15-0.466-2.138-1.087-2.997-1.852l0.010 0.009c-0.799-0.74-1.484-1.587-2.037-2.521l-0.028-0.052c-0.216-0.371-0.023-0.572 0.162-0.757 0.167-0.166 0.372-0.434 0.557-0.65 0.146-0.179 0.271-0.384 0.366-0.604l0.006-0.017c0.043-0.087 0.068-0.188 0.068-0.296 0-0.131-0.037-0.253-0.101-0.357l0.002 0.003c-0.094-0.186-0.836-2.014-1.145-2.758-0.302-0.724-0.609-0.625-0.836-0.637-0.216-0.010-0.464-0.012-0.712-0.012-0.395 0.010-0.746 0.188-0.988 0.463l-0.001 0.002c-0.802 0.761-1.3 1.834-1.3 3.023 0 0.026 0 0.053 0.001 0.079l-0-0.004c0.131 1.467 0.681 2.784 1.527 3.857l-0.012-0.015c1.604 2.379 3.742 4.282 6.251 5.564l0.094 0.043c0.548 0.248 1.25 0.513 1.968 0.74l0.149 0.041c0.442 0.14 0.951 0.221 1.479 0.221 0.303 0 0.601-0.027 0.889-0.078l-0.031 0.004c1.069-0.223 1.956-0.868 2.497-1.749l0.009-0.017c0.165-0.366 0.261-0.793 0.261-1.242 0-0.185-0.016-0.366-0.047-0.542l0.003 0.019c-0.092-0.155-0.34-0.247-0.712-0.434z"/>';
const TILE={whatsapp:['#25d366','#fff',WAP],imessage:'icons/imessage.png',line:'icons/line.png',kakao:'icons/kakao.png'};
function miniTile(k){ const t=TILE[k]; if(!t) return '';
  return typeof t==='string'?`<span class="ico mini"><img src="${t}" alt=""></span>`
    :`<span class="ico mini" style="background:${t[0]}"><svg viewBox="0 0 32 32" fill="${t[1]}" aria-hidden="true">${t[2]}</svg></span>`; }
function drawSkins(){
  $('#skins').innerHTML=Object.entries(SKINS).map(([k,v])=>{ const t=TILE[k]||['#888','#fff',BUB], on=k===st.skin, chk=on?'<i class="chk"><svg viewBox="0 0 12 12" width="10" height="10" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2.5 6.3l2.5 2.5 4.5-5"/></svg></i>':'';
    if(typeof t==='string') return `<button class="skin${on?' on':''}" data-k="${k}" aria-pressed="${on}"><span class="ico"><img src="${t}" alt="" width="42" height="42">${chk}</span><span class="nm">${v.label}</span></button>`;
    return `<button class="skin${on?' on':''}" data-k="${k}" aria-pressed="${on}"><span class="ico" style="background:${t[0]}"><svg viewBox="0 0 32 32" width="26" height="26" fill="${t[1]}" aria-hidden="true">${t[2]}</svg>${chk}</span><span class="nm">${v.label}</span></button>`; }).join('');
  $('#skins').querySelectorAll('.skin').forEach(b=>b.onclick=()=>{st.skin=b.dataset.k;drawSkins();render();});
  drawOpts(); railSync();
}
var railSync=function(){};
/* Which sidebar sections each skin offers. Add a key to SKSECS to change one skin's list. */
const SKSECS={whatsapp:['skin','opts','msgs','device'],imessage:['skin','opts','msgs','device'],line:['skin','opts','msgs','device'],kakao:['skin','opts','msgs','device']};
/* Options that belong to the chosen skin; the list changes when the skin does. */
function drawOpts(){
  const box=$('#skopts'), list=SKOPT[st.skin]||[], o=Object.assign({},OPTDEF,st.opt);
  box.innerHTML=`<label class="f">${SKINS[st.skin].label} options</label>`
    +list.map(([k,l])=>`<button class="switch orow" role="switch" aria-checked="${!!o[k]}" data-o="${k}"><span>${l}</span><i class="trk"></i></button>`).join('')
    +`<label class="orow dayrow"><span>Date label</span><input type="text" id="oday" maxlength="24" value="${esc(o.day)}" aria-label="Date label"></label>`;
  box.querySelectorAll('.orow[data-o]').forEach(b=>b.onclick=()=>{ st.opt=Object.assign({},OPTDEF,st.opt); const k=b.dataset.o; st.opt[k]=!st.opt[k]; b.setAttribute('aria-checked',String(st.opt[k])); render(); });
  $('#oday').oninput=e=>{ st.opt=Object.assign({},OPTDEF,st.opt); st.opt.day=e.target.value; render(); };
}
/* Time picker: click the time to open a native date + time field. Its segments
   are keyboard-editable and its calendar button opens the browser's date picker.
   The chat shows the time as "h:mm AM/PM"; the full value is kept as m.at. */
const tpop=document.createElement('div'); tpop.className='pmenu tpop'; tpop.hidden=true;
tpop.setAttribute('role','dialog'); tpop.setAttribute('aria-label','Date and time');
tpop.innerHTML='<div class="trow"><span class="tseg" id="tseg" role="group" aria-label="Date and time">'
  +'<span class="sg" data-seg="mo" role="spinbutton" tabindex="0" aria-label="Month"></span><i>/</i>'
  +'<span class="sg" data-seg="d" role="spinbutton" tabindex="0" aria-label="Day"></span><i>/</i>'
  +'<span class="sg" data-seg="y" role="spinbutton" tabindex="0" aria-label="Year"></span><i>,&nbsp;</i>'
  +'<span class="sg" data-seg="h" role="spinbutton" tabindex="0" aria-label="Hour"></span><i>:</i>'
  +'<span class="sg" data-seg="mi" role="spinbutton" tabindex="0" aria-label="Minute"></span><i>&nbsp;</i>'
  +'<span class="sg" data-seg="ap" role="spinbutton" tabindex="0" aria-label="AM or PM"></span></span><input type="hidden" id="tpi">'
  +'<button type="button" id="tcal" aria-expanded="false" aria-label="Open calendar" title="Calendar"><svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><rect x="1.5" y="2.5" width="11" height="10" rx="1.5"/><path d="M1.5 5.5h11M4.5 1v3M9.5 1v3"/></svg></button>'
  +'<button type="button" id="tpd" aria-label="Done" title="Done"><svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2.5 7.5l3 3 6-7"/></svg></button></div><div class="cal" id="cal" hidden></div>';
document.body.appendChild(tpop);
let tbtn=null;
const pad=n=>String(n).padStart(2,'0');
function fmtTime(v){ const m=/^\d{4}-\d\d-\d\dT(\d\d):(\d\d)/.exec(v||''); if(!m) return '';
  const h=+m[1]; return (h%12||12)+':'+m[2]+' '+(h<12?'AM':'PM'); }
function timeValue(m){
  if(typeof m.at==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d$/.test(m.at)) return m.at;
  const d=new Date(), day=d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
  const t=/(\d{1,2}):(\d{2})\s*([ap])?/i.exec(m.time||'');
  if(!t) return day+'T'+pad(d.getHours())+':'+pad(d.getMinutes());
  let h=+t[1]%24; const ap=(t[3]||'').toLowerCase();
  if(ap==='p'&&h<12) h+=12; if(ap==='a'&&h===12) h=0;
  return day+'T'+pad(h)+':'+t[2];
}
/* Calendar + time lists, drawn here (not the browser's popup) so they use the
   site's own colours and work the same in every browser. */
/* Segmented date/time field. The highlighted part is the one you are editing:
   type digits, use Up/Down to change it, Left/Right (or Tab) to move. */
const tseg=tpop.querySelector('#tseg');
const dim=(y,m)=>new Date(y,m,0).getDate();
function updateSeg(){
  const p=parseAt(tpop.querySelector('#tpi').value); if(!p) return;
  const v={mo:pad(p.mo),d:pad(p.d),y:String(p.y).padStart(4,'0'),h:pad(p.h%12||12),mi:pad(p.mi),ap:p.h<12?'AM':'PM'};
  tseg.querySelectorAll('.sg').forEach(e=>{ if(e!==document.activeElement||!segBuf) e.textContent=v[e.dataset.seg]; });
}
let segBuf='';
tseg.addEventListener('focusin',e=>{ if(!e.target.dataset.seg) return; segBuf=''; updateSeg(); });
tseg.addEventListener('click',e=>{ const g=e.target.closest('.sg'); if(g) g.focus(); });
tseg.addEventListener('keydown',e=>{
  const el=e.target.closest('.sg'); if(!el) return;
  const k=el.dataset.seg, segs=[...tseg.querySelectorAll('.sg')], i=segs.indexOf(el);
  const inp=tpop.querySelector('#tpi'), p=parseAt(inp.value); if(!p) return;
  const go=n=>{ const t=segs[i+n]; if(t){ t.focus(); } };
  const clamp=q=>{ q.d=Math.min(q.d,dim(q.y,q.mo)); return q; };
  const h12=p.h%12||12, pm=p.h>=12;
  if(e.key==='ArrowRight'){ e.preventDefault(); go(1); return; }
  if(e.key==='ArrowLeft'){ e.preventDefault(); go(-1); return; }
  if(e.key==='ArrowUp'||e.key==='ArrowDown'){ e.preventDefault(); segBuf='';
    const d=e.key==='ArrowUp'?1:-1;
    if(k==='mo') p.mo=(p.mo-1+d+12)%12+1;
    else if(k==='d') p.d=(p.d-1+d+dim(p.y,p.mo))%dim(p.y,p.mo)+1;
    else if(k==='y') p.y=Math.min(9999,Math.max(1900,p.y+d));
    else if(k==='h') p.h=((h12-1+d+12)%12+1)%12+(pm?12:0);
    else if(k==='mi') p.mi=(p.mi+d+60)%60;
    else p.h=(p.h+12)%24;
    setAt(clamp(p)); return; }
  if(k==='ap'&&/^[ap]$/i.test(e.key)){ e.preventDefault(); const want=e.key.toLowerCase()==='p';
    if(want!==pm) setAt(Object.assign(p,{h:(p.h+12)%24})); return; }
  if(/^\d$/.test(e.key)){ e.preventDefault(); if(k==='ap') return;
    if(k==='y'){ segBuf=(segBuf+e.key).slice(0,4); el.textContent=segBuf.padStart(4,'0');
      if(segBuf.length===4&&+segBuf>=1900){ p.y=+segBuf; segBuf=''; setAt(clamp(p)); go(1); } return; }
    const max={mo:12,d:dim(p.y,p.mo),h:12,mi:59}[k], min=(k==='mi')?0:1;
    let b=segBuf+e.key, n=+b;
    if(b.length>2||n>max){ b=e.key; n=+b; }                     // not a valid 2-digit value: start over with this digit
    segBuf=b;
    if(n>=min&&n<=max){
      if(k==='mo') p.mo=n; else if(k==='d') p.d=n; else if(k==='mi') p.mi=n; else p.h=(n%12)+(pm?12:0);
      setAt(clamp(p));
    }
    if(b.length===2||n*10>max){ segBuf=''; go(1); }
    else el.textContent=pad(n);
    return; }
  if(e.key==='Enter'){ e.preventDefault(); tpop.querySelector('#tpd').click(); }
});
const tinp=tpop.querySelector('#tpi'), calEl=tpop.querySelector('#cal'), calBtn=tpop.querySelector('#tcal');
const MONTHS=['January','February','March','April','May','June','July','August','September','October','November','December'];
let cview=null;
const parseAt=v=>{ const m=/^(\d{4})-(\d\d)-(\d\d)T(\d\d):(\d\d)$/.exec(v||''); return m?{y:+m[1],mo:+m[2],d:+m[3],h:+m[4],mi:+m[5]}:null; };
const mkAt=p=>String(p.y).padStart(4,'0')+'-'+pad(p.mo)+'-'+pad(p.d)+'T'+pad(p.h)+':'+pad(p.mi);
function setAt(p){ tinp.value=mkAt(p); if(tinp.oninput) tinp.oninput(); updateSeg(); drawCal(); }
function drawCal(){
  const p=parseAt(tinp.value); if(!p){ calEl.innerHTML=''; return; }
  if(!cview) cview={y:p.y,m:p.mo-1};
  const first=new Date(cview.y,cview.m,1), off=first.getDay(), now=new Date();
  const same=(d,y,m,dd)=>d.getFullYear()===y&&d.getMonth()===m&&d.getDate()===dd;
  let g='';
  for(let i=0;i<42;i++){ const d=new Date(cview.y,cview.m,1-off+i);
    const cls=['cd'+(d.getMonth()!==cview.m?' out':''),same(d,p.y,p.mo-1,p.d)?'sel':'',same(d,now.getFullYear(),now.getMonth(),now.getDate())?'today':''].join(' ');
    g+=`<button type="button" class="${cls}" data-y="${d.getFullYear()}" data-m="${d.getMonth()}" data-d="${d.getDate()}"${same(d,p.y,p.mo-1,p.d)?' aria-pressed="true"':''}>${d.getDate()}</button>`; }
  const h12=p.h%12||12, ap=p.h<12?'AM':'PM';
  const col=(cls,items)=>`<div class="tc ${cls}">${items}</div>`;
  const hrs=col('th',Array.from({length:12},(_,i)=>i+1).map(h=>`<button type="button" class="ti${h===h12?' sel':''}" data-h="${h}">${pad(h)}</button>`).join(''));
  const mins=col('tm2',Array.from({length:60},(_,i)=>i).map(m=>`<button type="button" class="ti${m===p.mi?' sel':''}" data-mi="${m}">${pad(m)}</button>`).join(''));
  const aps=col('ta',['AM','PM'].map(a=>`<button type="button" class="ti${a===ap?' sel':''}" data-ap="${a}">${a}</button>`).join(''));
  calEl.innerHTML=`<div class="cdate"><div class="chead"><button type="button" class="cn" data-n="-1" aria-label="Previous month">&lsaquo;</button>
    <span class="cm">${MONTHS[cview.m]} ${cview.y}</span><button type="button" class="cn" data-n="1" aria-label="Next month">&rsaquo;</button></div>
    <div class="cwk">${['Su','Mo','Tu','We','Th','Fr','Sa'].map(x=>'<span>'+x+'</span>').join('')}</div>
    <div class="cgrid">${g}</div><div class="cfoot"><button type="button" class="ctoday">Today</button></div></div>
    <div class="ctime">${hrs}${mins}${aps}</div>`;
  calEl.querySelectorAll('.tc').forEach(c=>{ const s=c.querySelector('.sel'); if(s) c.scrollTop=s.offsetTop-c.clientHeight/2+s.offsetHeight/2; });
}
calEl.addEventListener('click',e=>{
  const b=e.target.closest('button'); if(!b) return; const p=parseAt(tinp.value); if(!p) return;
  if(b.dataset.n){ const d=new Date(cview.y,cview.m+ +b.dataset.n,1); cview={y:d.getFullYear(),m:d.getMonth()}; drawCal(); return; }
  if(b.classList.contains('ctoday')){ const n=new Date(); cview={y:n.getFullYear(),m:n.getMonth()}; setAt({y:n.getFullYear(),mo:n.getMonth()+1,d:n.getDate(),h:n.getHours(),mi:n.getMinutes()}); return; }
  if(b.dataset.d){ const y=+b.dataset.y,m=+b.dataset.m; cview={y,m}; setAt(Object.assign(p,{y,mo:m+1,d:+b.dataset.d})); return; }
  const pm=p.h>=12;
  if(b.dataset.h){ p.h=(+b.dataset.h%12)+(pm?12:0); setAt(p); }
  else if(b.dataset.mi){ p.mi=+b.dataset.mi; setAt(p); }
  else if(b.dataset.ap){ p.h=(p.h%12)+(b.dataset.ap==='PM'?12:0); setAt(p); }
});
calEl.addEventListener('keydown',e=>{            // arrow keys move between days
  const b=e.target.closest('.cd'); if(!b) return;
  const step={ArrowLeft:-1,ArrowRight:1,ArrowUp:-7,ArrowDown:7}[e.key]; if(!step) return;
  e.preventDefault(); const p=parseAt(tinp.value); if(!p) return;
  const d=new Date(+b.dataset.y,+b.dataset.m,+b.dataset.d+step);
  cview={y:d.getFullYear(),m:d.getMonth()}; setAt(Object.assign(p,{y:d.getFullYear(),mo:d.getMonth()+1,d:d.getDate()}));
  const n=calEl.querySelector('.cd.sel'); if(n) n.focus();
});
function showCal(on){ calEl.hidden=!on; calBtn.setAttribute('aria-expanded',String(on)); if(on){ cview=null; drawCal(); }
  tpop.style.left=Math.max(8,Math.min(parseFloat(tpop.style.left)||8,innerWidth-tpop.offsetWidth-8))+'px'; }
calBtn.onclick=()=>showCal(calEl.hidden);
function closeTime(){ tpop.hidden=true; showCal(false); if(tbtn){ tbtn.setAttribute('aria-expanded','false'); tbtn=null; } }
function openTime(b){
  if(tbtn===b){ closeTime(); return; }
  closeTime(); closeWho(); tbtn=b; const i=+b.dataset.i, inp=tinp;
  inp.value=timeValue(st.msgs[i]); updateSeg(); b.setAttribute('aria-expanded','true');
  inp.oninput=()=>{ if(!/^\d{4}-\d\d-\d\dT\d\d:\d\d$/.test(inp.value)) return;   // cleared, half-typed or odd year: wait
    const m=st.msgs[i]; m.at=inp.value; m.time=fmtTime(inp.value);
    b.innerHTML=esc(m.time); render(); };
  const r=b.getBoundingClientRect();
  tpop.hidden=false;
  tpop.style.top=(r.bottom+window.scrollY+4)+'px';
  tpop.style.left=Math.max(8,Math.min(r.left,innerWidth-tpop.offsetWidth-8))+'px';
  tseg.querySelector('.sg').focus();
}
tpop.querySelector('#tpd').onclick=()=>{ const b=tbtn; closeTime(); if(b) b.focus(); };
document.addEventListener('pointerdown',e=>{ if(!tpop.hidden&&!tpop.contains(e.target)&&!(tbtn&&tbtn.contains(e.target))) closeTime(); });
document.addEventListener('keydown',e=>{ if(e.key==='Escape'&&!tpop.hidden){ const b=tbtn; closeTime(); if(b) b.focus(); } });

/* Speaker picker: a button showing who sent the message; click for the list. */
const wmenu=document.createElement('div'); wmenu.className='pmenu wmenu'; wmenu.setAttribute('role','menu'); wmenu.hidden=true;
document.body.appendChild(wmenu);
let wbtn=null;
function closeWho(){ wmenu.hidden=true; if(wbtn){ wbtn.setAttribute('aria-expanded','false'); wbtn=null; } }
function openWho(b){
  if(wbtn===b){ closeWho(); return; }
  closeWho(); wbtn=b; const i=+b.dataset.i, cur=st.msgs[i].from;
  wmenu.innerHTML=[['me','Me'],['them',st.name]].map(([v,l])=>
    `<button role="menuitemradio" aria-checked="${cur===v}" data-v="${v}"><span>${esc(l)}</span><span class="ck">${cur===v?'\u2713':''}</span></button>`).join('');
  wmenu.querySelectorAll('button').forEach(x=>x.onclick=e=>{ e.stopPropagation();
    st.msgs[i].from=x.dataset.v; closeWho(); drawMsgs(); render(); });
  const r=b.getBoundingClientRect();
  wmenu.hidden=false; wmenu.style.minWidth=Math.max(160,r.width)+'px';
  wmenu.style.top=(r.bottom+window.scrollY+4)+'px';
  wmenu.style.left=Math.max(8,Math.min(r.left,innerWidth-wmenu.offsetWidth-8))+'px';
  b.setAttribute('aria-expanded','true'); (wmenu.querySelector('[aria-checked=true]')||wmenu.querySelector('button')).focus();
}
document.addEventListener('click',e=>{ if(!wmenu.hidden&&!wmenu.contains(e.target)) closeWho(); });
document.addEventListener('keydown',e=>{ if(e.key==='Escape'&&!wmenu.hidden){ const b=wbtn; closeWho(); if(b) b.focus(); } });
function refreshWho(){ document.querySelectorAll('.msg').forEach((c,i)=>{
  const n=c.querySelector('.who .wn'); if(n&&st.msgs[i]) n.textContent=st.msgs[i].from==='me'?'Me':st.name; }); }
function drawMsgs(){
  $('#msgs').innerHTML=st.msgs.map((m,i)=>`
    <div class="msg" data-i="${i}">
      <div class="mvbox" role="group" aria-label="Reorder message ${i+1}">
        <button class="mv up" data-i="${i}" data-d="-1" aria-label="Move message up" title="Move up"${i===0?' disabled':''}><span class="chev"></span></button>
        <button class="grip" data-i="${i}" draggable="true" aria-label="Drag to reorder" title="Drag to reorder"><span class="dots"></span></button>
        <button class="mv dn" data-i="${i}" data-d="1" aria-label="Move message down" title="Move down"${i===st.msgs.length-1?' disabled':''}><span class="chev"></span></button>
      </div>
      <div class="mbody">
        <div class="top">
          <button class="who" data-i="${i}" aria-haspopup="menu" aria-expanded="false" title="Who sent this message"><span class="wn">${esc(m.from==='me'?'Me':st.name)}</span><span class="wch"></span></button>
          <button class="tm" data-i="${i}" aria-haspopup="dialog" aria-expanded="false" title="Edit date and time">${esc(m.time)||'&nbsp;'}</button>
          <button class="rm" data-i="${i}" aria-label="Delete message" title="Delete message"><svg width="8" height="8" viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><path d="M1.5 1.5l7 7M8.5 1.5l-7 7"/></svg></button>
        </div>
        <textarea data-i="${i}">${m.text.replace(/&/g,'&amp;').replace(/</g,'&lt;')}</textarea>
      </div>
    </div>`).join('');
  const box=$('#msgs');
  const move=(i,j)=>{ if(i===j||j<0||j>=st.msgs.length) return;
    const [t]=st.msgs.splice(i,1); st.msgs.splice(j,0,t); drawMsgs(); render(); };
  box.querySelectorAll('.who').forEach(b=>b.onclick=e=>{ e.stopPropagation(); openWho(b); });
  box.querySelectorAll('.mv').forEach(b=>b.onclick=()=>move(+b.dataset.i,+b.dataset.i+ +b.dataset.d));
  // Drag the grip to reorder. The whole card is the drop target.
  let from=-1, touchDrag=false;
  box.querySelectorAll('.grip').forEach(g=>{
    // Touch / pen: pointer-based drag (HTML5 drag-and-drop does not work from touch).
    g.onpointerdown=e=>{ if(e.pointerType==='mouse'||e.button>0) return;
      e.preventDefault(); touchDrag=true; from=+g.dataset.i;
      const c=g.closest('.msg'); c.classList.add('drag'); g.setPointerCapture(e.pointerId);
      let sc=box; while(sc&&!(sc.scrollHeight>sc.clientHeight&&/(auto|scroll)/.test(getComputedStyle(sc).overflowY))) sc=sc.parentElement;
      let y=e.clientY, raf=0;
      const hit=()=>{ const t=document.elementFromPoint(e.clientX||g.getBoundingClientRect().left+4,y);
        const m=t&&t.closest&&t.closest('.msg'); box.querySelectorAll('.msg').forEach(x=>x.classList.toggle('over',x===m&&+x.dataset.i!==from)); return m; };
      const tick=()=>{ if(!touchDrag) return; if(sc){ const r=sc.getBoundingClientRect();
          if(y<r.top+50) sc.scrollTop-=10; else if(y>r.bottom-50) sc.scrollTop+=10; } hit(); raf=requestAnimationFrame(tick); };
      raf=requestAnimationFrame(tick);
      g.onpointermove=ev=>{ y=ev.clientY; };
      const done=ev=>{ cancelAnimationFrame(raf); g.onpointermove=g.onpointerup=g.onpointercancel=null; touchDrag=false;
        const m=ev.type==='pointerup'?hit():null; const f=from; from=-1;
        box.querySelectorAll('.msg').forEach(x=>x.classList.remove('drag','over'));
        if(m&&f>=0) move(f,+m.dataset.i); };
      g.onpointerup=done; g.onpointercancel=done; };
    g.ondragstart=e=>{ if(touchDrag){ e.preventDefault(); return; } from=+g.dataset.i; e.dataTransfer.effectAllowed='move';
      e.dataTransfer.setData('text/plain',String(from));
      const c=g.closest('.msg'); e.dataTransfer.setDragImage(c,12,12); c.classList.add('drag'); };
    g.ondragend=()=>{ from=-1; box.querySelectorAll('.msg').forEach(c=>c.classList.remove('drag','over')); };
    // Keyboard: arrows on the grip move the message too.
    g.onkeydown=e=>{ const d=e.key==='ArrowUp'?-1:e.key==='ArrowDown'?1:0; if(!d) return;
      e.preventDefault(); const i=+g.dataset.i; move(i,i+d);
      const n=box.querySelector('.grip[data-i="'+(i+d)+'"]'); if(n) n.focus(); };
  });
  box.querySelectorAll('.msg').forEach(c=>{
    c.ondragover=e=>{ if(from<0) return; e.preventDefault(); e.dataTransfer.dropEffect='move';
      box.querySelectorAll('.msg').forEach(x=>x.classList.toggle('over',x===c&&+c.dataset.i!==from)); };
    c.ondrop=e=>{ if(from<0) return; e.preventDefault(); const f=from; from=-1; move(f,+c.dataset.i); };
  });
  box.querySelectorAll('.rm').forEach(b=>b.onclick=()=>{st.msgs.splice(+b.dataset.i,1);drawMsgs();render();});
  box.querySelectorAll('textarea').forEach(t=>t.oninput=()=>{st.msgs[+t.dataset.i].text=t.value;render();});
  box.querySelectorAll('.tm').forEach(b=>b.onclick=e=>{ e.stopPropagation(); openTime(b); });
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
bind(wrap(document.querySelector('.'+P+'-on')),'status',-1);
var ph=document.querySelector('.'+P+'-phone'),pr=ph&&ph.getBoundingClientRect();
parent.postMessage({ao3size:1,h:pr?Math.ceil(pr.bottom+(window.scrollY||0)):document.documentElement.scrollHeight,w:pr?Math.ceil(pr.width):0},'*');})();`;

window.addEventListener('message',function(e){
  const m=e.data; if(m&&m.ao3size){ pvH=m.h; pvW=m.w; fitPreview(); return; }
  if(!m||!m.ao3edit) return;
  if(m.kind==='msg'){
    if(!st.msgs[m.idx]) return;
    st.msgs[m.idx].text=m.value;
    const ta=document.querySelector('#msgs textarea[data-i="'+m.idx+'"]');
    if(ta) ta.value=m.value;
  } else if(m.kind==='name'){ st.name=m.value; refreshWho(); }
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
    <style>${BASE}</style><style>body{background:${getComputedStyle(document.documentElement).getPropertyValue('--canvas').trim()||'#fff'}}</style><style>${r.cc.css}</style><style>${EDIT_CSS}</style></head>
    <body><div id="workskin"><div class="userstuff">${r.ch.html}</div></div>
    <scr`+`ipt>${EDIT_JS}</scr`+`ipt></body></html>`;
  snapshot();
}
$('#addm').onclick=()=>{st.msgs.push({from:'them',text:'new message',time:'9:43 AM'});drawMsgs();render();};
/* ---- preview zoom (site chrome only; never part of the export) ------
   Scales the iframe with a transform and enlarges its layout box by 1/z so it
   still fills the pane. -------------------------------------------------- */
let zoom=1,pvH=0,pvW=0,fitPending=true;
const ZMIN=.25,ZMAX=2;
function setZoom(z){
  zoom=Math.min(ZMAX,Math.max(ZMIN,Math.round(z*100)/100));
  const f=$('#pv').style; f.width=100/zoom+'%'; f.height=100/zoom+'%'; f.transform='scale('+zoom+')';
  $('#zval').textContent=Math.round(zoom*100)+'%';
  $('#zout').disabled=zoom<=ZMIN; $('#zin').disabled=zoom>=ZMAX;
}
const zstep=z=>z>=1?.25:.1;
$('#zout').onclick=()=>{ fitPending=false; setZoom(zoom-zstep(zoom-.001)); };
$('#zin').onclick=()=>{ fitPending=false; setZoom(zoom+zstep(zoom)); };
$('#zval').onclick=()=>{ fitPending=false; setZoom(1); };
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
  queueSave();
}
function syncHist(){ $('#undo').disabled=hi<=0; $('#redo').disabled=hi>=hist.length-1; }

/* phone size (Device section of the rail) */
function syncDevice(){ $('#sw').value=st.w; $('#swv').textContent=st.w+'px'; $('#sh').value=st.h; $('#shv').textContent=st.h+'px'; }
$('#sw').oninput=e=>{ st.w=+e.target.value; $('#swv').textContent=st.w+'px'; render(); };
$('#sh').oninput=e=>{ st.h=+e.target.value; $('#shv').textContent=st.h+'px'; render(); };
function restore(j){
  restoring=true;
  const o=JSON.parse(j); Object.keys(o).forEach(k=>st[k]=o[k]);
  drawSkins(); drawMsgs(); syncDevice(); render();
  restoring=false; syncHist();
  queueSave();
}
function setTheme(t){ document.documentElement.setAttribute('data-theme',t);
  $('#theme').setAttribute('aria-checked',String(t==='dark'));
  try{ localStorage.setItem('aochat-theme',t); }catch(e){}
  if($('#pv').getAttribute('srcdoc')) render(); }   // repaint the page behind the phone
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


/* ---- local projects -------------------------------------------------
   Account-free and offline: projects live in this browser's IndexedDB
   (store.js). Nothing is sent anywhere. The status indicator is driven by the
   real result of each IndexedDB transaction, never assumed. -------------- */
const PJ={cur:null,list:[],ready:false,timer:null,writing:null,lastJson:'',failed:false,err:null,
  edited:false,persist:'unknown',status:'loading'};
const DEFAULT_ST=JSON.stringify({skin:st.skin,w:st.w,h:st.h,name:st.name,status:st.status,opt:st.opt,msgs:st.msgs});

/* Accept only the fields the editor understands, whatever the source (old
   save, imported file). Same shape as `st`; unknown keys are dropped. */
/* Times are always shown as "h:mm AM/PM". Plain "9:41" / "21:05" / "9:41 pm" from older
   saves or imports are converted once; anything else typed freely is left alone. */
function normTime(t){
  let m=/^\s*(\d{1,2}):(\d{2})\s*$/.exec(t), h, ap;
  if(m){ h=+m[1]; if(h>23) return t; ap=h<12?'AM':'PM'; }
  else if((m=/^\s*(\d{1,2}):(\d{2})\s*([ap])\.?m\.?\s*$/i.exec(t))){ h=+m[1]; if(h<1||h>12) return t; ap=m[3].toUpperCase()+'M'; }
  else return t;
  if(+m[2]>59) return t;
  return (h%12||12)+':'+m[2]+' '+ap;
}
function cleanState(d){
  const base=JSON.parse(DEFAULT_ST), o=(d&&typeof d==='object')?d:{};
  const str=(v,max,def)=>typeof v==='string'?v.slice(0,max):def;
  const num=(v,lo,hi,def)=>(typeof v==='number'&&isFinite(v))?Math.min(hi,Math.max(lo,v)):def;
  const msgs=(Array.isArray(o.msgs)?o.msgs:base.msgs).slice(0,1000)
    .map(m=>{ const r={from:(m&&m.from==='me')?'me':'them',text:str(m&&m.text,5000,''),time:normTime(str(m&&m.time,40,''))};
      if(m&&typeof m.at==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d$/.test(m.at)) r.at=m.at; return r; });
  return {skin:SKINS[o.skin]?o.skin:base.skin,w:num(o.w,100,1000,base.w),h:num(o.h,100,2000,base.h),
    name:str(o.name,200,base.name),status:str(o.status,200,base.status),
    opt:(()=>{ const p=(o.opt&&typeof o.opt==='object')?o.opt:{}, r={};
      Object.keys(OPTDEF).forEach(k=>{ r[k]=typeof OPTDEF[k]==='boolean'?(typeof p[k]==='boolean'?p[k]:OPTDEF[k]):str(p[k],24,OPTDEF[k]); }); return r; })(),msgs};
}
function applyState(data){ const c=cleanState(data); Object.keys(st).forEach(k=>delete st[k]); Object.assign(st,c); }
function showProject(rec){
  PJ.cur=rec; restoring=true; applyState(rec.data); hist=[]; hi=-1;
  PJ.lastJson=JSON.stringify(st); PJ.failed=false; PJ.err=null;
  clearTimeout(PJ.timer); PJ.timer=null;
  drawSkins(); drawMsgs(); syncDevice(); render(); restoring=false;
  snapshot();
  syncHist(); setStatus('saved');
}

function setStatus(s){
  PJ.status=s; const el=$('#savest'); el.dataset.s=s;
  const tx={loading:'Opening…',saving:'Saving…',saved:'Saved locally',
    failed:'Save failed — retry',unavailable:'Not saved — storage unavailable'}[s];
  $('#savetx').textContent=tx;
  const when=PJ.cur&&PJ.cur.updated?new Date(PJ.cur.updated).toLocaleTimeString([],{hour:'numeric',minute:'2-digit'}):'';
  el.title=s==='saved'?'Saved in this browser'+(when?' at '+when:'')+'. Not synced anywhere — export a backup to keep a copy.'
    :s==='failed'?'Could not write to browser storage ('+((PJ.err&&(PJ.err.name||PJ.err.message))||'unknown error')+'). Your changes are only in this open tab. Click to retry, or export a backup.'
    :s==='unavailable'?'This browser is not allowing local storage (private mode or storage turned off). Your work is only in this open tab — use Export to keep a copy.'
    :s==='saving'?'Writing to this browser’s storage…':'';
  el.style.cursor=s==='failed'?'pointer':'';
}
$('#savest').onclick=()=>{ if(PJ.status==='failed') flush(); };

function queueSave(){
  if(!PJ.ready||!PJ.cur||restoring) return;
  if(JSON.stringify(st)===PJ.lastJson&&!PJ.failed) return;
  PJ.edited=true; setStatus('saving');
  clearTimeout(PJ.timer); PJ.timer=setTimeout(flush,600);
}
async function flush(){
  clearTimeout(PJ.timer); PJ.timer=null;
  if(!PJ.ready||!PJ.cur) return;
  if(PJ.writing){ await PJ.writing; if(!PJ.failed&&JSON.stringify(st)!==PJ.lastJson) return flush(); return; }
  const id=PJ.cur.id, j=JSON.stringify(st);
  if(j===PJ.lastJson&&!PJ.failed){ if(!PJ.timer) setStatus('saved'); return; }
  setStatus('saving');
  PJ.writing=AoStore.save(id,JSON.parse(j)).then(t=>{
    if(PJ.cur&&PJ.cur.id===id){ PJ.lastJson=j; PJ.cur.updated=t; }
    PJ.failed=false; PJ.err=null;
    if(!PJ.timer&&JSON.stringify(st)===j) setStatus('saved');
    chan('saved',id); afterSave();
  },e=>{ PJ.failed=true; PJ.err=e; setStatus('failed'); }).then(()=>{ PJ.writing=null; });
  return PJ.writing;
}
/* After the user's first real edit has been written, ask the browser to keep
   this site's data. The browser may say no (or ask the user); we only report
   what it answered. */
async function afterSave(){
  if(!PJ.edited||PJ.persist==='persistent'||PJ.persistAsked) return;
  PJ.persistAsked=true; PJ.persist=await AoStore.persistence(true); showPersist();
}
function showPersist(){}   // result kept in PJ.persist; no menu text

/* cross-tab: keep the project list fresh, never overwrite unsaved work */
let bc=null; try{ bc=new BroadcastChannel('aochat'); }catch(e){}
const chan=(t,id)=>{ try{ bc&&bc.postMessage({t,id}); }catch(e){} };
if(bc) bc.onmessage=async e=>{
  const m=e.data||{}; if(!PJ.ready) return;
  const idle=!PJ.timer&&!PJ.writing&&JSON.stringify(st)===PJ.lastJson;
  try{
    if(m.t==='deleted'&&PJ.cur&&m.id===PJ.cur.id){ await afterDelete(); return; }
    if(m.t==='saved'&&PJ.cur&&m.id===PJ.cur.id&&idle){ const r=await AoStore.get(m.id); if(r) showProject(r); }
    await refreshList();
  }catch(_){}
};

async function refreshList(){
  PJ.list=await AoStore.list();
  const sel=$('#proj'); sel.innerHTML='';
  PJ.list.forEach(p=>{ const o=document.createElement('option'); o.value=p.id; o.textContent=p.name; sel.appendChild(o); });
  if(PJ.cur) sel.value=PJ.cur.id; sel.disabled=!PJ.list.length;
}
function uniqueName(base){
  const have=new Set(PJ.list.map(p=>p.name)); if(!have.has(base)) return base;
  let n=2; while(have.has(base+' '+n)) n++; return base+' '+n;
}

/* small modal built on <dialog>; resolves to the typed value, true, or null */
function ask(o){ return new Promise(res=>{
  const d=$('#dlg'),inp=$('#dlgI'),ok=$('#dlgOk');
  $('#dlgT').textContent=o.title; $('#dlgP').textContent=o.text||'';
  inp.hidden=!o.input; inp.required=!!o.input; inp.value=o.value||'';
  ok.textContent=o.ok||'OK'; ok.className=o.danger?'danger':'primary';
  $('#dlgNo').hidden=!!o.info;
  d.onclose=()=>res(d.returnValue==='ok'?(o.input?inp.value.trim():true):null);
  d.returnValue=''; d.showModal(); (o.input?inp:ok).focus(); if(o.input) inp.select();
}); }

async function saveBeforeLeaving(){
  await flush();
  if(PJ.failed) return !!(await ask({title:'Changes not saved',danger:true,ok:'Switch anyway',
    text:'The latest changes to this project could not be saved to this browser. Switching will lose them. Export a backup first if you want to keep them.'}));
  return true;
}
async function openId(id){
  if(PJ.cur&&id===PJ.cur.id) return;
  if(!(await saveBeforeLeaving())){ $('#proj').value=PJ.cur.id; return; }
  const r=await AoStore.get(id); if(!r){ await refreshList(); return; }
  showProject(r); AoStore.setMeta('lastOpen',id).catch(()=>{}); refreshList();
}
async function newProject(){
  const name=await ask({title:'New project',input:true,value:uniqueName('Untitled project'),ok:'Create'}); if(!name) return;
  if(!(await saveBeforeLeaving())) return;
  try{ const r=await AoStore.create(name,cleanState(JSON.parse(DEFAULT_ST)));
    PJ.edited=true; showProject(r); AoStore.setMeta('lastOpen',r.id).catch(()=>{}); chan('list'); await refreshList(); }
  catch(e){ fail('Could not create the project',e); }
}
async function renameProject(){
  const name=await ask({title:'Rename project',input:true,value:PJ.cur.name,ok:'Rename'}); if(!name||name===PJ.cur.name) return;
  try{ PJ.cur.name=(await AoStore.rename(PJ.cur.id,name)).name; chan('list'); await refreshList(); }
  catch(e){ fail('Could not rename the project',e); }
}
async function duplicateProject(){
  try{ await flush(); const r=await AoStore.duplicate(PJ.cur.id,uniqueName(PJ.cur.name+' copy'));
    showProject(r); AoStore.setMeta('lastOpen',r.id).catch(()=>{}); chan('list'); await refreshList(); }
  catch(e){ fail('Could not duplicate the project',e); }
}
async function deleteProject(){
  const ok=await ask({title:'Delete “'+PJ.cur.name+'”?',danger:true,ok:'Delete',
    text:'This removes the project from this browser. It cannot be undone, and there is no cloud copy. Export it first if you might want it back.'});
  if(!ok) return;
  try{ const id=PJ.cur.id; clearTimeout(PJ.timer); PJ.timer=null; await (PJ.writing||Promise.resolve());
    await AoStore.remove(id); chan('deleted',id); await afterDelete(); }
  catch(e){ fail('Could not delete the project',e); }
}
async function afterDelete(){
  PJ.list=await AoStore.list(); PJ.cur=null;
  const next=PJ.list[0]||await AoStore.create('Untitled project',cleanState(JSON.parse(DEFAULT_ST)));
  showProject(next); AoStore.setMeta('lastOpen',next.id).catch(()=>{}); await refreshList();
}
const fail=(title,e)=>ask({title,info:true,text:(e&&(e.message||e.name))||'Unknown error'});

/* ---- JSON export / import ---- */
const FORMAT='aochat-backup', FVER=1;
function download(name,obj){
  const a=document.createElement('a'),u=URL.createObjectURL(new Blob([JSON.stringify(obj,null,2)],{type:'application/json'}));
  a.href=u; a.download=name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(u),2000);
}
const stamp=()=>new Date().toISOString().slice(0,10).replace(/-/g,'');
const slug=n=>(n||'project').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,40)||'project';
function wrapExport(projects){ return {format:FORMAT,version:FVER,exported:new Date().toISOString(),projects}; }
function exportCurrent(){
  const p={name:PJ.cur?PJ.cur.name:'aochat project',created:PJ.cur&&PJ.cur.created,updated:Date.now(),data:cleanState(st)};
  download('aochat-'+slug(p.name)+'-'+stamp()+'.json',wrapExport([p]));
}
async function exportAll(){
  try{ await flush(); const all=await AoStore.list();
    download('aochat-backup-'+stamp()+'.json',wrapExport(all.map(r=>({name:r.name,created:r.created,updated:r.updated,
      data:PJ.cur&&r.id===PJ.cur.id?cleanState(st):r.data})))); }
  catch(e){ fail('Could not read projects to export',e); }
}
async function importFile(file){
  try{
    if(file.size>5*1024*1024) throw new Error('That file is larger than 5 MB, so it is probably not an aochat backup.');
    let j; try{ j=JSON.parse(await file.text()); }catch(_){ throw new Error('That file is not valid JSON.'); }
    let items;
    if(j&&j.format===FORMAT&&Array.isArray(j.projects)) items=j.projects;
    else if(j&&Array.isArray(j.msgs)) items=[{name:file.name.replace(/\.json$/i,''),data:j}];   // a bare editor state
    else throw new Error('That does not look like an aochat project or backup file.');
    items=items.filter(p=>p&&typeof p==='object'&&p.data&&typeof p.data==='object').slice(0,200);
    if(!items.length) throw new Error('The file contains no projects.');
    const newer=j.version>FVER;
    if(!PJ.ready){ applyState(items[0].data); drawSkins(); drawMsgs(); render();
      await ask({title:'Opened, not saved',info:true,text:'Storage is unavailable, so this is open in this tab only.'}); return; }
    if(!(await saveBeforeLeaving())) return;
    let first=null;
    for(const p of items){
      const nm=uniqueName(String(p.name||'Imported project').slice(0,80)+(PJ.list.some(x=>x.name===String(p.name||'').slice(0,80))?' (imported)':''));
      const r=await AoStore.create(nm,cleanState(p.data)); PJ.list.push(r); first=first||r;
    }
    PJ.edited=true; showProject(first); AoStore.setMeta('lastOpen',first.id).catch(()=>{}); chan('list'); await refreshList();
    await ask({title:'Imported '+items.length+' project'+(items.length>1?'s':''),info:true,
      text:'Added to this browser as new projects; nothing was overwritten.'+(newer?'\n\nThe file was made by a newer version of aochat, so some details may have been ignored.':'')});
  }catch(e){ fail('Import failed',e); }
}

/* ---- menu + notice wiring ---- */
const menu=$('#pmenu'),mbtn=$('#pbtn');
function closeMenu(){ menu.hidden=true; mbtn.setAttribute('aria-expanded','false'); }
mbtn.onclick=e=>{ e.stopPropagation();
  if(!menu.hidden){ closeMenu(); return; }
  menu.hidden=false;                                   // show first so its width can be measured
  const r=mbtn.getBoundingClientRect(); menu.style.top=(r.bottom+window.scrollY+6)+'px';
  menu.style.left=Math.max(8,Math.min(r.left,innerWidth-menu.offsetWidth-8))+'px';
  mbtn.setAttribute('aria-expanded','true'); menu.querySelector('button').focus(); };
document.addEventListener('click',e=>{ if(!menu.hidden&&!menu.contains(e.target)) closeMenu(); });
document.addEventListener('keydown',e=>{ if(e.key==='Escape'&&!menu.hidden){ closeMenu(); mbtn.focus(); } });
function act(b){
  const needs=['rename','dup','del','new'].includes(b.dataset.a)&&!PJ.ready;
  if(needs){ fail('Storage is unavailable','Projects cannot be created, renamed or deleted because this browser is not allowing local storage. You can still Export and Import.'); return; }
  ({new:newProject,rename:renameProject,dup:duplicateProject,del:deleteProject,exp:exportCurrent,expall:()=>PJ.ready?exportAll():exportCurrent(),
    imp:()=>$('#impf').click()})[b.dataset.a]();
}
menu.onclick=e=>{ const b=e.target.closest('button[data-a]'); if(b){ closeMenu(); act(b); } };
$('#hact').onclick=e=>{ const b=e.target.closest('button[data-a]'); if(b) act(b); };
$('#impf').onchange=e=>{ const f=e.target.files[0]; e.target.value=''; if(f) importFile(f); };
$('#proj').onchange=e=>openId(e.target.value);
$('#nok').onclick=()=>{ $('#notice').hidden=true; AoStore.setMeta('noticeDismissed',true).catch(()=>{}); };
$('#nexp').onclick=()=>exportCurrent();
document.addEventListener('visibilitychange',()=>{ if(document.visibilityState==='hidden') flush(); });
addEventListener('pagehide',()=>{ flush(); });

/* ---- phone layout ------------------------------------------------------
   Portrait: the preview fills the screen and the editor is a bottom sheet that
   snaps between collapsed / half / full, so the preview stays visible while
   you edit. Landscape or wider: panes are switched from the bottom bar. ---- */
const SHEETMQ=matchMedia('(max-width:900px) and (orientation:portrait)');
const mainEl=document.querySelector('main'), sgrab=$('#sgrab');
let sheet='half';
const sheetPx=()=>{ const H=mainEl.clientHeight; return {min:48, half:Math.round(H*.46), full:Math.max(120,H-56)}; };
function paintTabs(){
  const code=document.body.dataset.view==='code';
  const cur=code?'code':(SHEETMQ.matches?(sheet==='min'?'preview':'edit'):document.body.dataset.view);
  document.querySelectorAll('#mtabs button').forEach(x=>{ const on=x.dataset.v===cur; x.classList.toggle('on',on); x.setAttribute('aria-pressed',String(on)); });
}
function setSheet(name,px,animate){
  if(animate&&name!==sheet&&navigator.vibrate) try{ navigator.vibrate(8); }catch(e){}
  sheet=name; document.body.dataset.sheet=name;
  mainEl.classList.toggle('snap',!!animate);
  mainEl.style.setProperty('--sheet-h',(px==null?sheetPx()[name]:px)+'px');
  paintTabs();
}
// Zoom only ever changes from the zoom buttons; it starts at 100%.
function fitPreview(){}
document.querySelectorAll('#mtabs button').forEach(b=>b.onclick=()=>{
  const v=b.dataset.v;
  if(SHEETMQ.matches&&v!=='code'){
    document.body.dataset.view='edit';
    setSheet(v==='preview'?'min':(sheet==='min'?'half':sheet),null,true);
  } else {
    document.body.dataset.view=v==='preview'&&SHEETMQ.matches?'edit':v; paintTabs();
  }
  closeMenu(); closeWho(); closeTime();
});
// Drag the sheet. The handle row always drags it; the sheet body also drags it
// when pulling up on a partly open sheet, or pulling down from the top of the list.
const D={sy:0,sh:0,moved:false,last:[]};
const build=$('#build');
let dRaf=0, dY=0, dT=0;
function dStart(y,t){ D.sy=y; D.sh=build.offsetHeight; D.moved=false; D.last=[[t,y]]; mainEl.classList.remove('snap'); mainEl.classList.add('dragging'); }
function dApply(){ dRaf=0;
  const p=sheetPx(), raw=D.sh-(dY-D.sy);
  // stops at the collapsed height; past full height it stretches with resistance, like iOS
  const h=raw>p.full ? p.full+Math.min(44,(raw-p.full)*.3) : Math.max(p.min,raw);
  mainEl.style.setProperty('--sheet-h',h+'px'); }
function dMove(y,t){ if(Math.abs(y-D.sy)>3) D.moved=true; if(!D.moved) return;
  dY=y; dT=t; D.last.push([t,y]); if(D.last.length>6) D.last.shift();
  if(!dRaf) dRaf=requestAnimationFrame(dApply); }
function dEnd(){ mainEl.classList.remove('dragging'); if(!D.moved) return false;
  if(dRaf){ cancelAnimationFrame(dRaf); dApply(); }
  const p=sheetPx(), h=Math.min(p.full,build.offsetHeight); let v=0;       // px/ms, negative = up
  if(D.last.length>1){ const a=D.last[0],b=D.last[D.last.length-1]; v=(b[1]-a[1])/Math.max(1,b[0]-a[0]); }
  const want=h-v*260;                                                      // where it was heading
  const name=['min','half','full'].reduce((best,k)=>Math.abs(p[k]-want)<Math.abs(p[best]-want)?k:best,'half');
  document.body.dataset.view='edit'; setSheet(name,null,true); return true; }
(function(){
  let id=null;
  sgrab.onpointerdown=e=>{ if(!SHEETMQ.matches||e.button>0) return;
    id=e.pointerId; sgrab.setPointerCapture(id); dStart(e.clientY,e.timeStamp); e.preventDefault(); };
  sgrab.onpointermove=e=>{ if(id===e.pointerId) dMove(e.clientY,e.timeStamp); };
  const end=e=>{ if(id!==e.pointerId) return; id=null;
    if(!dEnd()) setSheet(sheet==='half'?'full':sheet==='full'?'half':'half',null,true); };
  sgrab.onpointerup=end; sgrab.onpointercancel=end;
  sgrab.onkeydown=e=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); setSheet(sheet==='full'?'half':'full',null,true); }
    else if(e.key==='ArrowUp'){ e.preventDefault(); setSheet(sheet==='min'?'half':'full',null,true); }
    else if(e.key==='ArrowDown'){ e.preventDefault(); setSheet(sheet==='full'?'half':'min',null,true); } };
  // A touch that starts on the sheet body is decided once, then locked for the whole gesture:
  //  - content that fits (nothing to scroll): the body drags the sheet either way
  //  - content that scrolls: it scrolls, except a pull-down that began at the very top, which collapses the sheet
  // The handle row always drags. Expanding a scrolling sheet is done from the handle.
  let T=null;
  build.addEventListener('touchstart',e=>{
    if(!SHEETMQ.matches||e.touches.length!==1||e.target.closest('.grip,.mvbox,.sgrab')){ T=null; return; }
    T={y:e.touches[0].clientY,t:e.timeStamp,mode:0,
       fits:build.scrollHeight<=build.clientHeight+1, top:build.scrollTop<=0}; },{passive:true});
  build.addEventListener('touchmove',e=>{ if(!T||T.mode===2) return;
    const y=e.touches[0].clientY, dy=y-T.y;
    if(T.mode===0){ if(Math.abs(dy)<8) return;
      if(T.fits||(T.top&&dy>0)){ T.mode=1; dStart(T.y,T.t); } else { T.mode=2; return; } }
    e.preventDefault(); dMove(y,e.timeStamp); },{passive:false});
  const tend=()=>{ if(T&&T.mode===1) dEnd(); T=null; };
  build.addEventListener('touchend',tend); build.addEventListener('touchcancel',tend);
})();
// border-box, because the sheet changes main's padding (its content box) while dragging
let lastMainH=0;
new ResizeObserver(()=>{ const H=mainEl.offsetHeight;
  if(SHEETMQ.matches&&H!==lastMainH&&!mainEl.matches(':active')){ setSheet(sheet,null,false); } lastMainH=H; fitPreview(); }).observe(mainEl,{box:'border-box'});
new ResizeObserver(()=>fitPreview()).observe($('#pvbox'));
SHEETMQ.addEventListener('change',()=>{ document.body.dataset.view='edit'; if(SHEETMQ.matches){ setSheet('half',null,false); } else { mainEl.style.removeProperty('--sheet-h'); delete document.body.dataset.sheet; paintTabs(); } });
// The page always opens on the preview alone (sheet collapsed in portrait).
if(SHEETMQ.matches) setSheet('min',null,false);
else if(matchMedia('(max-width:900px), (max-height:500px) and (pointer:coarse)').matches){ document.body.dataset.view='preview'; paintTabs(); }

/* ---- editor section rail (logo toggles it) --------------------------- */
(function(){
  const I=d=>`<svg width="22" height="22" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
  const ITEMS=[
    ['skin','Skin',I('<path d="M9 2.8a6.2 6.2 0 100 12.4c1 0 1.5-.7 1.5-1.4 0-1-1-1.2-1-2.1 0-.8.6-1.3 1.5-1.3H13a2.2 2.2 0 002.2-2.2C15 5.3 12.4 2.8 9 2.8z"/><circle cx="5.8" cy="8.2" r=".7"/><circle cx="8.4" cy="5.7" r=".7"/><circle cx="11.7" cy="6.4" r=".7"/>')],
    ['opts','Options',I('<path d="M3 5h12M3 9h12M3 13h12"/><circle cx="6.5" cy="5" r="1.4"/><circle cx="11.5" cy="9" r="1.4"/><circle cx="7.5" cy="13" r="1.4"/>')],
    ['msgs','Messages',I('<path d="M3 4.5A1.5 1.5 0 014.5 3h9A1.5 1.5 0 0115 4.5v6a1.5 1.5 0 01-1.5 1.5H8l-3 3v-3A1.5 1.5 0 013 10.5z"/>')],
    ['device','Device',I('<rect x="5" y="2.2" width="8" height="13.6" rx="1.8"/><path d="M8 13.3h2"/>')]
  ];
  const rails=[$('#rail'),$('#railm')], logo=$('#logo'), build=$('#build');
  const avail=()=>{ const l=SKSECS[st.skin]; return ITEMS.filter(i=>!l||l.includes(i[0])); };
  function paintRail(){
    const l=avail(), btn=([k,t,i],c)=>`<button class="rb ${c}" data-go="${k}" title="${t}">${i}<span>${t}</span>${c==='parent'?miniTile(st.skin):''}</button>`;
    const html=btn(l[0],'parent')+`<div class="rkids">${l.slice(1).map(x=>btn(x,'child')).join('')}</div>`;
    rails.forEach((r,i)=>{ r.innerHTML=html+(i===0?`<button class="rb rtog" id="rtog" aria-controls="rail" title="Collapse sidebar" aria-label="Collapse or expand the sidebar"><svg width="28" height="18" viewBox="0 0 28 18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 4.5l-4.5 4.5 4.5 4.5"/><path d="M16 4.5l-4.5 4.5 4.5 4.5"/><path d="M23 4.5l-4.5 4.5 4.5 4.5"/></svg></button>`:''); });
    syncTog();
  }
  paintRail();
  const KEY='aochat-rail', SKEY='aochat-sec'; let cur=null;
  try{ const v=localStorage.getItem(SKEY); if(ITEMS.some(i=>i[0]===v)) cur=v; }catch(e){}
  // The chosen section sticks, whether or not the rail is showing. Until one is chosen, every section is listed.
  function show(k){
    cur=k; try{ localStorage.setItem(SKEY,k); }catch(e){}
    rails.forEach(r=>r.querySelectorAll('.rb').forEach(b=>{ b.setAttribute('aria-current',String(b.dataset.go===k)); b.classList.toggle('path',b.classList.contains('parent')&&k!=='skin'); }));
    build.classList.add('tabbed');
    build.querySelectorAll('.sec').forEach(s=>s.classList.toggle('on',s.dataset.sec===k));
  }
  railSync=function(){
    paintRail();
    if(cur&&!avail().some(i=>i[0]===cur)) cur='skin';
    if(cur) show(cur);
  };
  function syncTog(){ const t=$('#rtog'), o=$('#rail').classList.contains('open'); if(t){ t.setAttribute('aria-expanded',String(o)); t.title=o?'Collapse sidebar':'Expand sidebar'; } }
  function setOpen(on,persist){
    rails.forEach(r=>r.classList.toggle('open',on)); logo.setAttribute('aria-expanded',String(on)); syncTog();
    if(persist) try{ localStorage.setItem(KEY,on?'1':'0'); }catch(e){}
  }
  logo.onclick=()=>setOpen(!$('#rail').classList.contains('open'),true);
  let on=false; try{ on=localStorage.getItem(KEY)==='1'; }catch(e){}
  setOpen(on,false); if(cur) show(cur);
  document.addEventListener('click',e=>{
    const b=e.target.closest('.rb'); if(!b) return;
    if(b.classList.contains('rtog')){ setOpen(!$('#rail').classList.contains('open'),true); return; }
    if(SHEETMQ.matches&&sheet==='min'){ document.body.dataset.view='edit'; setSheet('half',null,true); }
    show(b.dataset.go); build.scrollTop=0;
  });
})();

/* ---- start up ---- */
(async function init(){
  try{
    await AoStore.open();
    PJ.list=await AoStore.list();
    const last=await AoStore.getMeta('lastOpen');
    let rec=PJ.list.find(p=>p.id===last)||PJ.list[0];
    if(!rec) rec=await AoStore.create('Untitled project',cleanState(JSON.parse(DEFAULT_ST)));
    PJ.ready=true; showProject(rec);
    AoStore.setMeta('lastOpen',rec.id).catch(()=>{});
    await refreshList();
    PJ.persist=await AoStore.persistence(false); showPersist();
    if(!(await AoStore.getMeta('noticeDismissed'))) $('#notice').hidden=false;
  }catch(e){
    PJ.err=e; drawSkins(); drawMsgs(); render(); setStatus('unavailable');
    $('#noticetx').textContent='Your work is NOT being saved because this browser blocks storage, so export a .json copy before closing.';
    $('#nok').hidden=true; $('#notice').hidden=false;
  }
})();
