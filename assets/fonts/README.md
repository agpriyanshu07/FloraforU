# Fonts for the catalogue PDF

The site loads Playfair Display and Inter through `next/font/google`, which
downloads `.woff2` at build time. pdf-lib cannot embed woff2 — it needs raw
TTF/OTF — so the four faces the PDF actually uses are vendored here.

Both families are SIL Open Font License 1.1, which permits embedding in a
document. The licences sit beside them.

Latin subsets only, which is why each is ~35KB rather than ~300KB. The PDF
sanitises text to WinAnsi anyway (see `sanitise()` in the route), so nothing
outside latin ever reaches a glyph lookup.

Regenerated from the fontsource packages with:

    npm i @fontsource/playfair-display @fontsource/inter fonteditor-core pako
    node -e "
      const { Font } = require('fonteditor-core');
      const pako = require('pako'), fs = require('fs');
      for (const [src, out] of [
        ['@fontsource/playfair-display/files/playfair-display-latin-400-normal.woff', 'PlayfairDisplay-Regular.ttf'],
        ['@fontsource/playfair-display/files/playfair-display-latin-700-normal.woff', 'PlayfairDisplay-Bold.ttf'],
        ['@fontsource/inter/files/inter-latin-400-normal.woff', 'Inter-Regular.ttf'],
        ['@fontsource/inter/files/inter-latin-600-normal.woff', 'Inter-SemiBold.ttf'],
      ]) {
        const f = Font.create(fs.readFileSync('node_modules/' + src), { type: 'woff', inflate: pako.inflate });
        fs.writeFileSync(out, Buffer.from(f.write({ type: 'ttf' })));
      }
    "

`inflate` is not optional: without it fonteditor-core fails with "Read woff
error" (10105) rather than saying a dependency is missing.
