# Show Watch List

A local Node.js app for tracking and ranking movies and TV shows, with ratings and drag-and-drop reordering.

## Requirements

- [Node.js](https://nodejs.org/) v16 or higher

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Start the app

```bash
npm start
```

Then open your browser to **http://localhost:4000**

---

## Features

- **Two separate lists** — Movies and TV Shows, each ranked independently
- **Drag-and-drop reordering** — grab the `⠿` handle to reorder unwatched items
- **Mark as watched** — triggers a confetti celebration and a rating prompt
- **1–5 star ratings** — rate anything you've watched, change it anytime
- **Inline rename** — hover an item and click ✏️ to rename it
- **Filter** — view All, To Watch, or Watched items
- **Persistent** — everything is saved to `data/watchlist.json`

---

## File Structure

```
WatchListRatings/
├── server.js           # Express server & REST API
├── package.json
├── .gitignore
├── data/
│   └── watchlist.json  # Your watch list data (create this manually, not in git)
└── public/
    ├── index.html
    ├── style.css
    └── app.js
```

---

## Stopping the server

Press `Ctrl + C` in the terminal where the server is running.

## Changing the port

Edit the `PORT` constant at the top of `server.js`:

```js
const PORT = 4000;
```
