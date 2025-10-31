/**
 * Notes App - Database Schema
 *
 * PostgreSQL database initialization script for the Notes application.
 * Defines the database schema, indexes, and triggers for persistent storage of notes.
 *
 * Database Name: notesdb
 * User: notesapp
 * Password: notesapp123
 *
 * Tables:
 *   - notes: Main table for storing note data with timestamps
 *
 * Indexes:
 *   - idx_notes_created_at: Index on created_at for chronological queries
 *
 * Triggers:
 *   - update_notes_updated_at: Automatic timestamp update on note modifications
 */

/**
 * ==================== NOTES TABLE ====================
 * Main table for storing all note records
 *
 * Purpose:
 * - Stores user-created notes with text content
 * - Tracks when notes are created and modified
 * - Primary storage for all note data
 *
 * Columns:
 *   - id: Auto-incrementing primary key (SERIAL)
 *     - Unique identifier for each note
 *     - Generated automatically by PostgreSQL
 *     - Cannot be null (PRIMARY KEY constraint)
 *
 *   - title: Note title (VARCHAR(255))
 *     - User-provided note heading
 *     - Maximum 255 characters for index efficiency
 *     - Cannot be null (NOT NULL constraint)
 *
 *   - content: Note body text (TEXT)
 *     - Main note content
 *     - Unlimited length (uses PostgreSQL TEXT type)
 *     - Cannot be null (NOT NULL constraint)
 *
 *   - created_at: Creation timestamp (TIMESTAMP)
 *     - Automatically set to current time when note is inserted
 *     - Uses server's current timestamp (CURRENT_TIMESTAMP)
 *     - Never modified after creation
 *
 *   - updated_at: Last modification timestamp (TIMESTAMP)
 *     - Automatically set when note is created
 *     - Automatically updated when note is modified (via trigger)
 *     - Allows sorting by most recently modified
 *
 * Constraints:
 *   - PRIMARY KEY: id ensures each note has unique identifier
 *   - NOT NULL: title and content must always have values
 *   - DEFAULT: Timestamps auto-generated on creation
 *
 * Usage:
 *   - Query all notes: SELECT * FROM notes ORDER BY updated_at DESC
 *   - Get single note: SELECT * FROM notes WHERE id = $1
 *   - Create note: INSERT INTO notes (title, content) VALUES ($1, $2)
 *   - Update note: UPDATE notes SET title = $1, content = $2 WHERE id = $3
 *   - Delete note: DELETE FROM notes WHERE id = $1
 */
CREATE TABLE IF NOT EXISTS notes (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

/**
 * ==================== INDEXES ====================
 * Optimizes database queries for better performance
 */

/**
 * Index on created_at column
 * Optimizes queries that sort by creation date
 *
 * Purpose:
 * - Speeds up ORDER BY clauses on created_at
 * - Enables efficient range queries for date ranges
 * - Helps with chronological note retrieval
 *
 * Ordering:
 * - DESC ordering (newest first) matches typical UI requirements
 * - PostgreSQL can use this index for both ASC and DESC queries
 *
 * Usage Examples:
 *   - SELECT * FROM notes ORDER BY created_at DESC
 *   - SELECT * FROM notes WHERE created_at > '2024-01-01' ORDER BY created_at DESC
 */
CREATE INDEX idx_notes_created_at ON notes(created_at DESC);

/**
 * ==================== TRIGGERS ====================
 * Automatically maintain data integrity and consistency
 */

/**
 * Function to update the updated_at timestamp
 * Automatically called before any UPDATE operation on notes table
 *
 * Purpose:
 * - Maintains accurate record of when notes are modified
 * - Prevents manual updates to timestamp (automatic only)
 * - Enables sorting by most recently modified notes
 *
 * Behavior:
 * - Called BEFORE each UPDATE statement
 * - Sets NEW.updated_at to the current server time
 * - Executes for every row being updated
 *
 * Example:
 * - User updates note: UPDATE notes SET content = 'new content' WHERE id = 5
 * - Function automatically sets updated_at = CURRENT_TIMESTAMP
 * - Result: updated_at reflects actual modification time
 *
 * Technical Details:
 * - Language: PL/pgSQL (PostgreSQL's stored procedure language)
 * - Returns: TRIGGER type
 * - NEW: Row being inserted/updated (we modify the timestamp)
 * - OLD: Previous row values (not used in this function)
 */
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

/**
 * Trigger to automatically update updated_at on note modifications
 * Executes the update_updated_at_column() function before each UPDATE
 *
 * Configuration:
 *   - Trigger Name: update_notes_updated_at
 *   - Table: notes
 *   - Event: BEFORE UPDATE (executes before update is applied)
 *   - For Each Row: Executes once for each affected row
 *   - Function: update_updated_at_column()
 *
 * Execution Flow:
 * 1. User/app sends UPDATE query to database
 * 2. Before applying changes, trigger fires
 * 3. update_updated_at_column() is called
 * 4. Function sets NEW.updated_at = CURRENT_TIMESTAMP
 * 5. UPDATE proceeds with new timestamp value
 * 6. Database applies changes including updated timestamp
 *
 * Result:
 * - Every note update automatically records current time
 * - User doesn't need to manually set updated_at
 * - Database maintains accurate modification records
 *
 * Example:
 * - UPDATE notes SET title = 'New Title' WHERE id = 1
 * - Trigger automatically sets updated_at = current time
 * - Both title and updated_at change in the database
 */
CREATE TRIGGER update_notes_updated_at BEFORE UPDATE ON notes
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
