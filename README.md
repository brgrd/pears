# Pears

A lightweight pair programming assignment tool for teams. Easily manage team members and create pears (groups) using random or manual assignment.

![Pears Logo](https://img.shields.io/badge/Pears-Pair_Programming-5648AD?style=for-the-badge)

## Features

- **Pears**: Drag and drop seeds into flexible pears (pairs, solos, or groups)
- **Random Pears**: Automatically create random pears from available seeds
- **Drag & Drop**: Intuitive drag-and-drop interface for manual assignment
- **Seed Management**: Easily add and remove seeds from your team
- **OOO Pears**: Mark a pear OOO at the pear level
- **Lock Pears**: Protect certain pears from changes (locked pears are preserved when clearing all)
- **Local Storage**: All data persists in your browser
- **Mobile-First Design**: Fully responsive layout optimized for desktop and mobile devices
- **Clean Interface**: Purple-themed design with custom pear logo and Permanent Marker font

## Demo

Visit the live demo: **https://brgrd.github.io/pears/**

## Getting Started

### Deployment to GitHub Pages

1. **Fork or clone this repository**
   ```bash
   git clone https://github.com/brgrd/pears.git
   cd pears
   ```

2. No build step or secrets required. This is a static site.

3. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

4. **Enable GitHub Pages**
   - Go to your repository on GitHub
   - Click **Settings** → **Pages**
   - Under "Source", select **main** branch
   - Click **Save**
   - Your site will be live at: `https://yourusername.github.io/reponame/`

### Local Development

Simply open `index.html` in your web browser. No build process or dependencies required!

```bash
# Option 1: Direct open
open index.html  # macOS
start index.html # Windows
xdg-open index.html # Linux

# Option 2: Local server (recommended)
python -m http.server 8000
# Then visit: http://localhost:8000
```

## Usage

### No Login
This app has no authentication and is intended for simple team use on GitHub Pages.

### Managing Seeds
1. Type a seed name in the input field
2. Click the "+" button or press Enter
3. Remove seeds by clicking the × button next to their name

### Creating Assignments

#### Create Pears
1. Click **"New Pear"** button to create an empty pear
2. Drag seeds from the "Seeds" section into the new pear drop zone or existing pears
3. Pears can contain:
   - **Pairs** (2 seeds)
   - **Solo** (1 seed)
   - **Groups** (3+ seeds)

#### Random Pears
- Click **"Random Pears"** to automatically create pears from all available seeds
- Solo pears are created when an odd seed remains

#### Drag & Drop
- Drag seeds from the sidebar into any pear
- Drag seeds between pears to reassign
- Seeds assigned to pears appear faded in the sidebar and cannot be dragged

### Managing Pears
- **Lock/Unlock**: Click the lock icon to protect pear contents from changes
- **Active/OOO**: Toggle the OOO status button to mark a pear out of office
- **Delete**: Click × to remove a pear and return seeds to available pool
- **Clear All**: Remove all unlocked pears at once (locked pears are preserved)

### Out of Office
- Toggle a pear to OOO to mark the entire group out of office (pear-level)

## Color Theme

The application uses a purple color scheme based on `#5648AD`:
- Primary Purple: `#5648AD`
- Dark Purple: `#4a3a8f`
- Light Purple: `#7B68EE`

## File Structure

```
pears/
├── index.html      # Main HTML structure
├── styles.css      # All styling and responsive design
├── app.js          # Application logic and state management
└── README.md       # This file
```

## Browser Compatibility

Works in all modern browsers:
- Chrome/Edge (recommended)
- Firefox
- Safari
- Opera

## Data Storage

All data is stored locally in your browser using `localStorage`:
- Seeds list
- Current pears
- Locked/OOO status

Note: Clearing browser data will reset the application. Each browser/device maintains its own data.

## Security Note

This is a purely client-side tool intended for simple team workflows on GitHub Pages. Do not use for sensitive data.

## Customization

### Change Labels
Terminology uses "Seeds" and "Pear Tree". You can adjust labels in `index.html`.

### Change Colors
Edit the CSS variables in `styles.css`:
```css
:root {
    --primary-purple: #5648AD;
    --dark-purple: #4a3a8f;
    --light-purple: #7B68EE;
    /* ... */
}
```

### Modify Logo
The purple pear logo is embedded as inline SVG in `index.html`. Edit the `<svg>` elements to customize.

## Contributing

Feel free to submit issues and enhancement requests!

## License

MIT License - feel free to use this for your team!

## Credits

Created for teams who pair program.

---

**Happy Pairing!**
