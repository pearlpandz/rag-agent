from rag.embedder import generate_embedding
from storage.postgres_client import search_similar
from mcp.server.fastmcp import FastMCP

mcp = FastMCP("vector-search-tools")

@mcp.tool()
def vector_search(query: str, top_k: int = 5, doc_id = None) -> dict:
    """Search for similar document chunks using semantic similarity.
    
    Args:
        query: The search query text to find similar content
        top_k: Number of top similar results to return (default: 5)
        
    Returns:
        Dictionary containing the search results with similarity scores
    """
    query_emb = generate_embedding(query)
    results = search_similar(query_emb, top_k, doc_id)
    return {"query": query, "top_k": top_k, "results": results}