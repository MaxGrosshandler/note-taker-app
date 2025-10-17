# Notes App

A simple note-taking application with a Node.js backend and PostgreSQL database running in Docker.

## Features

- Create, read, update, and delete notes
- Clean and modern user interface
- Persistent storage with PostgreSQL
- RESTful API
- Automatic timestamp tracking

## Prerequisites

- Docker and Docker Compose
- Node.js (v14 or higher)
- npm or yarn

## Setup Instructions

### 1. Start the PostgreSQL Database

```bash
docker-compose up -d
```

This will start a PostgreSQL container with the database initialized using the schema in `init.sql`.

### 2. Install Dependencies

```bash
npm install
```

### 3. Start the Application

```bash
npm start
```

For development with auto-reload:

```bash
npm run dev
```

### 4. Access the Application

Open your browser and navigate to:
```
http://localhost:3000
```

## API Endpoints

- `GET /api/notes` - Get all notes
- `GET /api/notes/:id` - Get a specific note
- `POST /api/notes` - Create a new note
- `PUT /api/notes/:id` - Update a note
- `DELETE /api/notes/:id` - Delete a note

## Database Configuration

Default database credentials (can be changed in `docker-compose.yml`):
- Host: localhost
- Port: 5432
- Database: notesdb
- User: notesapp
- Password: notesapp123

## Project Structure

```
.
├── docker-compose.yml      # Docker configuration
├── init.sql               # Database schema
├── package.json           # Node.js dependencies
├── server.js              # Express server and API
├── public/
│   ├── index.html         # Frontend HTML
│   ├── styles.css         # Frontend styles
│   └── app.js             # Frontend JavaScript
└── README.md              # This file
```

## Stopping the Application

To stop the server, press `Ctrl+C` in the terminal.

To stop and remove the Docker containers:

```bash
docker-compose down
```

To stop containers and remove the database volume (WARNING: This will delete all data):

```bash
docker-compose down -v
```

## Troubleshooting

### Database connection errors

Make sure the PostgreSQL container is running:
```bash
docker ps
```

You should see a container named `notes-postgres`.

### Port already in use

If port 3000 or 5432 is already in use, you can change them in `server.js` and `docker-compose.yml` respectively.

### Database not initialized

If the database tables are not created, you can manually run the init script:
```bash
docker exec -i notes-postgres psql -U notesapp -d notesdb < init.sql
```
