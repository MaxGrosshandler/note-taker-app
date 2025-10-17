const API_URL = 'http://localhost:3000/api/notes';

let currentNoteId = null;
let notes = [];

// DOM Elements
const newNoteBtn = document.getElementById('new-note-btn');
const notesList = document.getElementById('notes-list');
const emptyState = document.getElementById('empty-state');
const noteEditor = document.getElementById('note-editor');
const noteTitle = document.getElementById('note-title');
const noteContent = document.getElementById('note-content');
const saveBtn = document.getElementById('save-btn');
const deleteBtn = document.getElementById('delete-btn');
const cancelBtn = document.getElementById('cancel-btn');
const emailBtn = document.getElementById('email-btn');

// Email elements
const emailStatusContainer = document.getElementById('email-status-container');
const emailConfiguredText = document.getElementById('email-configured-text');
const emailModal = document.getElementById('email-modal');
const emailTo = document.getElementById('email-to');
const emailSubject = document.getElementById('email-subject');
const emailPreview = document.getElementById('email-preview');
const sendEmailBtn = document.getElementById('send-email-btn');
const cancelEmailBtn = document.getElementById('cancel-email-btn');
const closeModal = document.querySelector('.close');

// Event Listeners
newNoteBtn.addEventListener('click', createNewNote);
saveBtn.addEventListener('click', saveNote);
deleteBtn.addEventListener('click', deleteNote);
cancelBtn.addEventListener('click', cancelEdit);
emailBtn.addEventListener('click', openEmailModal);
sendEmailBtn.addEventListener('click', sendEmailHandler);
cancelEmailBtn.addEventListener('click', closeEmailModal);
closeModal.addEventListener('click', closeEmailModal);

// Close modal when clicking outside
window.addEventListener('click', (e) => {
    if (e.target === emailModal) {
        closeEmailModal();
    }
});

// Initialize app
loadNotes();
checkEmailConfig();

// Functions
async function loadNotes() {
    try {
        const response = await fetch(API_URL);
        notes = await response.json();
        renderNotesList();
    } catch (error) {
        console.error('Error loading notes:', error);
        alert('Failed to load notes. Make sure the server is running.');
    }
}

function renderNotesList() {
    notesList.innerHTML = '';

    if (notes.length === 0) {
        notesList.innerHTML = '<p style="padding: 1rem; color: #95a5a6;">No notes yet</p>';
        return;
    }

    notes.forEach(note => {
        const noteItem = document.createElement('div');
        noteItem.className = 'note-item';
        if (note.id === currentNoteId) {
            noteItem.classList.add('active');
        }

        const date = new Date(note.updated_at);
        const formattedDate = date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        noteItem.innerHTML = `
            <div class="note-item-title">${escapeHtml(note.title)}</div>
            <div class="note-item-date">${formattedDate}</div>
        `;

        noteItem.addEventListener('click', () => loadNote(note.id));
        notesList.appendChild(noteItem);
    });
}

function createNewNote() {
    currentNoteId = null;
    noteTitle.value = '';
    noteContent.value = '';
    showEditor();
    noteTitle.focus();
}

async function loadNote(id) {
    try {
        const response = await fetch(`${API_URL}/${id}`);
        const note = await response.json();

        currentNoteId = note.id;
        noteTitle.value = note.title;
        noteContent.value = note.content;

        showEditor();
        renderNotesList();
    } catch (error) {
        console.error('Error loading note:', error);
        alert('Failed to load note');
    }
}

async function saveNote() {
    const title = noteTitle.value.trim();
    const content = noteContent.value.trim();

    if (!title || !content) {
        alert('Please enter both title and content');
        return;
    }

    try {
        let response;
        if (currentNoteId) {
            // Update existing note
            response = await fetch(`${API_URL}/${currentNoteId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ title, content }),
            });
        } else {
            // Create new note
            response = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ title, content }),
            });
        }

        const savedNote = await response.json();
        currentNoteId = savedNote.id;

        await loadNotes();
        renderNotesList();
    } catch (error) {
        console.error('Error saving note:', error);
        alert('Failed to save note');
    }
}

async function deleteNote() {
    if (!currentNoteId) return;

    if (!confirm('Are you sure you want to delete this note?')) {
        return;
    }

    try {
        await fetch(`${API_URL}/${currentNoteId}`, {
            method: 'DELETE',
        });

        currentNoteId = null;
        await loadNotes();
        hideEditor();
    } catch (error) {
        console.error('Error deleting note:', error);
        alert('Failed to delete note');
    }
}

function cancelEdit() {
    hideEditor();
    currentNoteId = null;
    renderNotesList();
}

function showEditor() {
    emptyState.style.display = 'none';
    noteEditor.style.display = 'flex';
}

function hideEditor() {
    emptyState.style.display = 'flex';
    noteEditor.style.display = 'none';
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Email Functions

// Check email configuration status
async function checkEmailConfig() {
    try {
        const response = await fetch('http://localhost:3000/api/email/status');
        const data = await response.json();

        if (data.configured && data.email) {
            emailStatusContainer.style.display = 'flex';
            emailConfiguredText.textContent = `Email: ${data.email}`;
        } else {
            emailStatusContainer.style.display = 'none';
        }
    } catch (error) {
        console.error('Error checking email config status:', error);
    }
}

// Open email modal
function openEmailModal() {
    const title = noteTitle.value.trim();
    const content = noteContent.value.trim();

    if (!title || !content) {
        alert('Please enter both title and content before emailing');
        return;
    }

    // Pre-fill the subject with note title
    emailSubject.value = title;
    emailPreview.textContent = content;

    // Show the modal
    emailModal.classList.add('show');
}

// Close email modal
function closeEmailModal() {
    emailModal.classList.remove('show');
    emailTo.value = '';
    emailSubject.value = '';
    emailPreview.textContent = '';
}

// Send email handler
async function sendEmailHandler() {
    const to = emailTo.value.trim();
    const subject = emailSubject.value.trim();
    const content = noteContent.value.trim();

    if (!to || !subject || !content) {
        alert('Please fill in all fields');
        return;
    }

    // Disable send button during request
    sendEmailBtn.disabled = true;
    sendEmailBtn.textContent = 'Sending...';

    try {
        const response = await fetch('http://localhost:3000/api/email/send', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ to, subject, content }),
        });

        const data = await response.json();

        if (response.ok && data.success) {
            alert('Email sent successfully!');
            closeEmailModal();
        } else {
            alert('Failed to send email: ' + (data.error || 'Unknown error'));
        }
    } catch (error) {
        console.error('Error sending email:', error);
        alert('Failed to send email: ' + error.message);
    } finally {
        sendEmailBtn.disabled = false;
        sendEmailBtn.textContent = 'Send Email';
    }
}
