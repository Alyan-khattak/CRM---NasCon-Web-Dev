"""
Google Calendar integration.
OAuth 2.0 flow: /calendar/auth → Google consent → /calendar/callback → tokens stored.
Scopes: calendar.events (read+write).
Tokens stored in ./google_tokens.json keyed by workspace_user_id (demo-grade storage).
"""
import json
import os
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import RedirectResponse
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import CurrentUser, get_current_user
from app.config import settings
from app.database import get_db
from app.middleware.rate_limit import default_limit

router = APIRouter(prefix="/calendar", tags=["calendar"])

SCOPES = ["https://www.googleapis.com/auth/calendar.events"]
TOKENS_FILE = Path("./google_tokens.json")


def _load_tokens() -> dict:
    if TOKENS_FILE.exists():
        return json.loads(TOKENS_FILE.read_text())
    return {}


def _save_tokens(data: dict) -> None:
    TOKENS_FILE.write_text(json.dumps(data))


def _get_flow(state: Optional[str] = None) -> Flow:
    client_config = {
        "web": {
            "client_id": settings.GOOGLE_CLIENT_ID,
            "client_secret": settings.GOOGLE_CLIENT_SECRET,
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "redirect_uris": [settings.GOOGLE_REDIRECT_URI],
        }
    }
    flow = Flow.from_client_config(client_config, scopes=SCOPES, state=state)
    flow.redirect_uri = settings.GOOGLE_REDIRECT_URI
    return flow


def _credentials_for_user(user_id: int) -> Optional[Credentials]:
    tokens = _load_tokens()
    entry = tokens.get(str(user_id))
    if not entry:
        return None
    creds = Credentials(
        token=entry.get("token"),
        refresh_token=entry.get("refresh_token"),
        token_uri="https://oauth2.googleapis.com/token",
        client_id=settings.GOOGLE_CLIENT_ID,
        client_secret=settings.GOOGLE_CLIENT_SECRET,
    )
    return creds


def _service(creds: Credentials):
    return build("calendar", "v3", credentials=creds, cache_discovery=False)


@router.get("/auth")
@default_limit
async def calendar_auth(
    request: Request,
    current_user: CurrentUser = Depends(get_current_user),
):
    """Redirect user to Google OAuth consent screen."""
    if not settings.GOOGLE_CLIENT_ID:
        raise HTTPException(503, "Google Calendar not configured")
    flow = _get_flow()
    # state carries user_id so callback can store tokens correctly
    auth_url, state = flow.authorization_url(
        access_type="offline",
        prompt="consent",
        state=str(current_user.workspace_user_id),
        include_granted_scopes="true",
    )
    return {"auth_url": auth_url}


@router.get("/callback")
async def calendar_callback(
    code: str = Query(...),
    state: str = Query(...),
    error: Optional[str] = Query(None),
):
    """Handle Google OAuth callback, store tokens, redirect to frontend."""
    if error:
        return RedirectResponse(f"http://localhost:3000/calendar?error={error}")
    try:
        flow = _get_flow(state=state)
        flow.fetch_token(code=code)
        creds = flow.credentials
        user_id = state
        tokens = _load_tokens()
        tokens[user_id] = {
            "token": creds.token,
            "refresh_token": creds.refresh_token,
        }
        _save_tokens(tokens)
    except Exception as e:
        return RedirectResponse(f"http://localhost:3000/calendar?error=oauth_failed")
    return RedirectResponse("http://localhost:3000/calendar?connected=true")


@router.get("/status")
@default_limit
async def calendar_status(
    request: Request,
    current_user: CurrentUser = Depends(get_current_user),
):
    """Check if current user has connected Google Calendar."""
    creds = _credentials_for_user(current_user.workspace_user_id)
    return {"connected": creds is not None}


class EventCreate(BaseModel):
    title: str
    start: str   # ISO 8601 e.g. "2026-10-20T10:00:00"
    end: str     # ISO 8601 e.g. "2026-10-20T11:00:00"
    description: str = ""
    attendees: list[str] = []
    timezone: str = "Asia/Karachi"


class EventResponse(BaseModel):
    id: str
    title: str
    start: str
    end: str
    description: str
    html_link: str


@router.post("/events", response_model=EventResponse, status_code=201)
@default_limit
async def create_event(
    request: Request,
    body: EventCreate,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a Google Calendar event for the current user."""
    creds = _credentials_for_user(current_user.workspace_user_id)
    if not creds:
        raise HTTPException(403, "Google Calendar not connected — visit /calendar/auth first")
    try:
        service = _service(creds)
        event_body = {
            "summary": body.title,
            "description": body.description,
            "start": {"dateTime": body.start, "timeZone": body.timezone},
            "end": {"dateTime": body.end, "timeZone": body.timezone},
        }
        if body.attendees:
            event_body["attendees"] = [{"email": e} for e in body.attendees]
        event = service.events().insert(calendarId="primary", body=event_body).execute()
        return EventResponse(
            id=event["id"],
            title=event.get("summary", ""),
            start=event["start"].get("dateTime", ""),
            end=event["end"].get("dateTime", ""),
            description=event.get("description", ""),
            html_link=event.get("htmlLink", ""),
        )
    except Exception as e:
        raise HTTPException(500, f"Google Calendar error: {e}")


@router.get("/events", response_model=list[EventResponse])
@default_limit
async def list_events(
    request: Request,
    days_ahead: int = 30,
    current_user: CurrentUser = Depends(get_current_user),
):
    """List upcoming Google Calendar events (next N days)."""
    creds = _credentials_for_user(current_user.workspace_user_id)
    if not creds:
        raise HTTPException(403, "Google Calendar not connected")
    try:
        service = _service(creds)
        now = datetime.now(timezone.utc)
        time_max = now + timedelta(days=days_ahead)
        result = service.events().list(
            calendarId="primary",
            timeMin=now.isoformat(),
            timeMax=time_max.isoformat(),
            maxResults=50,
            singleEvents=True,
            orderBy="startTime",
        ).execute()
        events = []
        for e in result.get("items", []):
            start = e["start"].get("dateTime") or e["start"].get("date", "")
            end = e["end"].get("dateTime") or e["end"].get("date", "")
            events.append(EventResponse(
                id=e["id"],
                title=e.get("summary", "(No title)"),
                start=start,
                end=end,
                description=e.get("description", ""),
                html_link=e.get("htmlLink", ""),
            ))
        return events
    except Exception as e:
        raise HTTPException(500, f"Google Calendar error: {e}")
