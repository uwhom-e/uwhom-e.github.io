# Capstone Design Log

A design log website built with [Astro](https://astro.build) and Tailwind CSS. Documents project decisions and iterations as markdown entries, with light/dark mode and a responsive layout.

## Adding a log entry

Create a new markdown file in `src/content/logs/`, named like `YYYY-MM-DD-short-title.md`:

```markdown
---
title: "Entry Title"
date: 2026-09-15
summary: "One-sentence summary shown on the card and in previews."
tags: ["tag-one", "tag-two"]
phase: "Optional phase label, e.g. Discovery, Iteration 2"
---

Your markdown content goes here.
```

- `title`, `date`, and `summary` are required.
- `tags` and `phase` are optional but recommended — tags power the filter on the `/logs` page.
- `coverImage` (path to an image relative to the markdown file) and `coverAlt` are optional, for a hero image on the entry.
- Set `draft: true` to hide an entry from the site without deleting it.

The entry is automatically picked up — no other file needs to change.

### Adding photos

Drop the image file next to the markdown file (or in a subfolder), then reference it two ways:

- **Cover photo** (shown on the card and at the top of the entry): set `coverImage: ./my-photo.jpg` and `coverAlt: "..."` in the frontmatter.
- **Inline photos** (anywhere in the body): use normal markdown image syntax, e.g. `![Alt text](./my-photo.jpg)`.
- **Photo gallery** (a grid shown after the body text): add a `gallery` list to the frontmatter:

  ```yaml
  gallery:
    - image: ./photo-1.jpg
      alt: "Alt text"
      caption: "Optional caption"
    - image: ./photo-2.jpg
      alt: "Alt text"
  ```

All image paths are relative to the entry's own markdown file. Images are automatically optimized and resized at build time.

### Adding video

For video, name the file `.mdx` instead of `.md` (same frontmatter, just a different extension) so you can use the built-in `<Video />` component. Import it at the top of the file, then use it in the body:

```mdx
import Video from '../../components/Video.astro';

<Video youtube="VIDEO_ID" caption="Optional caption" />
<Video vimeo="VIDEO_ID" caption="Optional caption" />
<Video src="videos/my-clip.mp4" caption="Optional caption" />
```

- `youtube` / `vimeo` take just the video ID from the URL (e.g. `youtube.com/watch?v=VIDEO_ID`).
- `src` is for a self-hosted video file: put the file in `public/videos/` and reference it as `videos/my-clip.mp4`.

See `src/content/logs/2026-09-17-media-demo.mdx` for a working example of all of the above — delete it once you don't need it as a reference.

## Adding a reference

Create a new markdown file in `src/content/references/`, named after the source (e.g. `author-title.md`):

```markdown
---
title: "Reference Title"
type: "paper"
url: "https://example.com"
author: "Author or Channel Name"
date: 2026-01-01
---

A short note on how this source was used or what it inspired.
```

- `title` and `type` are required. `type` must be one of `paper`, `video`, `project`, `article`, or `other`.
- Cite it anywhere with `<Cite id="file-name-without-extension" />`. References are numbered IEEE-style, in order of first citation (home page first, then log entries oldest to newest); uncited references are listed last.
- `url`, `author`, and `date` are optional.
- The markdown body is the credit/insight note shown under the citation.
- For a YouTube/Vimeo reference, set `type: "video"` and link it via `url` — or use a `.mdx` file with the `<Video />` component (see [Adding video](#adding-video)) to embed it inline.

## Local development

Requires [Node.js](https://nodejs.org) (LTS).

```sh
npm install
npm run dev       # start local dev server at localhost:4321
npm run build     # build production site to ./dist/
npm run preview   # preview the production build locally
```

## Deployment

Pushing to `main` triggers `.github/workflows/deploy.yml`, which builds the site and deploys it to GitHub Pages. In the repo settings, under **Pages**, set the source to **GitHub Actions**.

The site is configured (in `astro.config.mjs`) to deploy at `https://csabahi.github.io/capstone_website_log/`. If you rename the repo, update `site` and `base` in that file to match.
