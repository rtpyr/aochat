# Working rules for this repo

## Always push
After **every** change, commit and push to `main`. Don't batch changes or wait
to be asked. A change that only exists in a preview is not done.

## What this repo is
`index.html` — a self-contained page, no build step, no dependencies. It
generates chat mockups that survive posting to Archive of Our Own.

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

## Verifying
Don't assert that a change works — check it. Parse both scripts, re-run the
allowlist check on the generated CSS, and confirm no editor artifacts leak
into the export. Visual bugs need a screenshot; reasoning about what *should*
render has produced wrong answers here more than once.
