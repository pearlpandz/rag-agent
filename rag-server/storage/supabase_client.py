from supabase import create_client
from config.settings import SUPABASE_URL, SUPABASE_KEY

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

def insert_embedding(doc_id: str, chunk: str, embedding: list, metadata: dict):
    response = supabase.table("documents").insert({
        "doc_id": doc_id,
        "chunk": chunk,
        "embedding": embedding,
        "metadata": metadata
    }).execute()
    return response

def search_similar(query_embedding: list, top_k: int = 5, doc_id = None):
    response = supabase.rpc("match_documents", {
        "query_embedding": query_embedding,
        "match_count": top_k,
        "doc_id": doc_id
    }).execute()
    return response.data