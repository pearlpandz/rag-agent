CREATE EXTENSION IF NOT EXISTS vector;

-- 1. Create the documents table

CREATE TABLE documents (
id SERIAL PRIMARY KEY,
doc_id TEXT NOT NULL,
chunk TEXT NOT NULL,
embedding VECTOR(1536), -- match your embedding dimension (e.g., 768, 1024, 1536)
metadata JSONB,
created_at TIMESTAMP DEFAULT NOW()
);

-- 2. Create an index for faster vector search

CREATE INDEX ON documents USING ivfflat (embedding vector_l2_ops)
WITH (lists = 100);

-- Optional: speed up metadata filtering
CREATE INDEX ON documents (doc_id);

-- 3. Create the match_documents function

CREATE OR REPLACE FUNCTION match_documents(
query_embedding numeric[],
match_count INT DEFAULT 5
)
RETURNS TABLE (
id INT,
doc_id TEXT,
chunk TEXT,
metadata JSONB,
similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
RETURN QUERY
SELECT
d.id,
d.doc_id,
d.chunk,
d.metadata,
1 - (d.embedding <=> query_embedding::vector) AS similarity
FROM documents d
ORDER BY d.embedding <=> query_embedding::vector
LIMIT match_count;
END;

$$
;

-- category table

CREATE TABLE IF NOT EXISTS public.Category (
 id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
 name text NOT NULL,
 shortDescription text,
 createdAt timestamptz DEFAULT now(),
 updatedAt timestamptz DEFAULT now()
);

-- docs table

CREATE TABLE IF NOT EXISTS public.Docs (
 id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
 name text NOT NULL,
 description text,
 category_id uuid REFERENCES public.Category (id) ON DELETE SET NULL,
 createdBy text,
 updatedBy text
);
$$
