# personal

Source for https://www.jennifer-elyse.com, deployed by Netlify from `master`.

## Build

Use Node.js 22 or newer:

```sh
npm ci
npm run build
```

Netlify publishes `dist/`. The build compiles the existing SCSS and copies the
HTML, JavaScript, images, and JSON without downloading content at build time.

## Content and images

- `src/images/`: the original MacBook photo and all 17 sticker images.
- `src/data/skillz.json`: sticker order, image paths, alt text, and modal content.
- `src/css/`: the existing layout and styling.

Edit the JSON and assets here; the site loads them from its own domain.
Google Fonts remains the existing source for Roboto.

## Clay Studio download

The public download URL is `/downloads/Clay-Studio.zip`. Netlify sends a
302 redirect to [Clay Studio's latest GitHub Release](https://github.com/jennifer-elyse/clay-studio/releases/latest/download/clay-studio-main.zip) so the
site always offers the newest successfully published installer without
committing large or outdated ZIP binaries to this repository.

The source of truth is `jennifer-elyse/clay-studio` and its validated
`main` releases. The portfolio download link itself does not change.
