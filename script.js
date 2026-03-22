const form = document.getElementById('task-form');
const input = document.getElementById('task-input');
const taskList = document.getElementById('task-list');
const taskTemplate = document.getElementById('task-template');
const activeCount = document.getElementById('active-count');
const completedCount = document.getElementById('completed-count');
const filterButtons = document.querySelectorAll('.filter');

const STORAGE_KEY = 'pixel-tasks-save';

let tasks = loadTasks();
let currentFilter = 'all';

render();

form.addEventListener('submit', (event) => {
  event.preventDefault();

  const value = input.value.trim();
  if (!value) {
    return;
  }

  tasks.unshift({
    id: crypto.randomUUID(),
    text: value,
    completed: false,
  });

  input.value = '';
  persist();
  render();
});

filterButtons.forEach((button) => {
  button.addEventListener('click', () => {
    currentFilter = button.dataset.filter;
    filterButtons.forEach((candidate) => candidate.classList.toggle('is-active', candidate === button));
    render();
  });
});

function loadTasks() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : seedTasks();
  } catch {
    return seedTasks();
  }
}

function seedTasks() {
  return [
    { id: '1', text: 'Collect potion ingredients', completed: false },
    { id: '2', text: 'Repair the save crystal', completed: true },
    { id: '3', text: 'Beat inbox mini-boss', completed: false },
  ];
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

function render() {
  taskList.innerHTML = '';

  const filteredTasks = tasks.filter((task) => {
    if (currentFilter === 'active') {
      return !task.completed;
    }

    if (currentFilter === 'completed') {
      return task.completed;
    }

    return true;
  });

  if (!filteredTasks.length) {
    const emptyState = document.createElement('li');
    emptyState.className = 'empty-state';
    emptyState.textContent = currentFilter === 'completed'
      ? 'No completed quests yet.'
      : currentFilter === 'active'
        ? 'No active quests. Time to rest!'
        : 'Your quest log is empty. Add a mission!';
    taskList.append(emptyState);
  }

  filteredTasks.forEach((task) => {
    const fragment = taskTemplate.content.cloneNode(true);
    const item = fragment.querySelector('.task-item');
    const checkbox = fragment.querySelector('.task-checkbox');
    const text = fragment.querySelector('.task-text');
    const deleteButton = fragment.querySelector('.delete-button');

    item.classList.toggle('is-complete', task.completed);
    checkbox.checked = task.completed;
    checkbox.setAttribute('aria-label', `Mark ${task.text} as ${task.completed ? 'active' : 'done'}`);
    text.textContent = task.text;

    checkbox.addEventListener('change', () => {
      tasks = tasks.map((entry) => (
        entry.id === task.id ? { ...entry, completed: checkbox.checked } : entry
      ));
      persist();
      render();
    });

    deleteButton.addEventListener('click', () => {
      tasks = tasks.filter((entry) => entry.id !== task.id);
      persist();
      render();
    });

    taskList.append(fragment);
  });

  const completed = tasks.filter((task) => task.completed).length;
  completedCount.textContent = completed;
  activeCount.textContent = tasks.length - completed;
}
