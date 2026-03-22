# NO NXME Virtual Office MVP

A Habbo Hotel–inspired AI agent office prototype for the browser. The app renders a pixel-style isometric office, simulates five autonomous teammates, and exposes a side panel where users can inspect goals, task memory, thoughts, messages, kanban progress, scrum logs, and working files.

## Folder structure

```text
.
├── client/
│   ├── index.html
│   └── src/
│       ├── main.js
│       └── styles.css
├── server/
│   └── index.js
├── package.json
└── README.md
```

## Tech stack

- **Frontend:** React loaded directly in the browser + HTML5 Canvas
- **Backend:** Node.js HTTP server
- **State:** In-memory simulation loop (no database)
- **Realtime strategy:** Lightweight client polling every 1.2 seconds

## MVP features

- 2D isometric pixel-style office floor with desks, meeting table, plants, and a scrum board
- Five autonomous agents:
  - Mina — Product Owner
  - Rio — Scrum Master
  - Sol — Developer back end
  - Ava — Developer front end
  - Kade — Developer lead
- Agent details panel with current task, goal, status, memory, and simulated reasoning
- Clickable agent selection from either the canvas or the chip list
- Tabs for:
  - Overview
  - Kanban board
  - Scrum logs
  - Working files
  - Chat (group or direct-to-agent)
- Rule-based simulation loop where agents move, rotate tasks, update thought bubbles, and push scrum/chat activity

## How the agents work

The agents are intentionally simple for the MVP so the experience is easy to understand and extend.

### Behavior model

Each agent has:

- `name`
- `role`
- `goal`
- `tasks[]`
- `thoughts[]`
- `bubbles[]`
- `stations[]` for movement waypoints
- `memory[]` for recent activity and user input

### Simulation loop

Every ~2.4 seconds, the backend:

1. Increments a global sprint tick
2. Moves each agent one tile closer to its next waypoint
3. Avoids blocked furniture tiles and occupied teammate tiles
4. Rotates the agent’s current task, thought, and chat bubble
5. Sets an activity status based on whether the agent is near the board, meeting table, or another teammate
6. Writes a short memory entry
7. Occasionally moves kanban tasks between columns
8. Appends scrum logs and chat updates

This keeps the office feeling alive without needing a heavyweight AI model.

## Replit setup instructions

1. Create a new **Node.js Repl**.
2. Copy this project into the repl.
3. No package installation is required for the server itself.
4. Start the app:
   ```bash
   npm start
   ```
5. Replit will expose port `3001` automatically.
6. Open the app in the browser. The page will load React modules from a CDN and then connect to the local simulation API.

## First-version improvement ideas

After the MVP, these 3 upgrades would make the office feel more realistic:

1. **Smarter movement and occupancy**
   - Add pathfinding and collision rules so agents avoid each other and choose context-aware destinations.
2. **Richer AI decision-making**
   - Replace the rule loop with LLM-backed planning for task assignment, memory summarization, and contextual conversations.
3. **More immersive UI**
   - Add sprite sheets, animated object states, sound cues, camera panning, and draggable inspection windows.

## Best improvement implemented now

The best first improvement for realism is **smarter movement and richer team state visibility**. This repository already implements that improvement by:

- Moving agents one tile at a time instead of teleporting between waypoints
- Avoiding blocked office furniture and occupied tiles during movement
- Updating agent statuses based on proximity to the board, table, or another teammate
- Surfacing working files, scrum logs, and group/direct chat in dedicated tabs

The next practical step would be full pathfinding, dynamic task negotiation, and sprite animation.
