/**
 * Notes App - Frontend Client Application
 *
 * Single Page Application (SPA) that manages note-taking functionality.
 * Provides a user interface for creating, editing, deleting, and emailing notes.
 * Communicates with the Express backend API via REST endpoints.
 *
 * Features:
 * - Create, read, update, and delete notes
 * - Real-time note list with timestamps
 * - Email notes to recipients
 * - Modal dialogs for email composition
 * - XSS prevention through HTML escaping
 * - Responsive two-pane layout (sidebar + editor)
 *
 * Architecture:
 * - State: Global variables track current note and notes list
 * - DOM: References to all interactive HTML elements
 * - Events: Click handlers for all buttons and user interactions
 * - API: Fetch requests to backend REST API
 *
 * Server Connection:
 * - Base URL: http://localhost:3000
 * - API Endpoints: /api/notes, /api/email/*
 *
 * Security:
 * - HTML escaping to prevent XSS attacks
 * - Email validation on both client and server
 * - Confirmation dialogs for destructive actions
 */

/**
 * Base URL for the notes API
 * All note CRUD operations are performed against this endpoint
 * @type {string}
 */
const API_URL = 'http://localhost:3000/api/notes';

/**
 * Application state - Currently selected note ID
 * Set to null when no note is selected or a new note is being created
 * @type {number|null}
 */
let currentNoteId = null;

/**
 * Application state - Array of all notes fetched from the server
 * Each note object contains: id, title, content, created_at, updated_at
 * Updated whenever notes are loaded or modified
 * @type {Object[]}
 */
let notes = [];

/**
 * ==================== DOM ELEMENT REFERENCES ====================
 * Cached references to HTML elements for efficient access and event binding
 */

// Main action button
const newNoteBtn = document.getElementById('new-note-btn');

// Notes list container
const notesList = document.getElementById('notes-list');

// Editor UI elements
const emptyState = document.getElementById('empty-state');
const noteEditor = document.getElementById('note-editor');
const noteTitle = document.getElementById('note-title');
const noteContent = document.getElementById('note-content');

// Editor action buttons
const saveBtn = document.getElementById('save-btn');
const deleteBtn = document.getElementById('delete-btn');
const cancelBtn = document.getElementById('cancel-btn');
const emailBtn = document.getElementById('email-btn');

// Email UI elements
const emailStatusContainer = document.getElementById('email-status-container');
const emailConfiguredText = document.getElementById('email-configured-text');
const emailModal = document.getElementById('email-modal');
const emailTo = document.getElementById('email-to');
const emailSubject = document.getElementById('email-subject');
const emailPreview = document.getElementById('email-preview');
const sendEmailBtn = document.getElementById('send-email-btn');
const cancelEmailBtn = document.getElementById('cancel-email-btn');
const closeModal = document.querySelector('.close');

/**
 * ==================== EVENT LISTENERS ====================
 * Register click and interaction handlers for all interactive elements
 */

newNoteBtn.addEventListener('click', createNewNote);
saveBtn.addEventListener('click', saveNote);
deleteBtn.addEventListener('click', deleteNote);
cancelBtn.addEventListener('click', cancelEdit);
emailBtn.addEventListener('click', openEmailModal);
sendEmailBtn.addEventListener('click', sendEmailHandler);
cancelEmailBtn.addEventListener('click', closeEmailModal);
closeModal.addEventListener('click', closeEmailModal);

/**
 * Close modal when clicking outside of the modal content area
 * Allows users to dismiss the email modal by clicking the dark overlay
 */
window.addEventListener('click', (e) => {
    if (e.target === emailModal) {
        closeEmailModal();
    }
});

/**
 * ==================== APPLICATION INITIALIZATION ====================
 * Load initial data and check configuration on app startup
 */

loadNotes();
checkEmailConfig();

/**
 * ==================== NOTE MANAGEMENT FUNCTIONS ====================
 */

/**
 * Load all notes from the server and update the notes list display
 *
 * Fetches all notes from the backend API, sorted by last update time (newest first).
 * Updates the global notes array and re-renders the sidebar list.
 * Displays an error alert if the server is unreachable.
 *
 * Process:
 * 1. Make GET request to /api/notes
 * 2. Parse JSON response into notes array
 * 3. Call renderNotesList() to update the UI
 *
 * Error Handling:
 * - Network error: Alert user and check server connection
 * - Server error: Logged to console and alert displayed
 *
 * @async
 * @returns {Promise<void>}
 */
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

/**
 * Render the notes list in the sidebar
 *
 * Populates the sidebar with note list items for quick navigation.
 * Each item shows the note title and last updated timestamp.
 * Highlights the currently selected note with the 'active' class.
 * Shows a "No notes yet" message if the list is empty.
 *
 * Process:
 * 1. Clear the notes list container
 * 2. Check if notes array is empty
 * 3. If empty, display placeholder message
 * 4. If notes exist, create a list item for each:
 *    - Set the note title (HTML-escaped)
 *    - Show formatted date of last update
 *    - Add click handler to load the note
 *    - Highlight if currently selected
 * 5. Add the item to the list
 *
 * Security:
 * - Uses escapeHtml() to prevent XSS from note titles
 * - All user content is safely converted before display
 *
 * @returns {void}
 */
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

/**
 * Create a new blank note
 *
 * Resets the editor form and clears the currently selected note.
 * Shows the editor UI and sets focus to the title field.
 * Used when the user clicks the "+ New Note" button.
 *
 * Process:
 * 1. Reset currentNoteId to null (new note has no ID yet)
 * 2. Clear title and content input fields
 * 3. Show the editor UI (hide empty state)
 * 4. Focus on the title field for immediate input
 *
 * @returns {void}
 */
function createNewNote() {
    currentNoteId = null;
    noteTitle.value = '';
    noteContent.value = '';
    showEditor();
    noteTitle.focus();
}

/**
 * Load a specific note from the server and display it
 *
 * Fetches a single note by ID from the backend and populates
 * the editor with its title and content.
 * Updates the sidebar to highlight the selected note.
 *
 * Process:
 * 1. Fetch note from API using the provided ID
 * 2. Parse JSON response
 * 3. Update currentNoteId and populate form fields
 * 4. Show the editor UI
 * 5. Re-render the notes list to update highlighting
 *
 * @async
 * @param {number} id - The note ID to load
 * @returns {Promise<void>}
 * @throws Alert displayed if note cannot be loaded
 */
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

/**
 * Save the currently edited note
 *
 * Creates a new note or updates an existing one depending on whether
 * currentNoteId is set. Performs basic validation before saving.
 * Updates the global notes array and re-renders the list after save.
 *
 * Validation:
 * - Title must be non-empty (after trimming whitespace)
 * - Content must be non-empty (after trimming whitespace)
 * - Alert displayed if validation fails
 *
 * Process:
 * 1. Get title and content from form fields (trim whitespace)
 * 2. Validate both fields are non-empty
 * 3. If currentNoteId exists:
 *    - Send PUT request to update existing note
 * 4. If currentNoteId is null:
 *    - Send POST request to create new note
 * 5. Update currentNoteId with returned note.id (important for new notes)
 * 6. Reload notes list from server
 * 7. Update UI to reflect changes
 *
 * Error Handling:
 * - Network error: Alert displayed
 * - Validation error: Alert displayed with guidance
 * - Server error: Alert displayed with error message
 *
 * @async
 * @returns {Promise<void>}
 */
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

/**
 * Delete the currently selected note
 *
 * Permanently removes the note from the database after confirmation.
 * Shows a confirmation dialog to prevent accidental deletion.
 * Resets the editor UI after successful deletion.
 *
 * Process:
 * 1. Return early if no note is selected
 * 2. Show confirmation dialog
 * 3. If user confirms:
 *    - Send DELETE request to server
 *    - Clear currentNoteId
 *    - Reload notes from server
 *    - Hide editor (show empty state)
 * 4. If user cancels, do nothing
 *
 * Warning:
 * - This action is permanent and cannot be undone
 * - Database deletion is immediate upon confirmation
 *
 * @async
 * @returns {Promise<void>}
 * @throws Alert displayed if deletion fails
 */
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

/**
 * Cancel editing the current note
 *
 * Discards any unsaved changes and returns to the empty state.
 * Clears the currently selected note and re-renders the list.
 *
 * Process:
 * 1. Hide the editor UI (show empty state)
 * 2. Reset currentNoteId to null
 * 3. Re-render the notes list
 *
 * Note:
 * - Any unsaved changes in the editor are lost
 * - The note list is not reloaded from server (user's changes are discarded locally)
 *
 * @returns {void}
 */
function cancelEdit() {
    hideEditor();
    currentNoteId = null;
    renderNotesList();
}

/**
 * Show the note editor UI
 *
 * Hides the empty state message and displays the editor form.
 * Used when loading a note or creating a new note.
 *
 * @returns {void}
 */
function showEditor() {
    emptyState.style.display = 'none';
    noteEditor.style.display = 'flex';
}

/**
 * Hide the note editor UI
 *
 * Shows the empty state message and hides the editor form.
 * Used when no note is selected.
 *
 * @returns {void}
 */
function hideEditor() {
    emptyState.style.display = 'flex';
    noteEditor.style.display = 'none';
}

/**
 * Escape HTML special characters to prevent XSS attacks
 *
 * Converts user-provided text to safe HTML by escaping dangerous characters.
 * Prevents injection of malicious JavaScript through note titles and content.
 *
 * Process:
 * 1. Create a temporary div element
 * 2. Set its textContent to the input text
 * 3. Return the innerHTML (which has been auto-escaped)
 *
 * This method is safer than using innerHTML directly as it properly escapes:
 * - < (less than)
 * - > (greater than)
 * - & (ampersand)
 * - " (double quote)
 * - ' (single quote)
 *
 * @param {string} text - User-provided text to escape
 * @returns {string} HTML-safe version of the text
 *
 * @example
 * const safe = escapeHtml('<script>alert("XSS")</script>');
 * // Returns: &lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * ==================== EMAIL FUNCTIONS ====================
 * Functions for email functionality and modal management
 */

/**
 * Check email configuration status
 *
 * Queries the server to determine if Gmail credentials are configured.
 * Shows or hides the email status indicator in the header based on configuration.
 * Called on app initialization and after email is sent.
 *
 * Process:
 * 1. Fetch email status from /api/email/status endpoint
 * 2. Parse response to check 'configured' flag
 * 3. If configured:
 *    - Show email status container
 *    - Display the configured Gmail address
 * 4. If not configured:
 *    - Hide email status container
 *
 * UI Impact:
 * - Email button remains visible (users can still click it)
 * - Status text shows which email will be used to send
 * - Error checking doesn't stop the app; silently continues
 *
 * @async
 * @returns {Promise<void>}
 */
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

/**
 * Open the email modal dialog
 *
 * Validates that the current note has content, then opens the email modal.
 * Pre-fills the subject with the note title and shows a preview of the content.
 * Allows user to enter recipient email and send the note via email.
 *
 * Validation:
 * - Note title must be non-empty
 * - Note content must be non-empty
 * - Alert displayed if validation fails
 *
 * Process:
 * 1. Get title and content from editor
 * 2. Validate both are non-empty
 * 3. Pre-fill email subject with note title
 * 4. Show email content preview
 * 5. Add 'show' class to modal (displays it)
 * 6. Focus on recipient field for quick input
 *
 * @returns {void}
 */
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

/**
 * Close the email modal dialog
 *
 * Hides the modal and clears all form fields and preview content.
 * Called when user clicks cancel or the close button.
 * Removes the 'show' class which hides the modal via CSS.
 *
 * @returns {void}
 */
function closeEmailModal() {
    emailModal.classList.remove('show');
    emailTo.value = '';
    emailSubject.value = '';
    emailPreview.textContent = '';
}

/**
 * Handle email sending
 *
 * Sends the current note as an email to the specified recipient.
 * Validates all required fields and shows status during sending.
 * Disables the send button during the request to prevent double-sending.
 *
 * Validation:
 * - Recipient email must be non-empty
 * - Subject must be non-empty
 * - Content must be non-empty
 * - Alert displayed if any field is missing
 *
 * Process:
 * 1. Get recipient, subject, and content from form
 * 2. Validate all fields are non-empty
 * 3. Disable send button and show "Sending..." status
 * 4. Send POST request to /api/email/send with email data
 * 5. Parse response
 * 6. If successful:
 *    - Show success message
 *    - Close modal
 * 7. If failed:
 *    - Show error message from server
 * 8. Re-enable send button and restore text
 *
 * Error Handling:
 * - Network error: Shows error message
 * - Server error: Shows server error message
 * - Validation error: Shows alert before sending
 *
 * UI State:
 * - Button is disabled during request (prevents double-clicks)
 * - Button text changes to "Sending..." during request
 * - Button text restored to "Send Email" after request completes
 *
 * @async
 * @returns {Promise<void>}
 */
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
