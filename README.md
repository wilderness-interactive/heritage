# Heritage

Sovereign family tree. Your ancestry, your data, your site.

Heritage is a Rust static site generator built on Citadel that creates a private, password-protected interactive family tree. Zoomable canvas visualization with biographical details, relationship mapping, and union tracking. Compiles to a single static page.

**[wildernessinteractive.com](https://wildernessinteractive.com)**

## Architecture

```
Structured Data --> heritage.exe --> Static HTML + JS
                    (Citadel)       (Password-Protected)
```

- **Generator**: Citadel static site framework
- **Visualization**: Vanilla JavaScript zoomable canvas
- **Security**: Password gate before any data renders
- **Data**: Family members, relationships, and unions as structured Rust data

## Features

- Interactive zoomable canvas with pan and zoom controls
- Person detail panel (birth, death, title, notes, photo)
- Parent-child relationship mapping
- Union tracking (partners, marriage date/place)
- Password-protected access
- Dark theme with gold accents
- Mobile responsive
- Compiles to a single deployable page

## Setup

### Build

```
cargo build
```

### Configure

Family data lives in `src/data/` as structured Rust. Private data can be kept in a separate git submodule.

### Generate

```
cargo run
```

Outputs static site to `public/`.

## License

Wilderness Interactive Open License

Permission is hereby granted, free of charge, to use, copy, modify, and distribute this software for any purpose, including commercial use.

This software may NOT be:
- Sold as a standalone product
- Sold access to as a hosted service

Use for building software, building websites, automating workflows, and integrating with other tools (including commercial work) is explicitly permitted and encouraged. This software is designed to be moddable, so modifications are explicitly permitted and encouraged. Software and systems built using this tool can be sold freely.

The purpose of this license is to prevent reselling the software itself.

---

Built by [Wilderness Interactive](https://wildernessinteractive.com).