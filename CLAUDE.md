# Working rules for this repo

## Always push
After **every** change, commit and push to `main`. Don't batch changes or wait
to be asked. A change that only exists in a preview is not done.

## What this repo is
`index.html` + `style.css` + `store.js` + `app.js` — a static page, no build step, no
dependencies, plain relative links so it works on GitHub Pages and from
`file://`. It generates chat mockups that survive posting to Archive of Our Own.
The AO3 rules, skins and generators are all in `app.js`. `store.js` is the
IndexedDB layer for local projects (no accounts, no network, nothing synced); keep it
that way and never word the UI as if data were in the cloud.

## Invariants — do not break these
The generated HTML and CSS must survive AO3's sanitizer and CSS cleaner.
Before any push, confirm the generator still emits:

- only `div`, `span`, `p`, carrying `class` — never `id`, never `style`
- no `svg` (AO3 removes it *with its contents*)
- no data-URIs (`img src` must be http/https)
- no `gap`, no `@font-face`
- no `url()` outside `background` / `border` / `list-style`, and only
  jpg/jpeg/png/gif
- nothing from the preview's editor layer (`ao3t`, `contenteditable`,
  `cursor`, `outline`, `<script>`) in the copied output

## Two AO3 behaviours that look like bugs but aren't
- **The shorthand check is an unanchored regex.** A property merely
  *containing* an allowed shorthand name passes: `border-radius` and
  `flex-direction` survive, bare `gap` does not. Do not "tidy" this into an
  anchored allowlist — that is wrong in both directions.
- **AO3 wraps bare inline content in `<p>`** and its base sheet gives those
  `1.286em` margins. Rows are emitted as `<p>` with `margin: 0` on purpose.

## New UI must match the existing components
Any new control, panel or indicator has to look like it was always part of the site.
Before writing CSS, look at what exists (`.hbtn`, `.skin`, `.msg .side`, `.copy button`,
the inputs in `.msg`, the dialog and menu at the end of `style.css`) and reuse it.

- **Reuse before inventing.** Use an existing class if one fits. If not, copy the
  recipe: `1px solid var(--line)` border, `6px` radius, `var(--field)` background,
  `var(--ink)` text, `font:inherit` at 11.5–12.5px, `4–7px` padding.
- **States are the same everywhere.** Hover = `border-color` and `color` go to
  `var(--accent)`. Selected = `var(--accent)` background with `var(--on-accent)` text.
  Disabled = `opacity:.3`, no hover. Keep a visible keyboard focus.
- **Colours only from the variables** in `:root` / `[data-theme=dark]`. No hard-coded
  hex in site chrome. If a new colour is truly needed, add a variable in both themes.
- **No new visual language.** No heavy shadows, pill shapes, gradients or floating
  widgets unless an existing component already does that. Keep spacing on the current
  5–8px rhythm. Small, flat, bordered.
- **Place it where its neighbours are** (header row, panel header, `.copy` bar)
  rather than floating over the preview.
- **Check it in a screenshot, in light *and* dark**, next to the existing controls.
  If it looks out of place, it is. This has been wrong several times.
- This is for the site UI only. The generated chat mockups follow the AO3 rules above.

## Verifying
Don't assert that a change works — check it. Parse `app.js` and the small inline script in `index.html`, re-run the
allowlist check on the generated CSS, and confirm no editor artifacts leak
into the export. Visual bugs need a screenshot; reasoning about what *should*
render has produced wrong answers here more than once.

## Checking against AO3's real code
`tools/ao3check/compare.mjs` runs AO3's own Ruby `css_cleaner.rb` and the page's
JS cleaner over the same CSS and fails if they differ. It needs otwarchive's
`lib/css_cleaner.rb` + `config/config.yml` (`OTW_DIR`) and the `css_parser`
3.2.0 gem. After any change to the cleaner, `PROPS`/`SHORT`, or the skin CSS,
run it. GitHub Actions runs it on every push and weekly.

## Cache busting
Run `sh tools/bump.sh` after any change to `style.css`, `store.js` or `app.js`, before
committing. It stamps `index.html` with a hash of both so browsers can't run a
cached `app.js` against a newer page (that blanked the whole app once). CI fails
if the stamp is stale.
