import uuid
from rag.chunker import chunk_text
from rag.embedder import generate_embedding
from storage.postgres_client import insert_embedding

def process_document(file_path: str):
    from storage.file_handler import extract_text
    text = extract_text(file_path)
    chunks = chunk_text(text)
    doc_id = str(uuid.uuid4())

    for chunk in chunks:
        emb = generate_embedding(chunk)
        insert_embedding(doc_id, chunk, emb, {"source": file_path})
    
    return {"doc_id": doc_id, "chunks": len(chunks)}