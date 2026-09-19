from storage.supabase_client import supabase
from mcp.server.fastmcp import FastMCP
from storage.file_handler import extract_text
from rag.chunker import chunk_text
from rag.embedder import generate_embedding
from storage.postgres_client import insert_embedding
import uuid

mcp = FastMCP("metadata-tools")

@mcp.tool()
def add_metadata(file_path: str, metadata: dict) -> dict:
    """Add a document to the database by processing a local file into chunks and storing metadata.
    
    Args:
        file_path: The path to the local file to process
        metadata: Dictionary containing the metadata fields for the document
        
    Returns:
        Response indicating success with document ID and number of chunks
    """
    text = extract_text(file_path)
    chunks = chunk_text(text)
    doc_id = str(uuid.uuid4())

    for chunk in chunks:
        emb = generate_embedding(chunk)
        print("embedding for chunk", emb)
        insert_embedding(doc_id, chunk, emb, {"source": file_path})
        
    return {"success": True, "doc_id": doc_id, "chunks": len(chunks)}

@mcp.tool()
def update_metadata(doc_id: str, new_metadata: dict) -> dict:
    """Update metadata for a document in the database.
    
    Args:
        doc_id: The unique identifier of the document
        new_metadata: Dictionary containing the new metadata fields to update
        
    Returns:
        Response from the database update operation
    """
    response = supabase.table("documents").update({
        "metadata": new_metadata
    }).eq("doc_id", doc_id).execute()
    return {"success": True, "data": response.data}

@mcp.tool()
def delete_metadata(doc_id: str) -> dict:
    """delete metadata from the database.
    
    Args:
        doc_id: The unique identifier of the document
        
    Returns:
        Response from the database update operation
    """
    response = supabase.table("documents").delete().eq("doc_id", doc_id).execute()
    return {"success": True, "data": response.data}
