# WCL Shared Assets

This folder contains shared visual assets used by the World Cigar Locator
frontend and Backoffice.

## Contents

- `icons/` - WCL logo and shared interface SVG files.
- `flags/` - ISO-2 country flags and continent icons.

## Flag Naming Standard

Country flags use lowercase ISO-2 filenames:

```text
se.svg
us.svg
de.svg
```

Continent flags live in:

```text
assets/flags/continent/
```

## Usage Notes

- Keep filenames stable because frontend code may reference them directly.
- Optimize new SVG assets before committing.
- Do not replace brand assets without checking all pages that reference them.
- Prefer adding a new asset and updating references intentionally over
  overwriting an asset whose old dimensions may be relied on by the UI.
