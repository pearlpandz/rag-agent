from openai import OpenAI
from config.settings import (
    EMBEDDING_DIMENSIONS,
    EMBEDDING_MODEL,
    OPENAI_API_KEY,
    OPENROUTER_API_KEY,
    OPENROUTER_BASE_URL,
)

embedding_api_key = OPENROUTER_API_KEY or OPENAI_API_KEY
embedding_base_url = OPENROUTER_BASE_URL if OPENROUTER_API_KEY else None
client = OpenAI(api_key=embedding_api_key, base_url=embedding_base_url)

def generate_embedding(text: str):
    response = client.embeddings.create(
        model=EMBEDDING_MODEL,
        input=text
    )
    embedding = response.data[0].embedding
    if len(embedding) != EMBEDDING_DIMENSIONS:
        raise ValueError(
            f"Embedding model returned {len(embedding)} dimensions; "
            f"expected {EMBEDDING_DIMENSIONS}"
        )
    return embedding