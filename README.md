# Pears

A lightweight pair programming assignment tool for teams. Easily manage team members (seeds) and create pears (groups) using random or manual assignment.

![Pears Logo](https://img.shields.io/badge/Pears-Pair_Programming-5648AD?style=for-the-badge)

## Demo

Visit the live demo: **https://brgrd.github.io/pears/**

## Features

- **Manual Assignment**: Drag and drop seeds into pears (pairs, solos, or groups of any size)
- **Random Pears**: Automatically create and reshuffle random pears from available seeds
- **Lock Pears**: Protect specific pears from being reshuffled or cleared
- **OOO Status**: Mark entire pears as out of office
- **Share URLs**: Generate shareable links that encode your current setup
- **Local Storage**: All data persists in your browser automatically
- **Responsive Design**: Works seamlessly on desktop and mobile devices

## Quick Start

### Use Online
Just visit **https://brgrd.github.io/pears/** - no installation needed!

### Deploy Your Own (GitHub Pages)

1. Fork or clone this repository
2. Push to your GitHub repository
3. Enable GitHub Pages in Settings → Pages (select `main` branch)
4. Your site will be live at `https://yourusername.github.io/reponame/`

### Local Development

Open `index.html` directly in your browser, or run a local server:

```bash
python -m http.server 8000
# Visit: http://localhost:8000
```

## How to Use

### Add Seeds
1. Type a name in the seed input field
2. Click **+** or press **Enter**
3. Seeds appear in the left sidebar

### Create Pears

**Manual Assignment:**
- Click **New Pear** to create an empty pear
- Drag seeds from the sidebar into pears
- Drag seeds between pears to reassign
- Seeds in pears appear faded and cannot be dragged

**Random Assignment:**
- Click **Random Pears** to automatically distribute all available seeds
- Locked pears are preserved - only unlocked pears are reshuffled
- Creates pairs when possible, with solo pears for odd numbers

### Manage Pears

- **🔓/🔒 Lock**: Protect a pear from being reshuffled or cleared
- **Active/OOO**: Mark a pear as out of office
- **×**: Delete a pear and return its seeds to the available pool
- **Clear All**: Remove all unlocked pears at once

### Share Your Setup

Click **Share URL** to copy a shareable link that includes all your seeds and pears. Anyone with the link can view and modify their own copy.

## Data Storage

All data is stored locally in your browser using `localStorage`. Each browser/device maintains its own data independently. Clearing browser data will reset the app.

**Note:** Shared URLs contain all your data encoded in the link itself, so anyone can access and modify their own copy.

## Customization

This is a simple static site. Fork it and customize:
- **Labels**: Edit text in `index.html`
- **Colors**: Modify CSS variables in `styles.css` (primary: `#5648AD`)
- **Logo**: Update inline SVG in `index.html`

## License

MIT License - Free to use and modify!

---

**Happy Pairing! 🍐**
