-- Extension for vector operations
CREATE EXTENSION IF NOT EXISTS vector;

-- Categories
CREATE TABLE IF NOT EXISTS library_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text
);

-- Documents
CREATE TABLE IF NOT EXISTS library_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  author text,
  institution text,
  year text,
  language text,
  category_id uuid REFERENCES library_categories(id),
  source_url text,
  doi text,
  isbn text,
  country text,
  source_type text,
  trust_level text,
  license_info text,
  usage_permission text,
  storage_path text,
  page_count integer,
  status text DEFAULT 'pending',
  processing_error text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  uploaded_by uuid -- references auth.users(id)
);

-- Chunks
CREATE TABLE IF NOT EXISTS library_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid REFERENCES library_documents(id) ON DELETE CASCADE,
  page_number integer,
  section_title text,
  chunk_index integer,
  content text NOT NULL,
  token_count integer,
  embedding vector(768),
  created_at timestamp with time zone DEFAULT now()
);

-- Create index for vector similarity search (using HNSW or IVFFlat)
-- HNSW is usually preferred for pgvector >= 0.5.0
CREATE INDEX ON library_chunks USING hnsw (embedding vector_cosine_ops);

-- Processing Jobs
CREATE TABLE IF NOT EXISTS library_processing_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid REFERENCES library_documents(id) ON DELETE CASCADE,
  status text DEFAULT 'processing',
  error_message text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Feedback
CREATE TABLE IF NOT EXISTS library_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  query text,
  response text,
  is_useful boolean,
  issue_description text,
  user_id uuid, -- references auth.users(id)
  created_at timestamp with time zone DEFAULT now()
);

-- Match Documents Function (RPC)
CREATE OR REPLACE FUNCTION search_library_chunks(
  query_embedding vector(768),
  match_count int DEFAULT 5,
  minimum_trust_level text DEFAULT NULL,
  category_filter uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  document_id uuid,
  page_number integer,
  section_title text,
  content text,
  similarity float,
  title text,
  author text,
  institution text,
  year text,
  trust_level text
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.document_id,
    c.page_number,
    c.section_title,
    c.content,
    1 - (c.embedding <=> query_embedding) AS similarity,
    d.title,
    d.author,
    d.institution,
    d.year,
    d.trust_level
  FROM library_chunks c
  JOIN library_documents d ON c.document_id = d.id
  WHERE 
    (category_filter IS NULL OR d.category_id = category_filter)
    -- Simplification for minimum_trust_level as it might require a numeric hierarchy mapping
  ORDER BY c.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
