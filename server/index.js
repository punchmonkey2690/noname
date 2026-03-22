import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const rootDir = normalize(join(__dirname, '..'));
const clientDir = join(rootDir, 'client');
const PORT = Number(process.env.PORT || 3001);
const GRID_SIZE = 12;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
};

const project = {
  name: 'NO NXME self-building sprint',
  goal: 'Five autonomous teammates are designing the virtual office and the website they live inside.',
  highlights: [
    'Product Owner keeps the team aligned on the Habbo-style office vision.',
    'Scrum Master paces between desks and looks for blockers.',
    'Developers alternate between desk work, board updates, and pairing sessions.',
  ],
};

const officeObjects = [
  { type: 'desk', x: 2, y: 4 },
  { type: 'desk', x: 3, y: 5 },
  { type: 'desk', x: 4, y: 6 },
  { type: 'desk', x: 6, y: 3 },
  { type: 'desk', x: 7, y: 4 },
  { type: 'table', x: 6, y: 7 },
  { type: 'plant', x: 1, y: 8 },
  { type: 'plant', x: 9, y: 1 },
  { type: 'scrum-board', x: 8, y: 6 },
  { type: 'board-zone', x: 8, y: 6 },
];

const blockedTiles = new Set(
  officeObjects
    .filter((item) => ['desk', 'table', 'plant', 'scrum-board'].includes(item.type))
    .map((item) => `${item.x},${item.y}`),
);

const agentDefinitions = [
  {
    id: 'po',
    name: 'Mina',
    role: 'Product Owner',
    color: '#ff7b7b',
    spawn: { x: 5, y: 2 },
    stations: [{ x: 5, y: 2 }, { x: 8, y: 5 }, { x: 9, y: 8 }],
    goal: 'Keep the experience magical, legible, and focused on the self-building office story.',
    tasks: ['Review landing page moodboard', 'Prioritize interactive office clicks', 'Approve release notes'],
    thoughts: [
      'If the office feels alive, users will forgive placeholder art in the MVP.',
      'I need the board to clearly reflect progress from concept to shipped.',
      'The website should feel like the team is literally building its own world.',
    ],
    bubbles: ['Vision check in progress.', 'Validating user fantasy.', 'Need a clearer wow moment.'],
  },
  {
    id: 'sm',
    name: 'Rio',
    role: 'Scrum Master',
    color: '#ffd166',
    spawn: { x: 4, y: 7 },
    stations: [{ x: 4, y: 7 }, { x: 5, y: 7 }, { x: 7, y: 5 }],
    goal: 'Remove blockers, keep conversations flowing, and surface team progress.',
    tasks: ['Run stand-up loop', 'Check in on blockers', 'Summarize scrum log'],
    thoughts: [
      'A quick sync near the meeting table keeps the pace healthy.',
      'If someone stalls at a desk too long, I should trigger a status update.',
      'I should capture proof of progress in the scrum log.',
    ],
    bubbles: ['Any blockers?', 'Sync at the table.', 'Daily log updated.'],
  },
  {
    id: 'be',
    name: 'Sol',
    role: 'Developer back end',
    color: '#60d6ff',
    spawn: { x: 2, y: 3 },
    stations: [{ x: 2, y: 3 }, { x: 3, y: 4 }, { x: 8, y: 5 }],
    goal: 'Drive the simulation engine, chat endpoints, and world-state updates.',
    tasks: ['Tune agent state machine', 'Expose chat endpoint', 'Refactor board events'],
    thoughts: [
      'If I keep the world state pure, polling stays predictable.',
      'The simulation loop should feel busy without becoming noisy.',
      'I need the board and agents to share one source of truth.',
    ],
    bubbles: ['API heartbeat stable.', 'State loop is ticking.', 'Shipping task events.'],
  },
  {
    id: 'fe',
    name: 'Ava',
    role: 'Developer front end',
    color: '#9d84ff',
    spawn: { x: 6, y: 2 },
    stations: [{ x: 6, y: 2 }, { x: 7, y: 3 }, { x: 8, y: 5 }],
    goal: 'Render the pixel office, detail panel, and team activity tabs.',
    tasks: ['Polish avatar click states', 'Render kanban tab', 'Balance layout spacing'],
    thoughts: [
      'The pixel aesthetic should read instantly, even with simple rectangles.',
      'If the canvas sells depth, the whole office feels more premium.',
      'The side panel must explain the simulation without clutter.',
    ],
    bubbles: ['Canvas pass in progress.', 'Tweaking click targets.', 'UI feels more alive now.'],
  },
  {
    id: 'lead',
    name: 'Kade',
    role: 'Developer lead',
    color: '#73e2a7',
    spawn: { x: 7, y: 8 },
    stations: [{ x: 7, y: 8 }, { x: 6, y: 7 }, { x: 8, y: 5 }],
    goal: 'Coordinate architecture, pair with developers, and keep delivery cohesive.',
    tasks: ['Review simulation architecture', 'Pair on office rendering', 'Close sprint demo loop'],
    thoughts: [
      'I should spend time both at the desks and at the board to keep context shared.',
      'The MVP needs one excellent loop: move, think, talk, inspect.',
      'A clean architecture now will make live AI swaps easier later.',
    ],
    bubbles: ['Pairing session ready.', 'Reviewing integration.', 'Keeping the sprint cohesive.'],
  },
];

const world = {
  tick: 0,
  officeObjects,
  board: {
    'To Do': [
      { id: 'todo-1', title: 'Pixel polish for office floor', owner: 'Ava' },
      { id: 'todo-2', title: 'Sprint retro summary', owner: 'Rio' },
    ],
    'In Progress': [
      { id: 'progress-1', title: 'Rule-based agent scheduler', owner: 'Sol' },
      { id: 'progress-2', title: 'Vision pass on homepage copy', owner: 'Mina' },
    ],
    Done: [
      { id: 'done-1', title: 'Initial office blueprint', owner: 'Kade' },
    ],
  },
  files: [
    { name: 'office-map.json', owner: 'Kade', summary: 'Tile plan for desks, plants, board zone, and meeting table.' },
    { name: 'agent-behavior.md', owner: 'Sol', summary: 'State transitions for roaming, pairing, and status updates.' },
    { name: 'ui-notes.md', owner: 'Ava', summary: 'Interaction notes for side panel, tabs, and pixel office rendering.' },
    { name: 'sprint-goals.md', owner: 'Mina', summary: 'Narrative goals for the NO NXME self-building workspace demo.' },
  ],
  logs: [],
  chatLog: [],
  agents: agentDefinitions.map((agent) => ({
    ...agent,
    position: { ...agent.spawn },
    currentTask: agent.tasks[0],
    status: 'Planning next move',
    thought: agent.thoughts[0],
    chatBubble: agent.bubbles[0],
    memory: [`Spawned at (${agent.spawn.x}, ${agent.spawn.y})`, `Goal: ${agent.goal}`],
    routeIndex: 0,
  })),
};

function addLog(message) {
  world.logs.unshift({
    id: `log-${world.tick}-${world.logs.length}`,
    time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    message,
  });
  world.logs = world.logs.slice(0, 16);
}

function addChat(from, to, message) {
  world.chatLog.unshift({
    id: `chat-${world.tick}-${world.chatLog.length}`,
    from,
    to,
    message,
  });
  world.chatLog = world.chatLog.slice(0, 24);
}

function cycleBoard() {
  if (world.tick % 5 !== 0) return;
  const todoTask = world.board['To Do'].shift();
  if (todoTask) {
    world.board['In Progress'].push(todoTask);
    addLog(`${todoTask.owner} pulled “${todoTask.title}” into In Progress.`);
    return;
  }
  const progressTask = world.board['In Progress'].shift();
  if (progressTask) {
    world.board.Done.push(progressTask);
    addLog(`${progressTask.owner} completed “${progressTask.title}”.`);
  }
}

function sameTile(a, b) {
  return a.x === b.x && a.y === b.y;
}

function getTarget(agent) {
  return agent.stations[agent.routeIndex];
}

function nextStepToward(current, target, occupied) {
  const candidates = [];
  if (target.x !== current.x) candidates.push({ x: current.x + Math.sign(target.x - current.x), y: current.y });
  if (target.y !== current.y) candidates.push({ x: current.x, y: current.y + Math.sign(target.y - current.y) });
  candidates.push(
    { x: current.x + 1, y: current.y },
    { x: current.x - 1, y: current.y },
    { x: current.x, y: current.y + 1 },
    { x: current.x, y: current.y - 1 },
  );
  return candidates.find((candidate) => {
    if (candidate.x < 0 || candidate.y < 0 || candidate.x >= GRID_SIZE || candidate.y >= GRID_SIZE) return false;
    const key = `${candidate.x},${candidate.y}`;
    return !blockedTiles.has(key) && !occupied.has(key);
  });
}

function moveAgent(agent, occupied) {
  let target = getTarget(agent);
  if (sameTile(agent.position, target)) {
    agent.routeIndex = (agent.routeIndex + 1) % agent.stations.length;
    target = getTarget(agent);
  }
  const step = nextStepToward(agent.position, target, occupied);
  if (!step) return;
  occupied.delete(`${agent.position.x},${agent.position.y}`);
  agent.position = step;
  occupied.add(`${agent.position.x},${agent.position.y}`);
}

function findNearbyAgent(agent) {
  return world.agents.find((other) => other.id !== agent.id && Math.abs(other.position.x - agent.position.x) + Math.abs(other.position.y - agent.position.y) <= 1);
}

function describeStatus(agent) {
  if (Math.abs(agent.position.x - 8) + Math.abs(agent.position.y - 5) <= 1) return 'Updating scrum board';
  if (Math.abs(agent.position.x - 6) + Math.abs(agent.position.y - 7) <= 1) return 'Collaborating at table';
  const nearby = findNearbyAgent(agent);
  if (nearby) return `Pairing with ${nearby.name}`;
  return 'Focused maker mode';
}

function updateAgent(agent, index, occupied) {
  moveAgent(agent, occupied);
  agent.currentTask = agent.tasks[world.tick % agent.tasks.length];
  agent.thought = agent.thoughts[world.tick % agent.thoughts.length];
  agent.chatBubble = agent.bubbles[(world.tick + index) % agent.bubbles.length];
  agent.status = describeStatus(agent);
  agent.memory.unshift(`Tick ${world.tick}: ${agent.currentTask} @ (${agent.position.x}, ${agent.position.y})`);
  agent.memory = agent.memory.slice(0, 5);
}

function simulateConversations() {
  const groupMoments = [
    ['Rio', 'group', 'Team, quick pulse check before we move cards.'],
    ['Mina', 'group', 'Remember: the office should feel like a product demo and a workplace.'],
    ['Kade', 'group', 'Let’s keep the inspect panel crisp and useful.'],
    ['Sol', 'group', 'Backend loop is stable; front end can trust the payloads.'],
    ['Ava', 'group', 'I just tightened the avatar hitbox and panel spacing.'],
  ];
  addChat(...groupMoments[world.tick % groupMoments.length]);
}

function runSimulation() {
  world.tick += 1;
  const occupied = new Set(world.agents.map((agent) => `${agent.position.x},${agent.position.y}`));
  world.agents.forEach((agent, index) => updateAgent(agent, index, occupied));
  cycleBoard();
  simulateConversations();
  const spotlight = world.agents[world.tick % world.agents.length];
  addLog(`Sprint tick ${world.tick}: ${spotlight.name} is ${spotlight.status.toLowerCase()}.`);
}

function getWorldPayload() {
  return JSON.stringify({
    project,
    officeObjects: world.officeObjects,
    agents: world.agents,
    board: world.board,
    logs: world.logs,
    files: world.files,
    chatLog: world.chatLog,
  });
}

async function serveStatic(pathname, res) {
  const safePath = pathname === '/' ? '/index.html' : pathname;
  const requestedPath = normalize(join(clientDir, safePath));
  if (!requestedPath.startsWith(clientDir)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }
  try {
    const fileStat = await stat(requestedPath);
    if (fileStat.isDirectory()) {
      return serveStatic(join(safePath, 'index.html'), res);
    }
    const body = await readFile(requestedPath);
    res.writeHead(200, { 'Content-Type': MIME_TYPES[extname(requestedPath)] || 'text/plain; charset=utf-8' });
    res.end(body);
  } catch {
    const fallback = await readFile(join(clientDir, 'index.html'));
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(fallback);
  }
}

addLog('NO NXME office booted successfully.');
addChat('SYSTEM', 'group', 'Welcome to the self-building NO NXME office. Click any agent to inspect their mind.');
setInterval(runSimulation, 2400);

const server = createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host}`);

  if (req.method === 'GET' && url.pathname === '/api/world') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(getWorldPayload());
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/chat') {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', () => {
      const { target, message } = JSON.parse(body || '{}');
      addChat('You', target, message);
      if (target === 'group') {
        addChat('Rio', 'group', 'Captured — I’ll bring that into the next sync.');
        addLog(`User posted a group note: “${message}”.`);
      } else {
        const agent = world.agents.find((entry) => entry.id === target);
        if (agent) {
          addChat(agent.name, target, `Copy that. I’ll fold “${message}” into ${agent.currentTask.toLowerCase()}.`);
          agent.memory.unshift(`User note: ${message}`);
          agent.memory = agent.memory.slice(0, 5);
          addLog(`${agent.name} received a direct user message.`);
        }
      }
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ ok: true }));
    });
    return;
  }

  await serveStatic(url.pathname, res);
});

server.listen(PORT, () => {
  console.log(`NO NXME server running on http://localhost:${PORT}`);
});
