import json
from storage.db import get_connection

def insert_embedding(doc_id, chunk, embedding, metadata):
    conn = get_connection()  # get connection from db.py
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO documents (doc_id, chunk, embedding, metadata)
                VALUES (%s, %s, %s, %s)
                """,
                (doc_id, chunk, embedding, json.dumps(metadata))
            )
            conn.commit()
    finally:
        conn.close()

def search_similar(query_embedding, top_k=5, doc_id=None):
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT * FROM match_documents(%s, %s, %s)",
                (query_embedding, top_k, doc_id)
            )
            return cur.fetchall()
    finally:
        conn.close()
