import React from 'react';
import ReactDOM from 'react-dom/client';
import { html } from 'htm/react';

const TILE_WIDTH = 64;
const TILE_HEIGHT = 32;
const GRID_WIDTH = 12;
const GRID_HEIGHT = 12;
const OFFICE_ORIGIN = { x: 390, y: 120 };
const TABS = ['overview', 'kanban', 'logs', 'files', 'chat'];

function isoToScreen(x, y) {
  return {
    x: OFFICE_ORIGIN.x + (x - y) * (TILE_WIDTH / 2),
    y: OFFICE_ORIGIN.y + (x + y) * (TILE_HEIGHT / 2),
  };
}

function drawFloor(ctx, officeObjects) {
  for (let x = 0; x < GRID_WIDTH; x += 1) {
    for (let y = 0; y < GRID_HEIGHT; y += 1) {
      const point = isoToScreen(x, y);
      ctx.beginPath();
      ctx.moveTo(point.x, point.y);
      ctx.lineTo(point.x + TILE_WIDTH / 2, point.y + TILE_HEIGHT / 2);
      ctx.lineTo(point.x, point.y + TILE_HEIGHT);
      ctx.lineTo(point.x - TILE_WIDTH / 2, point.y + TILE_HEIGHT / 2);
      ctx.closePath();
      ctx.fillStyle = (x + y) % 2 === 0 ? '#4b2f66' : '#583875';
      ctx.fill();
      ctx.strokeStyle = '#2f1b47';
      ctx.stroke();
    }
  }

  officeObjects.forEach((item) => {
    if (item.type !== 'board-zone') return;
    const point = isoToScreen(item.x, item.y);
    ctx.fillStyle = 'rgba(255, 209, 102, 0.18)';
    ctx.beginPath();
    ctx.moveTo(point.x, point.y + 2);
    ctx.lineTo(point.x + TILE_WIDTH / 2, point.y + TILE_HEIGHT / 2 + 2);
    ctx.lineTo(point.x, point.y + TILE_HEIGHT + 2);
    ctx.lineTo(point.x - TILE_WIDTH / 2, point.y + TILE_HEIGHT / 2 + 2);
    ctx.closePath();
    ctx.fill();
  });
}

function drawObjects(ctx, objects) {
  objects.forEach((item) => {
    const point = isoToScreen(item.x, item.y);
    if (item.type === 'desk') {
      ctx.fillStyle = '#7c5337';
      ctx.fillRect(point.x - 18, point.y - 16, 36, 24);
      ctx.fillStyle = '#513220';
      ctx.fillRect(point.x - 18, point.y + 6, 4, 18);
      ctx.fillRect(point.x + 14, point.y + 6, 4, 18);
      ctx.fillStyle = '#60d6ff';
      ctx.fillRect(point.x - 12, point.y - 12, 14, 10);
    }
    if (item.type === 'table') {
      ctx.fillStyle = '#8c6244';
      ctx.fillRect(point.x - 26, point.y - 14, 52, 22);
      ctx.fillStyle = '#5f3d29';
      ctx.fillRect(point.x - 22, point.y + 8, 6, 18);
      ctx.fillRect(point.x + 16, point.y + 8, 6, 18);
    }
    if (item.type === 'plant') {
      ctx.fillStyle = '#7c5337';
      ctx.fillRect(point.x - 8, point.y - 4, 16, 12);
      ctx.fillStyle = '#61d56d';
      ctx.beginPath();
      ctx.arc(point.x, point.y - 10, 14, 0, Math.PI * 2);
      ctx.fill();
    }
    if (item.type === 'scrum-board') {
      ctx.fillStyle = '#d4f4ff';
      ctx.fillRect(point.x - 32, point.y - 42, 64, 46);
      ctx.strokeStyle = '#375e7c';
      ctx.strokeRect(point.x - 32, point.y - 42, 64, 46);
      ctx.fillStyle = '#f28f3b';
      ctx.fillRect(point.x - 24, point.y - 30, 14, 12);
      ctx.fillStyle = '#71c562';
      ctx.fillRect(point.x - 4, point.y - 30, 14, 12);
      ctx.fillStyle = '#ef476f';
      ctx.fillRect(point.x + 16, point.y - 30, 14, 12);
    }
  });
}

function drawAgents(ctx, agents, selectedId) {
  const sorted = [...agents].sort((a, b) => (a.position.x + a.position.y) - (b.position.x + b.position.y));
  sorted.forEach((agent) => {
    const point = isoToScreen(agent.position.x, agent.position.y);
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.beginPath();
    ctx.ellipse(point.x, point.y + 12, 16, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = agent.color;
    ctx.fillRect(point.x - 10, point.y - 34, 20, 28);
    ctx.fillStyle = '#ffd6a5';
    ctx.fillRect(point.x - 8, point.y - 52, 16, 16);
    ctx.fillStyle = '#2d1e2f';
    ctx.fillRect(point.x - 8, point.y - 55, 16, 6);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(point.x - 7, point.y - 22, 14, 6);

    ctx.fillStyle = selectedId === agent.id ? '#ffe066' : '#aee8ff';
    ctx.fillRect(point.x - 20, point.y - 72, Math.min(agent.chatBubble.length * 4.2, 92), 16);
    ctx.fillStyle = '#1b1130';
    ctx.font = '9px Inter';
    ctx.fillText(agent.chatBubble.slice(0, 22), point.x - 16, point.y - 60);

    ctx.fillStyle = '#ffffff';
    ctx.font = '10px Inter';
    ctx.fillText(agent.name, point.x - 16, point.y - 38);
  });
}

function App() {
  const [world, setWorld] = React.useState(null);
  const [selectedId, setSelectedId] = React.useState(null);
  const [activeTab, setActiveTab] = React.useState('overview');
  const [chatTarget, setChatTarget] = React.useState('group');
  const [message, setMessage] = React.useState('');
  const canvasRef = React.useRef(null);

  React.useEffect(() => {
    let active = true;
    async function loadWorld() {
      const response = await fetch('/api/world');
      const nextWorld = await response.json();
      if (!active) return;
      setWorld(nextWorld);
      setSelectedId((current) => current || nextWorld.agents[0]?.id || null);
    }
    loadWorld();
    const intervalId = setInterval(loadWorld, 1200);
    return () => {
      active = false;
      clearInterval(intervalId);
    };
  }, []);

  const selectedAgent = React.useMemo(() => (
    world?.agents.find((agent) => agent.id === selectedId) || null
  ), [world, selectedId]);

  React.useEffect(() => {
    if (!world || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    drawFloor(ctx, world.officeObjects);
    drawObjects(ctx, world.officeObjects);
    drawAgents(ctx, world.agents, selectedId);
  }, [world, selectedId]);

  function pickAgent(event) {
    if (!world || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const clickY = event.clientY - rect.top;
    const hit = [...world.agents].reverse().find((agent) => {
      const point = isoToScreen(agent.position.x, agent.position.y);
      return clickX >= point.x - 16 && clickX <= point.x + 16 && clickY >= point.y - 54 && clickY <= point.y + 6;
    });
    if (hit) {
      setSelectedId(hit.id);
      setChatTarget(hit.id);
    }
  }

  async function sendMessage(event) {
    event.preventDefault();
    const trimmed = message.trim();
    if (!trimmed) return;
    await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target: chatTarget, message: trimmed }),
    });
    setMessage('');
    const response = await fetch('/api/world');
    setWorld(await response.json());
  }

  if (!world) {
    return html`<div className="loading">Booting NO NXME virtual office…</div>`;
  }

  const visibleMessages = world.chatLog.filter((entry) => {
    if (chatTarget === 'group') return entry.to === 'group' || entry.from === 'SYSTEM';
    const chosenAgent = world.agents.find((agent) => agent.id === chatTarget);
    return entry.to === chatTarget || entry.from === chosenAgent?.name || entry.from === 'You' || entry.from === 'SYSTEM';
  });

  return html`
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Habbo-inspired AI workspace</p>
          <h1>NO NXME Virtual Office</h1>
        </div>
        <div className="project-pill">
          <span>Project Sprint</span>
          <strong>${world.project.name}</strong>
        </div>
      </header>

      <main className="layout">
        <section className="office-card">
          <div className="office-meta">
            <div>
              <h2>Pixel Office Floor</h2>
              <p>${world.project.goal}</p>
            </div>
            <div className="legend">
              <span><i className="swatch swatch-manager"></i>Alignment</span>
              <span><i className="swatch swatch-dev"></i>Builders</span>
              <span><i className="swatch swatch-sm"></i>Facilitation</span>
            </div>
          </div>

          <canvas ref=${canvasRef} width="820" height="560" className="office-canvas" onClick=${pickAgent}></canvas>

          <div className="agent-strip">
            ${world.agents.map((agent) => html`
              <button
                key=${agent.id}
                className=${agent.id === selectedId ? 'agent-chip active' : 'agent-chip'}
                onClick=${() => {
                  setSelectedId(agent.id);
                  setChatTarget(agent.id);
                }}
              >
                <span>${agent.name}</span>
                <small>${agent.role}</small>
              </button>
            `)}
          </div>
        </section>

        <aside className="sidebar">
          <div className="panel card">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Agent detail</p>
                <h2>${selectedAgent?.name}</h2>
              </div>
              <span className="role-tag">${selectedAgent?.role}</span>
            </div>
            <div className="status-grid">
              <div><label>Goal</label><p>${selectedAgent?.goal}</p></div>
              <div><label>Current task</label><p>${selectedAgent?.currentTask}</p></div>
              <div><label>State</label><p>${selectedAgent?.status}</p></div>
              <div><label>Position</label><p>Tile ${selectedAgent?.position.x}, ${selectedAgent?.position.y}</p></div>
            </div>
            <div className="thought-box">
              <label>Internal reasoning</label>
              <p>${selectedAgent?.thought}</p>
            </div>
            <div className="memory-box">
              <label>Recent memory</label>
              <ul>${selectedAgent?.memory.map((entry) => html`<li key=${entry}>${entry}</li>`)}</ul>
            </div>
          </div>

          <div className="panel card grow">
            <div className="tab-bar">
              ${TABS.map((tab) => html`
                <button key=${tab} className=${activeTab === tab ? 'tab active' : 'tab'} onClick=${() => setActiveTab(tab)}>${tab}</button>
              `)}
            </div>

            ${activeTab === 'overview' && html`
              <div className="tab-content">
                <h3>Live Collaboration Snapshot</h3>
                <ul className="bullet-list">${world.project.highlights.map((item) => html`<li key=${item}>${item}</li>`)}</ul>
                <h3>Nearby Conversations</h3>
                <div className="bubble-list">
                  ${world.agents.map((agent) => html`
                    <article key=${agent.id} className="bubble-item"><strong>${agent.name}</strong><p>${agent.chatBubble}</p></article>
                  `)}
                </div>
              </div>
            `}

            ${activeTab === 'kanban' && html`
              <div className="tab-content">
                <h3>Scrum Board</h3>
                <div className="kanban-grid">
                  ${Object.entries(world.board).map(([column, tasks]) => html`
                    <section key=${column} className="kanban-column">
                      <header>${column}</header>
                      ${tasks.map((task) => html`<article key=${task.id} className="task-card"><strong>${task.title}</strong><small>${task.owner}</small></article>`)}
                    </section>
                  `)}
                </div>
              </div>
            `}

            ${activeTab === 'logs' && html`
              <div className="tab-content">
                <h3>Scrum Logs</h3>
                <div className="log-list">
                  ${world.logs.map((entry) => html`<p key=${entry.id}><span>${entry.time}</span>${entry.message}</p>`)}
                </div>
              </div>
            `}

            ${activeTab === 'files' && html`
              <div className="tab-content">
                <h3>Working Files</h3>
                <div className="file-grid">
                  ${world.files.map((file) => html`<article key=${file.name} className="file-card"><strong>${file.name}</strong><p>${file.summary}</p><small>Edited by ${file.owner}</small></article>`)}
                </div>
              </div>
            `}

            ${activeTab === 'chat' && html`
              <div className="tab-content chat-tab">
                <div className="chat-toolbar">
                  <select value=${chatTarget} onChange=${(event) => setChatTarget(event.target.value)}>
                    <option value="group">Group Chat</option>
                    ${world.agents.map((agent) => html`<option key=${agent.id} value=${agent.id}>${agent.name}</option>`)}
                  </select>
                </div>
                <div className="chat-stream">
                  ${visibleMessages.map((entry) => html`<p key=${entry.id}><strong>${entry.from}</strong>: ${entry.message}</p>`)}
                </div>
                <form className="chat-form" onSubmit=${sendMessage}>
                  <input value=${message} onInput=${(event) => setMessage(event.target.value)} placeholder="Ask an agent or the whole squad…" />
                  <button type="submit">Send</button>
                </form>
              </div>
            `}
          </div>
        </aside>
      </main>
    </div>
  `;
}

ReactDOM.createRoot(document.getElementById('root')).render(html`<${App} />`);
