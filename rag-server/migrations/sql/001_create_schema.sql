-- PostgreSQL schema for the RAG server.
-- Uses pgvector for semantic retrieval and RBAC tables for document-level access.

BEGIN;

CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.category (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    shortdescription text,
    createdat timestamptz NOT NULL DEFAULT now(),
    updatedat timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.docs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    description text,
    category_id uuid REFERENCES public.category(id) ON DELETE SET NULL,
    createdby text,
    updatedby text,
    createdat timestamptz NOT NULL DEFAULT now(),
    updatedat timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.documents (
    id bigserial PRIMARY KEY,
    doc_id text NOT NULL,
    chunk text NOT NULL,
    embedding vector(1536),
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.tickets (
    ticket_id text PRIMARY KEY,
    description text NOT NULL,
    session text NOT NULL,
    status text NOT NULL DEFAULT 'pending',
    created_by text NOT NULL DEFAULT 'agent',
    created_at timestamptz NOT NULL DEFAULT now(),
    assigned_to text
);

CREATE TABLE IF NOT EXISTS public.rbac_users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email text NOT NULL UNIQUE,
    full_name text,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.rbac_roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL UNIQUE,
    description text,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.rbac_permissions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    code text NOT NULL UNIQUE,
    description text,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.rbac_user_roles (
    user_id uuid NOT NULL REFERENCES public.rbac_users(id) ON DELETE CASCADE,
    role_id uuid NOT NULL REFERENCES public.rbac_roles(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, role_id)
);

CREATE TABLE IF NOT EXISTS public.rbac_role_permissions (
    role_id uuid NOT NULL REFERENCES public.rbac_roles(id) ON DELETE CASCADE,
    permission_id uuid NOT NULL REFERENCES public.rbac_permissions(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS public.document_acl (
    doc_id uuid NOT NULL REFERENCES public.docs(id) ON DELETE CASCADE,
    role_id uuid NOT NULL REFERENCES public.rbac_roles(id) ON DELETE CASCADE,
    can_read boolean NOT NULL DEFAULT true,
    can_write boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (doc_id, role_id)
);

CREATE INDEX IF NOT EXISTS idx_docs_category_id ON public.docs(category_id);
CREATE INDEX IF NOT EXISTS idx_documents_doc_id ON public.documents(doc_id);
CREATE INDEX IF NOT EXISTS idx_documents_metadata ON public.documents USING gin(metadata);
CREATE INDEX IF NOT EXISTS idx_tickets_session ON public.tickets(session);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON public.tickets(status);
CREATE INDEX IF NOT EXISTS idx_document_acl_role_id ON public.document_acl(role_id);

CREATE INDEX IF NOT EXISTS idx_documents_embedding_hnsw
    ON public.documents
    USING hnsw (embedding vector_cosine_ops);

CREATE OR REPLACE FUNCTION public.match_documents(
    query_embedding numeric[],
    match_count integer DEFAULT 5,
    filter_doc_id text DEFAULT NULL
)
RETURNS TABLE (
    id bigint,
    doc_id text,
    chunk text,
    metadata jsonb,
    similarity double precision
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
    FROM public.documents d
    WHERE d.embedding IS NOT NULL
      AND (filter_doc_id IS NULL OR d.doc_id = filter_doc_id)
    ORDER BY d.embedding <=> query_embedding::vector
    LIMIT match_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.match_documents_for_user(
    query_embedding numeric[],
    match_count integer DEFAULT 5,
    user_email text DEFAULT NULL,
    filter_doc_id text DEFAULT NULL
)
RETURNS TABLE (
    id bigint,
    doc_id text,
    chunk text,
    metadata jsonb,
    similarity double precision
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
    FROM public.documents d
    JOIN public.docs doc ON doc.id::text = d.doc_id
    JOIN public.document_acl acl ON acl.doc_id = doc.id AND acl.can_read = true
    JOIN public.rbac_user_roles ur ON ur.role_id = acl.role_id
    JOIN public.rbac_users u ON u.id = ur.user_id
    WHERE d.embedding IS NOT NULL
      AND u.is_active = true
      AND (user_email IS NULL OR u.email = user_email)
      AND (filter_doc_id IS NULL OR d.doc_id = filter_doc_id)
    ORDER BY d.embedding <=> query_embedding::vector
    LIMIT match_count;
END;
$$;

COMMIT;
