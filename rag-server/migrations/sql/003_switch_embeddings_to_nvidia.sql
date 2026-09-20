BEGIN;

DROP INDEX IF EXISTS public.idx_documents_embedding_hnsw;

UPDATE public.documents
SET embedding = NULL;

ALTER TABLE public.documents
    ALTER COLUMN embedding TYPE vector(2048)
    USING NULL::vector(2048);

COMMIT;