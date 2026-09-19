from typing import List, Optional
from uuid import UUID
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi import Body
from pydantic import BaseModel, Field

# Use the project's DB helper
from storage.db import get_connection

router = APIRouter(prefix="/api/categories", tags=["categories"])


# --- Pydantic models ---
class CategoryBase(BaseModel):
    name: str = Field(..., example="Tools")
    shortdescription: Optional[str] = Field(None, example="Utility tools and helpers")


class CategoryCreate(CategoryBase):
    pass


class CategoryUpdate(BaseModel):
    name: Optional[str]
    shortdescription: Optional[str]


class CategoryOut(CategoryBase):
    id: UUID
    createdAt: Optional[datetime]
    updatedAt: Optional[datetime]


# Simple DB dependency using storage.db.get_connection()
def get_db():
    conn = get_connection()
    try:
        yield conn
    finally:
        try:
            conn.close()
        except Exception:
            pass


# --- CRUD endpoints ---
@router.get("/", response_model=List[CategoryOut])
def list_categories(db_conn=Depends(get_db)):
    with db_conn.cursor() as cur:
        cur.execute(
            "SELECT id::uuid, name, shortdescription, createdAt, updatedAt FROM category ORDER BY id"
        )
        rows = cur.fetchall()
    return [
        {
            "id": r[0],
            "name": r[1],
            "shortdescription": r[2],
            "createdAt": r[3],
            "updatedAt": r[4],
        }
        for r in rows
    ]


@router.get("/{category_id}", response_model=CategoryOut)
def get_category(category_id: UUID, db_conn=Depends(get_db)):
    with db_conn.cursor() as cur:
        cur.execute(
            "SELECT id::uuid, name, shortdescription, createdAt, updatedAt FROM category WHERE id = %s",
            (category_id,),
        )
        row = cur.fetchone()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")
    return {
        "id": row[0],
        "name": row[1],
        "shortdescription": row[2],
        "createdAt": row[3],
        "updatedAt": row[4],
    }


@router.post("/", response_model=CategoryOut, status_code=status.HTTP_201_CREATED)
def create_category(
    name: str = Body(..., embed=True),
    shortdescription: Optional[str] = Body(None, embed=True),
    db_conn=Depends(get_db),
):
    """Create a category. Accepts only `name` and optional `shortdescription` in the request body."""
    now = datetime.utcnow()
    with db_conn.cursor() as cur:
        # Prefer RETURNING for Postgres
        try:
            cur.execute(
                "INSERT INTO category (name, shortdescription, createdAt, updatedAt) VALUES (%s, %s, %s, %s) RETURNING id::uuid",
                (name, shortdescription, now, now),
            )
            new_id = cur.fetchone()[0]
        except Exception:
            # fallback without RETURNING
            cur.execute(
                "INSERT INTO category (name, shortdescription, createdAt, updatedAt) VALUES (%s, %s, %s, %s)",
                (name, shortdescription, now, now),
            )
            try:
                new_id = cur.lastrowid
            except Exception:
                new_id = None
        db_conn.commit()

    if new_id is None:
        # try to query inserted row as a final fallback
        with db_conn.cursor() as cur:
            cur.execute(
                "SELECT id::uuid, name, shortdescription, createdAt, updatedAt FROM category WHERE name = %s ORDER BY id DESC LIMIT 1",
                (name,),
            )
            row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=500, detail="Failed to retrieve created category")
        return {
            "id": row[0],
            "name": row[1],
            "shortdescription": row[2],
            "createdAt": row[3],
            "updatedAt": row[4],
        }

    return {
        "id": new_id,
        "name": name,
        "shortdescription": shortdescription,
        "createdAt": now,
        "updatedAt": now,
    }


@router.put("/{category_id}", response_model=CategoryOut)
def update_category(category_id: UUID, payload: CategoryUpdate, db_conn=Depends(get_db)):
    fields = []
    values = []
    if payload.name is not None:
        fields.append("name = %s")
        values.append(payload.name)
    if payload.shortdescription is not None:
        fields.append("shortdescription = %s")
        values.append(payload.shortdescription)
    if not fields:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No fields to update")
    values.append(datetime.utcnow())  # updatedAt
    set_clause = ", ".join(fields + ["updatedAt = %s"])
    values.append(category_id)
    with db_conn.cursor() as cur:
        try:
            cur.execute(
                f"UPDATE category SET {set_clause} WHERE id = %s RETURNING id::uuid, name, shortdescription, createdAt, updatedAt",
                tuple(values),
            )
            row = cur.fetchone()
        except Exception:
            row = None
        db_conn.commit()

    if not row:
        with db_conn.cursor() as cur:
            cur.execute(
                "SELECT id::uuid, name, shortdescription, createdAt, updatedAt FROM category WHERE id = %s",
                (category_id,),
            )
            row = cur.fetchone()

    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")

    return {
        "id": row[0],
        "name": row[1],
        "shortdescription": row[2],
        "createdAt": row[3],
        "updatedAt": row[4],
    }


@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_category(category_id: UUID, db_conn=Depends(get_db)):
    with db_conn.cursor() as cur:
        try:
            cur.execute("DELETE FROM category WHERE id = %s RETURNING id::uuid", (category_id,))
            deleted = cur.fetchone()
        except Exception:
            deleted = None
        db_conn.commit()

    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")

    return None