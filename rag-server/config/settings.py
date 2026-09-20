import os
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
OPENROUTER_BASE_URL = os.getenv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1")

EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "nvidia/llama-nemotron-embed-vl-1b-v2:free")
EMBEDDING_DIMENSIONS = int(os.getenv("EMBEDDING_DIMENSIONS", 2048))
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

CHUNK_SIZE = int(os.getenv("CHUNK_SIZE", 512))
CHUNK_OVERLAP = int(os.getenv("CHUNK_OVERLAP", 15))