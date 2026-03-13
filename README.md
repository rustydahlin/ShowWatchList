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

The server uses the `PORT` environment variable if set, otherwise defaults to `4000`:

```js
const PORT = process.env.PORT || 4000;
```

---

## Deploying to a DigitalOcean Droplet (Recommended)

A Droplet (VPS) is the best fit for this app — persistent filesystem, no storage config needed, and cheaper than App Platform.

### 1. Create the Droplet

In the DO dashboard, create a new Droplet:
- **Image:** Ubuntu 22.04 LTS
- **Plan:** Basic, Shared CPU — $4/mo (1 vCPU, 512MB RAM) is sufficient
- **Authentication:** SSH key (recommended) or password

### 2. Install Node.js

SSH into your Droplet, then run:

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs git
```

Verify: `node -v` and `npm -v`

### 3. Clone and install

The repo must be **public** on GitHub (or use a personal access token) for the Droplet to clone it without credentials.

```bash
git clone https://github.com/rustydahlin/ShowWatchList.git
cd ShowWatchList
npm install
```

### 4. Run with PM2 (keeps the app alive across reboots)

```bash
sudo npm install -g pm2
pm2 start server.js --name watchlist
pm2 startup   # PM2 will configure systemd automatically — no extra command needed
pm2 save
```

**Useful PM2 commands:**

```bash
pm2 status              # check running processes
pm2 logs watchlist      # view app logs
pm2 restart watchlist   # restart the app
```

### 5. Open the firewall port

```bash
sudo ufw allow 4000
sudo ufw enable
```

The app will be accessible at `http://YOUR_DROPLET_IP:4000`

### 6. Future deploys

```bash
cd ShowWatchList
git pull
pm2 restart watchlist
```

### Optional: Run on port 80/443 with nginx

If you want a clean URL without the port number, install nginx as a reverse proxy:

```bash
sudo apt install -y nginx

# Create a config file
sudo nano /etc/nginx/sites-available/watchlist
```

Paste this config (replace `YOUR_DROPLET_IP` or your domain):

```nginx
server {
    listen 80;
    server_name YOUR_DROPLET_IP;

    location / {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Then enable it:

```bash
sudo ln -s /etc/nginx/sites-available/watchlist /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
sudo ufw allow 80
```

---

## DigitalOcean App Platform (Not recommended for this app)

App Platform has ephemeral storage — `data/watchlist.json` is wiped on every redeploy. Persistent volumes require a higher-tier plan ($10+/mo) and must be configured via App Spec YAML. Use a Droplet instead.
