from typing import List, Optional
from uuid import UUID
from datetime import datetime
import os
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, Form, Body
from pydantic import BaseModel, Field
from rag.chunker import chunk_text
from rag.embedder import generate_embedding
from storage.postgres_client import insert_embedding

# Use the project's DB helper
from storage.db import get_connection
from storage.file_handler import extract_text

router = APIRouter(prefix="/api/docs", tags=["docs"])


# --- Pydantic models ---
class DocBase(BaseModel):
    name: str = Field(..., example="Sample Document")
    description: str = Field(..., example="This is a sample document description")
    category_id: Optional[UUID] = Field(None, example="123e4567-e89b-12d3-a456-426614174000")


class DocCreate(DocBase):
    pass


class DocUpdate(BaseModel):
    name: Optional[str]
    description: Optional[str]
    category_id: Optional[UUID]


class DocOut(DocBase):
    id: UUID
    name: Optional[str]
    description: Optional[str]
    createdby: Optional[str]
    updatedby: Optional[str]


# Simple DB dependency using storage.db.get_connection()
def get_db():
    conn = get_connection()
    try:
        yield conn
    finally:
        try:
            conn.close()
        except Exception:
            pass


# --- CRUD endpoints ---
from fastapi import File, UploadFile

@router.get("/", response_model=List[DocOut])
def list_docs(db_conn=Depends(get_db)):
    with db_conn.cursor() as cur:
        cur.execute(
            """SELECT id::uuid, name, description, category_id::uuid, createdby, 
            updatedby FROM docs ORDER BY id"""
        )
        rows = cur.fetchall()
    return [
        {
            "id": r[0],
            "name": r[1],
            "description": r[2],
            "category_id": r[3],
            "createdby": r[4],
            "updatedby": r[5]
        }
        for r in rows
    ]


@router.get("/{doc_id}", response_model=DocOut)
def get_doc(doc_id: UUID, db_conn=Depends(get_db)):
    with db_conn.cursor() as cur:
        cur.execute(
            """SELECT id::uuid, name, description, category_id::uuid, createdby, 
            updatedby FROM docs WHERE id = %s""",
            (doc_id,),
        )
        row = cur.fetchone()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    return {
        "id": row[0],
        "name": row[1],
        "description": row[2],
        "category_id": row[3],
        "createdby": row[4],
        "updatedby": row[5]
    }


@router.get("/category/{category_id}", response_model=List[DocOut])
def list_docs_by_category(category_id: UUID, db_conn=Depends(get_db)):
    with db_conn.cursor() as cur:
        cur.execute(
            """SELECT id::uuid, name, description, category_id::uuid, createdby, 
            updatedby FROM docs WHERE category_id = %s ORDER BY id""",
            (category_id,),
        )
        rows = cur.fetchall()
    return [
        {
            "id": r[0],
            "name": r[1],
            "description": r[2],
            "category_id": r[3],
            "createdby": r[4],
            "updatedby": r[5]
        }
        for r in rows
    ]


@router.post("/", response_model=DocOut, status_code=status.HTTP_201_CREATED)
def create_doc(
    name: str = Form(...),
    description: str = Form(...),
    category_id: Optional[UUID] = Form(None),
    file: UploadFile = File(None),
    db_conn=Depends(get_db),
):
    """Create a document. Requires `name` and `description`, optional `category_id` and `file` in the request body."""
    
    # Process the uploaded file if provided
    file_text = None
    if file:
        try:
            # Create a temporary file to save the upload
            file_path = f"temp_{file.filename}"
            with open(file_path, "wb") as temp_file:
                content = file.file.read()
                temp_file.write(content)
            
            # Extract text from the file
            try:
                file_text = extract_text(file_path)
            finally:
                # Clean up the temporary file
                if os.path.exists(file_path):
                    os.remove(file_path)
        
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Error processing file: {str(e)}",
            )

    # Create the document record
    with db_conn.cursor() as cur:
        try:
            cur.execute(
                """INSERT INTO docs (name, description, category_id, createdby, updatedby) 
                VALUES (%s, %s, %s, %s, %s) RETURNING id::uuid""",
                (name, description, category_id, None, None),
            )
            doc_id = cur.fetchone()[0]
            db_conn.commit()
        except Exception as e:
            db_conn.rollback()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(e),
            )

    # Push chunks to documents table (vectorized)
    chunks = chunk_text(file_text)
    total_chunks = len(chunks)
    lines = file_text.splitlines() if file_text else []
    
    for index, chunk in enumerate(chunks):
        # Find the line numbers that contain this chunk
        chunk_start_line = None
        chunk_end_line = None
        line_count = len(lines)
        
        # Find the lines that contain this chunk
        for i, line in enumerate(lines, 1):
            if chunk in file_text:
                chunk_start_pos = file_text.find(chunk)
                chunk_end_pos = chunk_start_pos + len(chunk)
                lines_before = file_text[:chunk_start_pos].count('\n') + 1
                lines_after = file_text[:chunk_end_pos].count('\n') + 1
                chunk_start_line = lines_before
                chunk_end_line = lines_after

        # Create rich metadata for the chunk
        chunk_metadata = {
            "source": file.filename if file else None,
            "chunk_index": index + 1,
            "total_chunks": total_chunks,
            "start_line": chunk_start_line,
            "end_line": chunk_end_line,
            "char_length": len(chunk),
            "word_count": len(chunk.split()),
            "position": "beginning" if index < total_chunks * 0.3 
                       else "middle" if index < total_chunks * 0.7 
                       else "end",
            "contains_code": any(line.strip().startswith(('def ', 'class ', 'import ', 'from ')) 
                               for line in chunk.splitlines()),
            "content_type": file.content_type if file else None
        }
        
        emb = generate_embedding(chunk)
        insert_embedding(doc_id, chunk, emb, chunk_metadata)

    # Fetch and return the created document
    with db_conn.cursor() as cur:
        cur.execute(
            """SELECT id::uuid, name, description, category_id::uuid, createdby, 
            updatedby FROM docs WHERE id = %s""",
            (doc_id,),
        )
        row = cur.fetchone()

    return {
        "id": row[0],
        "name": row[1],
        "description": row[2],
        "category_id": row[3],
        "createdby": row[4],
        "updatedby": row[5]
    }


@router.put("/{doc_id}", response_model=DocOut)
def update_doc(
    doc_id: UUID,
    name: Optional[str] = Body(None, embed=True),
    description: Optional[str] = Body(None, embed=True),
    category_id: Optional[UUID] = Body(None, embed=True),
    db_conn=Depends(get_db),
):
    """Update a document. All fields are optional in the request body."""
    now = datetime.utcnow()
    
    # First check if document exists
    with db_conn.cursor() as cur:
        cur.execute("SELECT id FROM docs WHERE id = %s", (doc_id,))
        if not cur.fetchone():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Document not found",
            )

    # Build update query dynamically based on provided fields
    update_fields = []
    params = []
    if name is not None:
        update_fields.append("name = %s")
        params.append(name)
    if description is not None:
        update_fields.append("description = %s")
        params.append(description)
    if category_id is not None:
        update_fields.append("category_id = %s")
        params.append(category_id)
    
    # Add the document ID as the last parameter
    params.append(doc_id)

    update_query = f"""
        UPDATE docs 
        SET {', '.join(update_fields)}
        WHERE id = %s
    """

    with db_conn.cursor() as cur:
        try:
            cur.execute(update_query, params)
            db_conn.commit()
        except Exception as e:
            db_conn.rollback()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(e),
            )

    # Fetch and return the updated document
    with db_conn.cursor() as cur:
        cur.execute(
            """SELECT id::uuid, name, description, category_id::uuid, createdby, 
            updatedby FROM docs WHERE id = %s""",
            (doc_id,),
        )
        row = cur.fetchone()

    return {
        "id": row[0],
        "name": row[1],
        "description": row[2],
        "category_id": row[3],
        "createdby": row[4],
        "updatedby": row[5]
    }


@router.delete("/{doc_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_doc(doc_id: UUID, db_conn=Depends(get_db)):
    """Delete a document by ID."""
    with db_conn.cursor() as cur:
        cur.execute("SELECT id FROM docs WHERE id = %s", (doc_id,))
        if not cur.fetchone():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Document not found",
            )
        
        cur.execute("DELETE FROM docs WHERE id = %s", (doc_id,))
        db_conn.commit()
