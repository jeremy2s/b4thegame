# Football Confidence Pool (Node + React)

Quick scaffold for a confidence pool app using Node/Express backend and a small React client (Vite).

Run locally:

1. Install dependencies for both server and client

```bash
npm run install:all
```

2. Start the backend

```bash
npm start
# server runs on http://localhost:3000
```

3. In a separate terminal start the React dev server

```bash
cd client
npm run dev
```

Makefile and helper script

I've included a `Makefile` with convenient targets and a small helper script `run-dev.sh` to start both backend and client.

Common commands (from project root):

```bash
# install everything
make install-all

# start backend only
make server

# start frontend only
make client

# start both (backend in background, client in foreground)
make dev

# or use the tmux-aware helper (preferred if you have tmux)
./run-dev.sh

# run the sample results importer
make import-results

# reset DB
make db-reset
```

If you use `run-dev.sh`, make it executable first:

```bash
chmod +x run-dev.sh
```

Client-only mode (no server required)

If the server is frustrating you, the React app can run entirely client-side using mock data and localStorage. This is useful for testing the UI and drag/drop/confidence flows without needing a backend.

Start the client only:

```bash
cd client
npm install
npm run dev
```

Open the Vite URL shown in the client terminal (usually http://localhost:5173). The app will store users and picks in your browser's localStorage. You can apply sample results locally from the UI to see standings update.

If later you want to re-enable the server-based mode, start the server and the client can be configured to talk to it.


This repository is now in client-only mode. There is no server included. The React app runs with mock data and stores users/picks in localStorage.

Run the client-only app:

```bash
cd client
npm install
npm run dev
```

Open the Vite URL shown in the terminal (usually http://localhost:5173) and use the app fully in the browser.
