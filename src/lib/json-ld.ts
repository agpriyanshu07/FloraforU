/**
 * Serialises structured data for a <script type="application/ld+json"> block.
 *
 * `JSON.stringify` alone is NOT safe here. It does not escape `<`, so a value
 * containing `</script>` closes the tag early and everything after it is parsed
 * as HTML — a product named `</script><script>…</script>` executes on the
 * public product page. That value can reach the database through the admin form
 * or, more realistically, through a row in an imported supplier spreadsheet.
 *
 * Escaping `<` as `<` keeps the JSON valid (parsers decode the escape) while
 * leaving nothing for the HTML parser to treat as a tag. `&` is escaped too so
 * the payload cannot smuggle an entity past a sanitiser downstream.
 */
export function serialiseJsonLd(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");
}
