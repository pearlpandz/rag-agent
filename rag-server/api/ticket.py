
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from datetime import datetime
from typing import List, Optional
import uuid
from storage.db import get_connection
import psycopg2

router = APIRouter(prefix="/api/ticket", tags=["categories"])

class Ticket(BaseModel):
    ticket_id: Optional[str] = None
    description: str = Field(..., example="User reported a bug in the login module.")
    session: str = Field(..., example="USER-SESSION-123")
    status: str = Field("pending", example="pending")
    created_by: str = Field("agent", example="agent")
    created_at: datetime = Field(default_factory=datetime.now)
    assigned_to: Optional[str] = Field(None, example="jane.doe")

@router.post("/", response_model=Ticket, status_code=201)
async def create_ticket(ticket: Ticket):
    """Create a new ticket."""
    conn = None
    cursor = None
    try:
        conn = get_connection()
        cursor = conn.cursor()
        ticket_id = str(uuid.uuid4())
        cursor.execute(
            """
            INSERT INTO tickets (ticket_id, description, session) 
            VALUES (%s, %s, %s) RETURNING ticket_id, description, session, status, created_by, created_at, assigned_to;
            """,
            (ticket_id, ticket.description, ticket.session)
        )
        new_ticket = cursor.fetchone()
        conn.commit()
        if new_ticket:
            return Ticket(ticket_id=new_ticket[0], description=new_ticket[1], session=new_ticket[2], status=new_ticket[3], created_by=new_ticket[4], created_at=new_ticket[5], assigned_to=new_ticket[6])
        else:
            raise HTTPException(status_code=500, detail="Failed to create ticket")
    except psycopg2.Error as e:
        raise HTTPException(status_code=500, detail=f"Database error: {e}")
    finally:
        if cursor: cursor.close()
        if conn: conn.close()

@router.get("/list", response_model=List[Ticket])
async def get_all_tickets():
    """Retrieve all tickets."""
    conn = None
    cursor = None
    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT ticket_id, description, session, status, created_by, created_at, assigned_to FROM tickets")
        tickets_data = cursor.fetchall()
        return [Ticket(ticket_id=t[0], description=t[1], session=t[2], status=t[3], created_by=t[4], created_at=t[5], assigned_to=t[6]) for t in tickets_data]
    except psycopg2.Error as e:
        raise HTTPException(status_code=500, detail=f"Database error: {e}")
    finally:
        if cursor: cursor.close()
        if conn: conn.close()

@router.get("/{ticket_id}", response_model=Ticket)
async def get_ticket(ticket_id: str):
    """Retrieve a single ticket by ID."""
    conn = None
    cursor = None
    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT ticket_id, description, session, status, created_by, created_at, assigned_to FROM tickets WHERE ticket_id = %s", (ticket_id,))
        ticket_data = cursor.fetchone()
        if ticket_data:
            return Ticket(ticket_id=ticket_data[0], description=ticket_data[1], session=ticket_data[2], status=ticket_data[3], created_by=ticket_data[4], created_at=ticket_data[5], assigned_to=ticket_data[6])
        raise HTTPException(status_code=404, detail="Ticket not found")
    except psycopg2.Error as e:
        raise HTTPException(status_code=500, detail=f"Database error: {e}")
    finally:
        if cursor: cursor.close()
        if conn: conn.close()

@router.put("/{ticket_id}", response_model=Ticket)
async def update_ticket(ticket_id: str, updated_ticket: Ticket):
    """Update an existing ticket."""
    conn = None
    cursor = None
    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            """
            UPDATE tickets SET description = %s, session = %s, status = %s, assigned_to = %s
            WHERE ticket_id = %s RETURNING ticket_id, description, session, status, created_by, created_at, assigned_to;
            """,
            (updated_ticket.description, updated_ticket.session, updated_ticket.status, updated_ticket.assigned_to, ticket_id)
        )
        updated_data = cursor.fetchone()
        conn.commit()
        if updated_data:
            return Ticket(ticket_id=updated_data[0], description=updated_data[1], session=updated_data[2], status=updated_data[3], created_by=updated_data[4], created_at=updated_data[5], assigned_to=updated_data[6])
        raise HTTPException(status_code=404, detail="Ticket not found")
    except psycopg2.Error as e:
        raise HTTPException(status_code=500, detail=f"Database error: {e}")
    finally:
        if cursor: cursor.close()
        if conn: conn.close()

@router.delete("/{ticket_id}", status_code=204)
async def delete_ticket(ticket_id: str):
    """Delete a ticket by ID."""
    conn = None
    cursor = None
    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM tickets WHERE ticket_id = %s RETURNING ticket_id", (ticket_id,))
        deleted_ticket = cursor.fetchone()
        conn.commit()
        if deleted_ticket:
            return
        raise HTTPException(status_code=404, detail="Ticket not found")
    except psycopg2.Error as e:
        raise HTTPException(status_code=500, detail=f"Database error: {e}")
    finally:
        if cursor: cursor.close()
        if conn: conn.close()
