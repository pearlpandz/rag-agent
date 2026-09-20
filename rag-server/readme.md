# Project Code Walkthrough

This document provides a detailed walkthrough of the project's code, explaining the structure, components, and functionality.

## Project Overview

This project is a FastAPI-based server that implements a Retrieval-Augmented Generation (RAG) pipeline. It exposes a set of tools for document management and vector search, accessible via the MCP (Machine-to-Machine Communication Protocol). The server uses a PostgreSQL database with the `pgvector` extension for storing and searching document embeddings.

The project is structured into several key components:

- **FastAPI Server (`main.py`):** The main entry point of the application, which sets up the server, registers tools, and defines API routes.
- **RAG Pipeline (`rag/`):** Contains modules for text chunking, embedding generation, and the main processing pipeline.
- **Storage (`storage/`):** Manages database connections and interactions, including both PostgreSQL and Supabase clients.
- **Tools (`tools/`):** Exposes functionalities like metadata management and vector search as MCP tools.
- **API (`api/`):** Provides RESTful API endpoints for managing documents and categories.
- **Configuration (`config/`):** Handles application configuration and settings.
- **Database (`sql-scripts.md`):** Contains the SQL schema for the PostgreSQL database.

## File-by-File Walkthrough

### `main.py`

This is the main entry point of the application. It initializes the `FastMCP` server, which is a custom server implementation for handling MCP requests.

- **Tool Registration:** It imports the MCP tools from `tools/metadata_tool.py` and `tools/vector_search_tool.py` and registers them with the server.
- **Manifest Endpoint:** It defines a `/.well-known/mcp.json` endpoint that provides a manifest of the available tools, their descriptions, and input schemas. This is used by the MCP Inspector to discover the server's capabilities.
- **Health Check:** A `/health` endpoint is provided to check the status of the server.
- **API Routers:** It includes the FastAPI routers from `api/category.py` and `api/docs.py` to expose RESTful endpoints for managing categories and documents.
- **CORS Middleware:** It sets up CORS (Cross-Origin Resource Sharing) to allow requests from any origin, which is useful for development and for the MCP Inspector.
- **Server Startup:** It uses `uvicorn` to run the FastAPI application.

### `requirements.txt`

This file lists all the Python dependencies required for the project. Key libraries include:

- `fastapi`: For building the web server and APIs.
- `uvicorn`: For running the FastAPI application.
- `langchain`: Used for text splitting and other RAG-related functionalities.
- `openai`: For generating embeddings using OpenAI's models.
- `psycopg2-binary`: For connecting to the PostgreSQL database.
- `pgvector`: A Python client for the `pgvector` PostgreSQL extension.
- `supabase`: A Python client for Supabase.
- `mcp`: The library for the Machine-to-Machine Communication Protocol.

### `api/category.py`

This module defines a FastAPI router for CRUD (Create, Read, Update, Delete) operations on categories.

- **Pydantic Models:** It defines Pydantic models (`CategoryBase`, `CategoryCreate`, `CategoryUpdate`, `CategoryOut`) for data validation and serialization.
- **Database Dependency:** It uses a `get_db` dependency to get a database connection from the `storage.db` module.
- **Endpoints:** It provides the following endpoints:
  - `GET /api/categories/`: List all categories.
  - `GET /api/categories/{category_id}`: Get a single category by its ID.
  - `POST /api/categories/`: Create a new category.
  - `PUT /api/categories/{category_id}`: Update an existing category.
  - `DELETE /api/categories/{category_id}`: Delete a category.

### `api/docs.py`

This module defines a FastAPI router for CRUD operations on documents.

- **Pydantic Models:** It defines Pydantic models (`DocBase`, `DocCreate`, `DocUpdate`, `DocOut`) for document data.
- **File Uploads:** The `POST /api/docs/` endpoint handles file uploads. It extracts the text from the uploaded file, chunks it, generates embeddings for each chunk, and stores them in the database.
- **Metadata:** It creates rich metadata for each chunk, including the source filename, chunk index, line numbers, and more.
- **Endpoints:** It provides the following endpoints:
  - `GET /api/docs/`: List all documents.
  - `GET /api/docs/{doc_id}`: Get a single document by its ID.
  - `POST /api/docs/`: Create a new document, with an optional file upload.
  - `PUT /api/docs/{doc_id}`: Update an existing document.
  - `DELETE /api/docs/{doc_id}`: Delete a document.

### `config/settings.py`

This file loads configuration from environment variables using `python-dotenv`. It defines settings for:

- Supabase URL and key.
- OpenAI API key and embedding model.
- Chunk size and overlap for text splitting.

### `rag/chunker.py`

This module is responsible for splitting text into smaller chunks. It uses the `RecursiveCharacterTextSplitter` from the `langchain` library, with the chunk size and overlap configured in `config/settings.py`.

### `rag/embedder.py`

This module generates embeddings for text using OpenAI's models. It initializes the `OpenAI` client with the API key from `config/settings.py` and uses the specified embedding model.

### `rag/pipeline.py`

This module defines a high-level function `process_document` that encapsulates the entire RAG pipeline for a single document:

1.  Extracts text from the file.
2.  Chunks the text.
3.  Generates an embedding for each chunk.
4.  Inserts the chunk, embedding, and metadata into the database.

### `storage/db.py`

This module provides a simple way to get a connection to the PostgreSQL database. It reads the database configuration from environment variables and uses `psycopg2` to establish a connection. It also registers a UUID adapter for handling UUIDs with `psycopg2`.

### `storage/postgres_client.py`

This module contains functions for interacting with the PostgreSQL database.

- `insert_embedding`: Inserts a document chunk, its embedding, and metadata into the `documents` table.
- `search_similar`: Searches for similar document chunks using the `match_documents` function in the database.

### `storage/supabase_client.py`

This module provides a client for interacting with a Supabase project. It initializes the Supabase client with the URL and key from `config/settings.py`. While the project seems to primarily use PostgreSQL directly, this client is available for alternative or future use cases.

### `tools/metadata_tool.py`

This module exposes metadata management functions as MCP tools.

- **`add_metadata`:** Processes a local file, chunks it, generates embeddings, and stores them in the database with the provided metadata.
- **`update_metadata`:** Updates the metadata for an existing document.
- **`delete_metadata`:** Deletes a document from the database.

### `tools/vector_search_tool.py`

This module exposes the vector search functionality as an MCP tool.

- **`vector_search`:** Takes a query string, generates an embedding for it, and uses the `search_similar` function to find the most similar document chunks in the database.

### `sql-scripts.md`

This file contains the SQL scripts for setting up the database schema.

- **`vector` extension:** Enables vector similarity search capabilities in PostgreSQL.
- **`documents` table:** Stores the document chunks, embeddings, and metadata.
- **`ivfflat` index:** An index for efficient vector similarity search.
- **`match_documents` function:** A PostgreSQL function that takes a query embedding and returns the most similar documents.
- **`Category` and `Docs` tables:** Tables for managing categories and documents for the RESTful API.

### `api/ticket.py`

This module defines a FastAPI router for CRUD (Create, Read, Update, Delete) operations on tickets.

- **Pydantic Models:** It defines a Pydantic model (`Ticket`) for data validation and serialization. The `ticket_id` is auto-generated upon creation. Other fields include `description`, `session`, `status`, `created_by`, `created_at`, and `assigned_to`.- **Endpoints:** It provides the following endpoints:
  - `POST /api/ticket/`: Create a new ticket.
  - `GET /api/ticket/list`: Retrieve all tickets.
  - `GET /api/ticket/{ticket_id}`: Retrieve a single ticket by its ID.
  - `PUT /api/ticket/{ticket_id}`: Update an existing ticket.
  - `DELETE /api/ticket/{ticket_id}`: Delete a ticket by its ID.

**Sample Requests and Responses:**

**Create a new ticket (POST /api/ticket/)**

**Request:**

```json
{
  "description": "User reported a bug in the login module.",
  "session": "USER-SESSION-123",
  "status": "Open",
  "created_by": "john.doe",
  "assigned_to": "jane.doe"
}
```

**Response (201 Created):**

```json
{
  "ticket_id": "TICKET-001",
  "description": "User reported a bug in the login module.",
  "session": "USER-SESSION-123",
  "status": "Open",
  "created_by": "john.doe",
  "created_at": "2025-11-16T12:00:00.000000",
  "assigned_to": "jane.doe"
}
```

**Retrieve all tickets (GET /api/ticket/list)**

**Response (200 OK):**

```json
[
  {
    "ticket_id": "TICKET-001",
    "description": "User reported a bug in the login module.",
    "session": "USER-SESSION-123",
    "status": "Open",
    "created_by": "john.doe",
    "created_at": "2025-11-16T12:00:00",
    "assigned_to": "jane.doe"
  }
]
```

**Retrieve a single ticket by ID (GET /api/ticket/{ticket_id})**

**Request:** `GET /api/ticket/TICKET-001`

**Response (200 OK):**

```json
{
  "ticket_id": "TICKET-001",
  "description": "User reported a bug in the login module.",
  "session": "USER-SESSION-123",
  "status": "Open",
  "created_by": "john.doe",
  "created_at": "2025-11-16T12:00:00",
  "assigned_to": "jane.doe"
}
```

**Update an existing ticket (PUT /api/ticket/{ticket_id})**

**Request:** `PUT /api/ticket/TICKET-001`

```json
{
  "ticket_id": "TICKET-001",
  "description": "User reported a critical bug in the login module.",
  "session": "USER-SESSION-123",
  "status": "In Progress",
  "created_by": "john.doe",
  "created_at": "2025-11-16T12:00:00.000000",
  "assigned_to": "jane.doe"
}
```

**Response (200 OK):**

```json
{
  "ticket_id": "TICKET-001",
  "description": "User reported a critical bug in the login module.",
  "session": "USER-SESSION-123",
  "status": "In Progress",
  "created_by": "john.doe",
  "created_at": "2025-11-16T12:00:00",
  "assigned_to": "jane.doe"
}
```

**Delete a ticket by ID (DELETE /api/ticket/{ticket_id})**

**Request:** `DELETE /api/ticket/TICKET-001`

\*\*Response (204 No Content)

## How to Run the Project

1.  **Install dependencies:**
    ```bash
    pip install -r requirements.txt
    ```
2.  **Set up the database:**
    - Make sure you have a PostgreSQL server running with the `pgvector` extension installed.
    - Create a `.env` file in the project root and add the following environment variables:
      ```
      PG_HOST=localhost
      PG_PORT=5432
      PG_DB=postgres
      PG_USER=postgres
      PG_PASSWORD=your_password
      OPENROUTER_API_KEY=your_openrouter_api_key
      EMBEDDING_MODEL=nvidia/llama-nemotron-embed-vl-1b-v2:free
      EMBEDDING_DIMENSIONS=2048
      ```
    - Run the database migrations:
      ```bash
      python migrations/run_migrations.py
      ```
    - Migration `003_switch_embeddings_to_nvidia.sql` clears existing 1536-dimensional
      vectors. Reprocess or re-upload every document after running it so search results
      use the new 2048-dimensional embeddings.
    - The 2048-dimensional vector is queried without an HNSW index because pgvector
      limits HNSW indexes to 2000 dimensions. Exact cosine search is suitable for the
      current knowledge-base size; use a lower-dimensional model or a half-precision
      vector strategy if the dataset later needs an approximate index.
3.  **Run the server:**
    ```bash
    python main.py
    ```
4.  **Use the MCP Inspector:**
    - Open the MCP Inspector and configure it to use the `streamable-http` transport with the URL `http://localhost:8000`.
    - You should see the registered tools (`add_metadata`, `update_metadata`, `delete_metadata`, `vector_search`) in the inspector.
