/**
 * Notes App - Express Backend Server
 *
 * A RESTful API server for managing notes with database persistence and email functionality.
 * Provides endpoints for CRUD operations on notes and email sending capabilities.
 *
 * @requires express - Web framework for building the API
 * @requires pg - PostgreSQL client for database connections
 * @requires cors - Middleware for handling cross-origin requests
 * @requires path - Node.js path utilities
 * @requires dotenv - Environment variable loader
 * @requires ./emailConfig - Email sending module
 *
 * Environment Variables:
 *   - GMAIL_USER: Gmail account for sending emails
 *   - GMAIL_APP_PASSWORD: Google App Password for Gmail authentication
 *
 * Database Credentials (hardcoded - consider moving to .env):
 *   - user: notesapp
 *   - host: localhost
 *   - database: notesdb
 *   - password: notesapp123
 *   - port: 5432
 *
 * Server Port: 3000
 */

const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const path = require('path');
require('dotenv').config();
const emailConfig = require('./emailConfig');

const app = express();
const port = 3000;

/**
 * PostgreSQL connection pool configuration
 * Creates a reusable pool of database connections for better performance
 * and resource management across multiple requests.
 *
 * @type {Pool}
 */
const pool = new Pool({
  user: 'notesapp',
  host: 'localhost',
  database: 'notesdb',
  password: 'notesapp123',
  port: 5432,
});

/**
 * Test database connectivity on server startup
 * Logs connection status to the console for debugging purposes.
 * A successful connection indicates the PostgreSQL server is running
 * and the credentials are correct.
 */
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Error connecting to the database:', err);
  } else {
    console.log('Database connected successfully');
  }
});

/**
 * Middleware configuration
 * - cors(): Enable Cross-Origin Resource Sharing for frontend requests
 * - express.json(): Parse incoming JSON request bodies
 * - express.static('public'): Serve static files from the 'public' directory
 */
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

/**
 * ==================== NOTE ROUTES ====================
 */

/**
 * GET /api/notes
 *
 * Retrieve all notes from the database, sorted by most recently updated first.
 * Used when loading the application or refreshing the notes list.
 *
 * @route GET /api/notes
 * @returns {Object[]} Array of note objects
 * @returns {number} .id - Unique note identifier (Primary Key)
 * @returns {string} .title - Note title
 * @returns {string} .content - Note content/body
 * @returns {string} .created_at - ISO timestamp when note was created
 * @returns {string} .updated_at - ISO timestamp when note was last updated
 * @throws {Error} 500 - Database query error
 */
app.get('/api/notes', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM notes ORDER BY updated_at DESC'
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch notes' });
  }
});

/**
 * GET /api/notes/:id
 *
 * Retrieve a single note by its unique identifier.
 * Used when a user clicks on a note in the sidebar to view/edit it.
 *
 * @route GET /api/notes/:id
 * @param {number} id - Note ID from URL parameter
 * @returns {Object} Single note object
 * @returns {number} .id - Note identifier
 * @returns {string} .title - Note title
 * @returns {string} .content - Note content/body
 * @returns {string} .created_at - ISO timestamp when created
 * @returns {string} .updated_at - ISO timestamp when last updated
 * @throws {Error} 404 - Note not found
 * @throws {Error} 500 - Database query error
 */
app.get('/api/notes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM notes WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Note not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch note' });
  }
});

/**
 * POST /api/notes
 *
 * Create a new note in the database.
 * The note is stored with automatic timestamps for creation and update times.
 * All required fields must be provided; validation occurs on the backend.
 *
 * @route POST /api/notes
 * @param {Object} req.body - Request body containing note data
 * @param {string} req.body.title - Note title (required, non-empty)
 * @param {string} req.body.content - Note content/body (required, non-empty)
 * @returns {Object} Created note object with generated ID and timestamps
 * @returns {number} .id - Auto-generated note ID
 * @returns {string} .created_at - Timestamp of creation
 * @returns {string} .updated_at - Timestamp of last update
 * @throws {Error} 400 - Missing required fields
 * @throws {Error} 500 - Database insertion error
 */
app.post('/api/notes', async (req, res) => {
  try {
    const { title, content } = req.body;

    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required' });
    }

    const result = await pool.query(
      'INSERT INTO notes (title, content) VALUES ($1, $2) RETURNING *',
      [title, content]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create note' });
  }
});

/**
 * PUT /api/notes/:id
 *
 * Update an existing note's title and content.
 * Both fields are required to be updated. The database trigger
 * automatically updates the 'updated_at' timestamp.
 *
 * @route PUT /api/notes/:id
 * @param {number} id - Note ID from URL parameter
 * @param {Object} req.body - Request body with updated data
 * @param {string} req.body.title - Updated note title (required)
 * @param {string} req.body.content - Updated note content (required)
 * @returns {Object} Updated note object with new data and timestamp
 * @throws {Error} 400 - Missing required fields
 * @throws {Error} 404 - Note not found
 * @throws {Error} 500 - Database update error
 */
app.put('/api/notes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content } = req.body;

    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required' });
    }

    const result = await pool.query(
      'UPDATE notes SET title = $1, content = $2 WHERE id = $3 RETURNING *',
      [title, content, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Note not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update note' });
  }
});

/**
 * DELETE /api/notes/:id
 *
 * Permanently delete a note from the database.
 * This action cannot be undone. The deletion is cascading if any
 * foreign key relationships exist (none currently).
 *
 * @route DELETE /api/notes/:id
 * @param {number} id - Note ID from URL parameter
 * @returns {Object} Success message object
 * @returns {string} .message - Confirmation of deletion
 * @throws {Error} 404 - Note not found
 * @throws {Error} 500 - Database deletion error
 */
app.delete('/api/notes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM notes WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Note not found' });
    }

    res.json({ message: 'Note deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete note' });
  }
});

/**
 * ==================== EMAIL ROUTES ====================
 */

/**
 * GET /api/email/status
 *
 * Check the current email configuration status.
 * Returns whether Gmail credentials are configured and the configured email address.
 * Used by the frontend to determine if the email feature is available.
 *
 * @route GET /api/email/status
 * @returns {Object} Email configuration status
 * @returns {boolean} .configured - Whether email is configured (GMAIL_USER and GMAIL_APP_PASSWORD set)
 * @returns {string} .email - Configured Gmail address (null if not configured)
 */
app.get('/api/email/status', (req, res) => {
  const isConfigured = emailConfig.isConfigured();
  const userEmail = emailConfig.getUserEmail();
  res.json({
    configured: isConfigured,
    email: userEmail
  });
});

/**
 * POST /api/email/send
 *
 * Send a note as an email message.
 * Validates email address format and checks email configuration before sending.
 * Uses the emailConfig module to handle SMTP communication with Gmail.
 *
 * Security:
 * - Email regex validation to prevent SMTP injection
 * - Requires valid configuration before sending
 * - Credentials from environment variables (not stored in code)
 *
 * @route POST /api/email/send
 * @param {Object} req.body - Email data
 * @param {string} req.body.to - Recipient email address (required, must be valid format)
 * @param {string} req.body.subject - Email subject line (required)
 * @param {string} req.body.content - Email body content (required)
 * @returns {Object} Success response with message ID
 * @returns {boolean} .success - Always true on success
 * @returns {string} .messageId - Unique message identifier from Gmail/Nodemailer
 * @throws {Error} 400 - Missing required fields or invalid email format
 * @throws {Error} 500 - Email not configured or SMTP error
 */
app.post('/api/email/send', async (req, res) => {
  try {
    const { to, subject, content } = req.body;

    if (!to || !subject || !content) {
      return res.status(400).json({ error: 'Recipient, subject, and content are required' });
    }

    if (!emailConfig.isConfigured()) {
      return res.status(500).json({ error: 'Email not configured. Please set GMAIL_USER and GMAIL_APP_PASSWORD in .env file.' });
    }

    // Validate email format with regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) {
      return res.status(400).json({ error: 'Invalid email address' });
    }

    const result = await emailConfig.sendEmail(to, subject, content);
    res.json({ success: true, messageId: result.messageId });
  } catch (error) {
    console.error('Error sending email:', error);
    res.status(500).json({ error: 'Failed to send email: ' + error.message });
  }
});

/**
 * GET /
 *
 * Serve the main HTML file for the Single Page Application (SPA).
 * All frontend routing is handled by app.js on the client side.
 * This route ensures direct navigation and page refreshes load the SPA.
 *
 * @route GET /
 * @returns {File} index.html - Main HTML document
 */
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

/**
 * Start the Express server
 * Listens on the configured port and logs startup confirmation.
 * Once running, the application is accessible at http://localhost:3000
 */
app.listen(port, () => {
  console.log(`Notes app listening at http://localhost:${port}`);
});
