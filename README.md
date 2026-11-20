# ao3studio

Builds chat-screenshot mockups that survive posting to **Archive of Our Own**.

AO3 strips most of what a normal UI mockup is made of, so the output here is
AO3-native from the start rather than exported and then fixed up:

- `div`, `span` and `p` only, carrying `class` — no `id`, no `style` attribute
- no SVG (AO3 removes `svg` *with its contents*)
- no data-URIs (`img src` must be http/https)
- no `gap`, no `@font-face`
- avatars and icons drawn in CSS, glyphs in `content:` so screen readers skip them

## How it works

`index.html` is a self-contained page — no build step, no dependencies.

The preview does not render what the generator produced. It renders what AO3's
cleaner **left behind**: generated HTML and CSS are passed through ports of
AO3's own rules, wrapped in `#workskin > .userstuff`, and only then shown. If
AO3 would strip something, it disappears from the preview too and the linter
names it.

Rules ported from [otwcode/otwarchive](https://github.com/otwcode/otwarchive):

| Source | Used for |
| --- | --- |
| `config/config.yml` | `SUPPORTED_CSS_PROPERTIES`, `SUPPORTED_CSS_SHORTHAND_PROPERTIES` |
| `lib/css_cleaner.rb` | selector scoping, property/value rules |
| `config/initializers/gem-plugin_config/sanitizer_config.rb` | allowed elements and attributes |

Two behaviours worth knowing, both learned the hard way:

- AO3's shorthand check is an **unanchored** regex, so a property merely
  *containing* an allowed name passes. `border-radius` and `flex-direction`
  survive; bare `gap` does not. An anchored allowlist is wrong in both directions.
- AO3 wraps bare inline content in `<p>`, and its base sheet gives those
  `1.286em` margins. Rows are emitted as `<p>` with `margin: 0` for that reason.

## Skins

WhatsApp, iMessage, LINE, KakaoTalk. The KakaoTalk entry is built from measured
values — variables and geometry read from a Figma community file, colours
sampled from the rendered frame. The others are approximations and should be
replaced the same way.

## Known gaps

- The AO3 base stylesheet used in the preview is hand-written and approximate.
  The real one, plus the reader's chosen site skin, is the largest remaining
  source of visual drift.
- Value validation is partial. AO3 runs values through a large regex with
  recursive gradient checks; only property names and `url()` rules are mirrored.
- App icons would need rasterised PNGs on external hosting, referenced through
  `background-image`.
