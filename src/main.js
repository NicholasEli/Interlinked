import './styles.css';
import { openBoard } from './store.js';
import { getVideoId } from './youtube.js';

const columnsElement = document.querySelector('#columns');
const status = document.querySelector('#board-status');
const columnTemplate = document.querySelector('#column-template');
const trailerTemplate = document.querySelector('#trailer-template');

window.addEventListener('hashchange', () => window.location.reload());

const boardKey = window.location.hash.slice(1);
if (boardKey && !/^[A-Za-z0-9_-]{43}$/.test(boardKey)) {
  status.textContent = 'This board link is incomplete. Open the full link to see the trailers.';
} else if (boardKey) {
  const board = openBoard(boardKey);
  if (board) {
    showBoard(board);
  } else {
    status.textContent = 'The shared board is waiting for Firebase setup.';
  }
}

function showBoard(board) {
  status.textContent = 'Loading trailers…';
  const columns = [createColumn('Victoria', board), createColumn('Nicholas', board)];
  for (const column of columns) columnsElement.append(column.element);

  board.subscribe(snapshot => {
    if (snapshot.metadata.fromCache && columnsElement.hidden) {
      status.textContent = 'Connecting to the shared board…';
      return;
    }

    const trailers = snapshot.docs.map(doc => ({ ...doc.data(), ref: doc.ref, id: doc.id }));
    const connected = !snapshot.metadata.fromCache;
    for (const column of columns) column.render(trailers, connected);
    columnsElement.hidden = false;
    status.hidden = connected;
    status.textContent = connected ? '' : 'Connection lost. Reconnecting to the shared board…';
  }, error => {
    for (const column of columns) column.setConnected(false);
    status.hidden = false;
    status.textContent = error.code === 'permission-denied'
      ? 'This board link is no longer valid. Check that you have the current link.'
      : 'Couldn’t load the trailers. Reload the page to try again.';
  });
}

function createColumn(name, board) {
  const column = name.toLowerCase();
  const element = columnTemplate.content.firstElementChild.cloneNode(true);
  const heading = element.querySelector('h2');
  const form = element.querySelector('form');
  const input = form.elements.url;
  const addButton = form.querySelector('button');
  const error = element.querySelector('.column-error');
  const empty = element.querySelector('.empty');
  const list = element.querySelector('ul');
  const cards = new Map();
  let connected = false;
  let adding = false;

  element.classList.add(column);
  element.setAttribute('aria-labelledby', `${column}-heading`);
  heading.id = `${column}-heading`;
  heading.textContent = name;
  input.id = `${column}-url`;
  input.setAttribute('aria-describedby', `${column}-error`);
  form.querySelector('label').htmlFor = input.id;
  error.id = `${column}-error`;

  function showError(message) {
    error.textContent = message;
    error.hidden = !message;
  }

  function setConnected(value) {
    connected = value;
    addButton.disabled = adding || !connected;
    for (const card of cards.values()) card.setConnected(connected);
  }

  input.addEventListener('input', () => {
    if (!input.hasAttribute('aria-invalid')) return;
    input.removeAttribute('aria-invalid');
    showError('');
  });

  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (adding || !connected) return;
    const submittedUrl = input.value;
    const videoId = getVideoId(submittedUrl);
    if (!videoId) {
      input.setAttribute('aria-invalid', 'true');
      showError('Enter a YouTube video URL.');
      input.focus();
      return;
    }

    showError('');
    adding = true;
    addButton.textContent = 'Adding…';
    setConnected(connected);
    try {
      await board.add(videoId, column);
      if (input.value === submittedUrl) input.value = '';
    } catch {
      showError('Couldn’t add the trailer. Try again.');
    } finally {
      adding = false;
      addButton.textContent = 'Add trailer';
      setConnected(connected);
    }
  });

  return {
    element,
    setConnected,
    render(trailers, online) {
      const visible = new Set();
      let nextElement = list.firstElementChild;
      for (const trailer of trailers) {
        if (trailer.column !== column) continue;
        visible.add(trailer.id);
        let card = cards.get(trailer.id);
        if (!card) {
          card = createCard(trailer, board, input, showError);
          cards.set(trailer.id, card);
        }
        card.update(trailer.watched);
        if (card.element === nextElement) {
          nextElement = nextElement.nextElementSibling;
        } else {
          list.insertBefore(card.element, nextElement);
        }
      }
      for (const [id, card] of cards) {
        if (visible.has(id)) continue;
        card.element.remove();
        cards.delete(id);
      }
      empty.hidden = visible.size > 0;
      setConnected(online);
    },
  };
}

function createCard({ ref, videoId }, board, input, showError) {
  const element = trailerTemplate.content.firstElementChild.cloneNode(true);
  const link = element.querySelector('a');
  const image = element.querySelector('img');
  const checkbox = element.querySelector('input');
  const remove = element.querySelector('button');
  let watched = false;
  let connected = false;
  let saving = false;

  link.href = `https://www.youtube.com/watch?v=${videoId}`;
  link.setAttribute('aria-label', `Watch trailer ${videoId} on YouTube (opens in a new tab)`);
  image.src = `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`;
  image.addEventListener('error', () => { image.hidden = true; });
  checkbox.setAttribute('aria-label', `Watched trailer ${videoId}`);
  remove.setAttribute('aria-label', `Delete trailer ${videoId}`);

  function setConnected(value) {
    connected = value;
    // Keep the focused checkbox keyboard-accessible while its write is pending.
    checkbox.setAttribute('aria-disabled', String(!connected || saving));
    remove.disabled = !connected || saving;
  }

  async function save(change, errorMessage) {
    showError('');
    saving = true;
    setConnected(connected);
    try {
      await change();
    } catch {
      showError(errorMessage);
    } finally {
      saving = false;
      checkbox.checked = watched;
      setConnected(connected);
    }
  }

  checkbox.addEventListener('change', () => {
    if (saving || !connected) {
      checkbox.checked = watched;
      return;
    }
    const checked = checkbox.checked;
    void save(() => board.setWatched(ref, checked), 'Couldn’t change watched status. Try again.');
  });

  remove.addEventListener('click', () => {
    if (!window.confirm('Delete this trailer from the shared board?')) return;
    input.focus();
    void save(() => board.remove(ref), 'Couldn’t delete the trailer. Try again.');
  });

  return {
    element,
    setConnected,
    update(checked) {
      watched = checked;
      checkbox.checked = checked;
    },
  };
}
