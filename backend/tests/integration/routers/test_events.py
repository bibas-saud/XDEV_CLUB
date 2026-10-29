import uuid
from datetime import date, datetime, timedelta

import pytest

from app.routers.events import registration_limiter


def _future_date(days: int = 30) -> str:
    return (date.today() + timedelta(days=days)).isoformat()


def _past_date(days: int = 7) -> str:
    return (date.today() - timedelta(days=days)).isoformat()


def _time(hours: int, minutes: int = 0) -> str:
    """Time string relative to now, clamped into the same day."""
    t = (datetime.now() + timedelta(hours=hours, minutes=minutes)).time()
    return t.strftime("%H:%M:%S")


def _workshop_payload(**overrides) -> dict:
    payload = {
        "name": "Intro to Git",
        "description": "A hands-on workshop about version control.",
        "type": "workshop",
        "event_date": _future_date(),
        "start_time": "10:00:00",
        "end_time": "12:00:00",
        "venue": "Lab 101",
        "is_free": True,
        "max_capacity": 50,
    }
    payload.update(overrides)
    return payload


def _competitive_payload(**overrides) -> dict:
    payload = {
        "name": "HackX Devs",
        "description": "A 24-hour competitive hackathon.",
        "type": "competitive",
        "event_date": _future_date(60),
        "start_time": "09:00:00",
        "end_time": None,
        "venue": "Main Auditorium",
        "is_free": False,
        "fee_amount": 100,
        "currency": "INR",
        "max_capacity": 30,
        "prize_structure": "first_second_third",
        "prizes": {
            "1": {"amount": 5000, "description": "Cash + Trophy"},
            "2": {"amount": 3000, "description": "Cash + Medal"},
            "3": {"amount": 2000, "description": "Cash"},
        },
        "has_certificates": True,
        "certificate_details": "All participants get certificates",
    }
    payload.update(overrides)
    return payload


def _participant(**overrides) -> dict:
    payload = {
        "name": "Riya Sharma",
        "email": "riya@example.com",
        "phone": "9876543210",
        "college": "XYZ Institute of Technology",
        "roll_no": "22CS048",
    }
    payload.update(overrides)
    return payload


@pytest.fixture(autouse=True)
def _relax_limiter(monkeypatch):
    """Keep the per-IP sliding window out of the way except in rate-limit tests."""
    monkeypatch.setattr(registration_limiter, "max_events", 10_000)
    registration_limiter._hits.clear()


@pytest.fixture
def created_workshop(authenticated_client):
    response = authenticated_client.post(
        "/api/admin/events", json=_workshop_payload()
    )
    assert response.status_code == 201
    return response.json()


# --- Auth ---


class TestEventAuth:
    def test_admin_list_requires_authentication(self, client):
        response = client.get("/api/admin/events")
        assert response.status_code == 401

    def test_create_requires_authentication(self, client):
        response = client.post("/api/admin/events", json=_workshop_payload())
        assert response.status_code == 401

    def test_register_requires_authentication(self, client):
        response = client.post(
            f"/api/admin/events/{uuid.uuid4()}/register",
            json=_participant(),
        )
        assert response.status_code == 401

    def test_end_requires_authentication(self, client):
        response = client.post(f"/api/admin/events/{uuid.uuid4()}/end")
        assert response.status_code == 401


# --- Public listing ---


class TestPublicListings:
    def test_empty_upcoming(self, client):
        response = client.get("/api/events")
        assert response.status_code == 200
        body = response.json()
        assert body == {"items": [], "total": 0}

    def test_created_event_appears_in_upcoming(self, client, created_workshop):
        response = client.get("/api/events")
        assert response.status_code == 200
        body = response.json()
        assert body["total"] == 1
        assert body["items"][0]["name"] == "Intro to Git"
        assert body["items"][0]["status"] == "upcoming"

    def test_filter_by_type(self, client, created_workshop):
        response = client.get("/api/events?type=competitive")
        assert response.status_code == 200
        assert response.json()["total"] == 0

        response = client.get("/api/events?type=workshop")
        assert response.json()["total"] == 1

    def test_status_auto_syncs_on_read(self, client, authenticated_client):
        """Past-dated events move to ?status=past with no manual trigger."""
        payload = _workshop_payload(event_date=_past_date())
        event = authenticated_client.post("/api/admin/events", json=payload).json()

        past = client.get("/api/events?status=past").json()
        assert past["total"] == 1
        assert past["items"][0]["id"] == event["id"]
        assert client.get("/api/events").json()["total"] == 0

    def test_invalid_status_rejected(self, client):
        response = client.get("/api/events?status=tomorrow")
        assert response.status_code == 422

    def test_exposes_registration_count_and_spots_left(
        self, client, created_workshop
    ):
        body = client.get(f"/api/events/{created_workshop['id']}").json()
        assert body["registration_count"] == 0
        assert body["spots_left"] == 50

    def test_public_payload_hides_check_in_token(self, client, created_workshop):
        body = client.get(f"/api/events/{created_workshop['id']}").json()
        assert "check_in_token" not in body

    def test_admin_list_includes_check_in_token(self, authenticated_client):
        response = authenticated_client.get("/api/admin/events?limit=100")
        items = response.json()["items"]
        if items:
            assert len(items[0]["check_in_token"]) >= 16

    def test_get_single_event_public(self, client, created_workshop):
        response = client.get(f"/api/events/{created_workshop['id']}")
        assert response.status_code == 200
        assert response.json()["venue"] == "Lab 101"

    def test_get_unknown_event_404(self, client):
        response = client.get(f"/api/events/{uuid.uuid4()}")
        assert response.status_code == 404


# --- Create ---


class TestCreateEvent:
    def test_create_workshop_success(self, authenticated_client):
        response = authenticated_client.post(
            "/api/admin/events", json=_workshop_payload()
        )
        assert response.status_code == 201
        body = response.json()
        assert body["type"] == "workshop"
        assert body["is_free"] is True
        assert body["photos"] == []
        assert body["videos"] == []
        assert body["ended_at"] is None

    def test_create_competitive_with_prizes_serializes_amounts(
        self, authenticated_client
    ):
        """Decimal prize amounts must be JSON-serializable (regression test)."""
        response = authenticated_client.post(
            "/api/admin/events", json=_competitive_payload()
        )
        assert response.status_code == 201
        prizes = response.json()["prizes"]
        assert float(prizes["1"]["amount"]) == 5000.0
        assert prizes["1"]["description"] == "Cash + Trophy"

    def test_create_competitive_without_prize_structure_rejected(
        self, authenticated_client
    ):
        payload = _competitive_payload(prize_structure=None)
        response = authenticated_client.post("/api/admin/events", json=payload)
        assert response.status_code == 422

    def test_create_competitive_without_prizes_rejected(self, authenticated_client):
        payload = _competitive_payload(prizes=None)
        response = authenticated_client.post("/api/admin/events", json=payload)
        assert response.status_code == 422

    def test_create_workshop_with_prizes_rejected(self, authenticated_client):
        payload = _workshop_payload(
            prize_structure="first", prizes={"1": {"amount": 100, "description": ""}}
        )
        response = authenticated_client.post("/api/admin/events", json=payload)
        assert response.status_code == 422

    def test_create_paid_event_without_fee_rejected(self, authenticated_client):
        payload = _workshop_payload(is_free=False)
        response = authenticated_client.post("/api/admin/events", json=payload)
        assert response.status_code == 422

    def test_create_invalid_type_rejected(self, authenticated_client):
        payload = _workshop_payload(type="meetup")
        response = authenticated_client.post("/api/admin/events", json=payload)
        assert response.status_code == 422

    def test_create_extra_field_rejected(self, authenticated_client):
        payload = _workshop_payload(sponsor="ACME")
        response = authenticated_client.post("/api/admin/events", json=payload)
        assert response.status_code == 422


# --- Update & lifecycle ---


class TestUpdateAndLifecycle:
    def test_partial_update(self, authenticated_client, created_workshop):
        response = authenticated_client.patch(
            f"/api/admin/events/{created_workshop['id']}",
            json={"venue": "Lab 202", "max_capacity": 80},
        )
        assert response.status_code == 200
        body = response.json()
        assert body["venue"] == "Lab 202"
        assert body["max_capacity"] == 80
        assert body["name"] == "Intro to Git"

    def test_update_to_workshop_clears_prizes(self, authenticated_client):
        event = authenticated_client.post(
            "/api/admin/events", json=_competitive_payload()
        ).json()
        response = authenticated_client.patch(
            f"/api/admin/events/{event['id']}",
            json={
                "type": "workshop",
                "prize_structure": None,
                "prizes": None,
                "is_free": True,
                "fee_amount": None,
            },
        )
        assert response.status_code == 200
        body = response.json()
        assert body["prize_structure"] is None
        assert body["prizes"] is None

    def test_end_event_moves_to_past_immediately(
        self, client, authenticated_client
    ):
        """Ending a future-dated event forces it into Past right away."""
        event = authenticated_client.post(
            "/api/admin/events", json=_workshop_payload()
        ).json()
        response = authenticated_client.post(
            f"/api/admin/events/{event['id']}/end"
        )
        assert response.status_code == 200
        body = response.json()
        assert body["status"] == "past"
        assert body["ended_at"] is not None

        assert client.get("/api/events").json()["total"] == 0
        past = client.get("/api/events?status=past").json()
        assert past["total"] == 1

    def test_end_already_past_conflicts(self, authenticated_client):
        payload = _workshop_payload(event_date=_past_date())
        event = authenticated_client.post("/api/admin/events", json=payload).json()
        # Auto-sync already marked it past on creation read-back
        response = authenticated_client.post(
            f"/api/admin/events/{event['id']}/end"
        )
        assert response.status_code == 409

    def test_reopen_within_window_restores(
        self, client, authenticated_client
    ):
        event = authenticated_client.post(
            "/api/admin/events", json=_workshop_payload()
        ).json()
        assert (
            authenticated_client.post(f"/api/admin/events/{event['id']}/end").status_code
            == 200
        )

        response = authenticated_client.post(
            f"/api/admin/events/{event['id']}/reopen"
        )
        assert response.status_code == 200
        body = response.json()
        assert body["ended_at"] is None
        assert body["status"] == "upcoming"  # future-dated again

        assert client.get("/api/events").json()["total"] == 1

    def test_reopen_after_24h_expired(self, db_session, authenticated_client):
        from datetime import datetime as dt

        from app.models.event import Event

        event_row = Event(
            name="Old Ended Event",
            description="x",
            type="workshop",
            event_date=date.today() + timedelta(days=30),
            start_time=datetime.strptime("10:00:00", "%H:%M:%S").time(),
            end_time=datetime.strptime("12:00:00", "%H:%M:%S").time(),
            venue="Somewhere",
            max_capacity=10,
            ended_at=dt.now() - timedelta(hours=25),
        )
        db_session.add(event_row)
        db_session.commit()

        response = authenticated_client.post(
            f"/api/admin/events/{event_row.id}/reopen"
        )
        assert response.status_code == 409
        assert "expired" in response.json()["detail"].lower()

    def test_reopen_not_ended_conflicts(self, authenticated_client, created_workshop):
        response = authenticated_client.post(
            f"/api/admin/events/{created_workshop['id']}/reopen"
        )
        assert response.status_code == 409

    def test_delete_is_permanent_and_cascades(
        self, client, db_session, authenticated_client
    ):
        from sqlalchemy import select

        from app.models.event_registration import EventRegistration

        event = authenticated_client.post(
            "/api/admin/events", json=_workshop_payload(max_capacity=5)
        ).json()
        registration = authenticated_client.post(
            f"/api/admin/events/{event['id']}/register",
            json=_participant(),
        ).json()

        response = authenticated_client.delete(f"/api/admin/events/{event['id']}")
        assert response.status_code == 200

        # Event gone everywhere
        assert client.get(f"/api/events/{event['id']}").status_code == 404
        assert (
            client.get("/api/events?status=past").json()["total"]
            + client.get("/api/events").json()["total"]
            == 0
        )
        # Registrations cascaded away
        remaining = list(
            db_session.scalars(
                select(EventRegistration).where(
                    EventRegistration.id == uuid.UUID(registration["id"])
                )
            ).all()
        )
        assert remaining == []

    def test_update_unknown_event_404(self, authenticated_client):
        response = authenticated_client.patch(
            f"/api/admin/events/{uuid.uuid4()}", json={"venue": "Nowhere"}
        )
        assert response.status_code == 404


# --- Registrations (participant model) ---


class TestRegistrations:
    def test_register_participant_success(self, authenticated_client):
        event = authenticated_client.post(
            "/api/admin/events", json=_workshop_payload(max_capacity=10)
        ).json()
        response = authenticated_client.post(
            f"/api/admin/events/{event['id']}/register",
            json=_participant(),
        )
        assert response.status_code == 201
        body = response.json()
        assert body["participant_name"] == "Riya Sharma"
        assert body["participant_email"] == "riya@example.com"
        assert body["participant_college"] == "XYZ Institute of Technology"
        assert body["status"] == "registered"
        assert body["attendance"] == "pending"
        assert float(body["fee_amount"]) == 0
        assert body["payment_status"] == "waived"

    def test_register_captures_fee_at_registration_time(self, authenticated_client):
        event = authenticated_client.post(
            "/api/admin/events", json=_competitive_payload()
        ).json()
        registration = authenticated_client.post(
            f"/api/admin/events/{event['id']}/register",
            json=_participant(),
        ).json()
        assert float(registration["fee_amount"]) == 100
        assert registration["payment_status"] == "pending"

    def test_duplicate_email_rejected(self, authenticated_client):
        event = authenticated_client.post(
            "/api/admin/events", json=_workshop_payload()
        ).json()
        url = f"/api/admin/events/{event['id']}/register"
        assert authenticated_client.post(url, json=_participant()).status_code == 201
        dup = _participant(name="Someone Else", email="RIYA@example.com")
        response = authenticated_client.post(url, json=dup)
        assert response.status_code == 400
        assert "already registered" in response.json()["detail"].lower()

    def test_same_email_can_register_for_different_events(
        self, authenticated_client
    ):
        first = authenticated_client.post(
            "/api/admin/events", json=_workshop_payload()
        ).json()
        second = authenticated_client.post(
            "/api/admin/events", json=_workshop_payload(name="Another Event")
        ).json()
        for event in (first, second):
            response = authenticated_client.post(
                f"/api/admin/events/{event['id']}/register", json=_participant()
            )
            assert response.status_code == 201

    def test_capacity_limit_enforced(self, authenticated_client):
        event = authenticated_client.post(
            "/api/admin/events", json=_workshop_payload(max_capacity=1)
        ).json()
        url = f"/api/admin/events/{event['id']}/register"
        first = authenticated_client.post(url, json=_participant())
        assert first.status_code == 201
        second = authenticated_client.post(
            url, json=_participant(email="other@example.com", name="Other Person")
        )
        assert second.status_code == 400
        assert "capacity" in second.json()["detail"].lower()

        body = authenticated_client.get("/api/admin/events").json()
        item = next(e for e in body["items"] if e["id"] == event["id"])
        assert item["registration_count"] == 1
        assert item["spots_left"] == 0

    def test_manual_attendance_marking(self, authenticated_client):
        """Present stamps checked_in_at; absent does not."""
        event = authenticated_client.post(
            "/api/admin/events", json=_workshop_payload()
        ).json()
        registration = authenticated_client.post(
            f"/api/admin/events/{event['id']}/register",
            json=_participant(),
        ).json()

        present = authenticated_client.patch(
            f"/api/admin/events/{event['id']}/registrations/{registration['id']}",
            json={"attendance": "present"},
        )
        assert present.status_code == 200
        body = present.json()
        assert body["attendance"] == "present"
        assert body["checked_in_at"] is not None

        absent = authenticated_client.patch(
            f"/api/admin/events/{event['id']}/registrations/{registration['id']}",
            json={"attendance": "absent"},
        )
        assert absent.status_code == 200
        assert absent.json()["attendance"] == "absent"
        # checked_in_at remains stamped from the earlier check-in
        assert absent.json()["checked_in_at"] is not None

    def test_attended_status_removed(self, authenticated_client):
        event = authenticated_client.post(
            "/api/admin/events", json=_workshop_payload()
        ).json()
        registration = authenticated_client.post(
            f"/api/admin/events/{event['id']}/register",
            json=_participant(),
        ).json()
        response = authenticated_client.patch(
            f"/api/admin/events/{event['id']}/registrations/{registration['id']}",
            json={"status": "attended"},
        )
        assert response.status_code == 422  # no longer a valid status

    def test_cancel_then_reregister_reactivates(self, authenticated_client):
        event = authenticated_client.post(
            "/api/admin/events", json=_workshop_payload(max_capacity=1)
        ).json()
        registration = authenticated_client.post(
            f"/api/admin/events/{event['id']}/register",
            json=_participant(),
        ).json()

        response = authenticated_client.delete(
            f"/api/admin/events/{event['id']}/registrations/{registration['id']}"
        )
        assert response.status_code == 200
        assert response.json()["status"] == "cancelled"

        re_register = authenticated_client.post(
            f"/api/admin/events/{event['id']}/register",
            json=_participant(name="Updated Name"),
        )
        assert re_register.status_code == 201
        assert re_register.json()["participant_name"] == "Updated Name"

    def test_cancel_twice_conflicts(self, authenticated_client):
        event = authenticated_client.post(
            "/api/admin/events", json=_workshop_payload()
        ).json()
        registration = authenticated_client.post(
            f"/api/admin/events/{event['id']}/register",
            json=_participant(),
        ).json()
        url = (
            f"/api/admin/events/{event['id']}/registrations/{registration['id']}"
        )
        assert authenticated_client.delete(url).status_code == 200
        assert authenticated_client.delete(url).status_code == 409

    def test_update_payment_marks_paid_at(self, authenticated_client):
        event = authenticated_client.post(
            "/api/admin/events", json=_competitive_payload()
        ).json()
        registration = authenticated_client.post(
            f"/api/admin/events/{event['id']}/register",
            json=_participant(),
        ).json()

        response = authenticated_client.patch(
            f"/api/admin/events/{event['id']}/registrations/{registration['id']}",
            json={
                "payment_status": "paid",
                "payment_reference": "UPI-123456",
            },
        )
        assert response.status_code == 200
        body = response.json()
        assert body["payment_status"] == "paid"
        assert body["payment_reference"] == "UPI-123456"
        assert body["paid_at"] is not None

    def test_invalid_email_rejected(self, authenticated_client):
        event = authenticated_client.post(
            "/api/admin/events", json=_workshop_payload()
        ).json()
        response = authenticated_client.post(
            f"/api/admin/events/{event['id']}/register",
            json=_participant(email="not-an-email"),
        )
        assert response.status_code == 422


class TestPublicRegistration:
    def test_public_signup_requires_no_auth(self, client, authenticated_client):
        event = authenticated_client.post(
            "/api/admin/events", json=_workshop_payload()
        ).json()
        response = client.post(  # plain client → no auth cookie
            f"/api/events/{event['id']}/register",
            json=_participant(),
        )
        assert response.status_code == 201
        assert response.json()["participant_email"] == "riya@example.com"

    def test_public_signup_on_ended_event_rejected(
        self, client, authenticated_client
    ):
        event = authenticated_client.post(
            "/api/admin/events", json=_workshop_payload()
        ).json()
        authenticated_client.post(f"/api/admin/events/{event['id']}/end")

        response = client.post(
            f"/api/events/{event['id']}/register", json=_participant()
        )
        assert response.status_code == 400

    def test_rate_limit_returns_429(self, client, authenticated_client, monkeypatch):
        monkeypatch.setattr(registration_limiter, "max_events", 2)
        registration_limiter._hits.clear()

        event = authenticated_client.post(
            "/api/admin/events", json=_workshop_payload(max_capacity=50)
        ).json()
        url = f"/api/events/{event['id']}/register"

        assert client.post(url, json=_participant()).status_code == 201
        assert (
            client.post(
                url,
                json=_participant(email="two@example.com", name="Two"),
            ).status_code
            == 201
        )
        third = client.post(
            url,
            json=_participant(email="three@example.com", name="Three"),
        )
        assert third.status_code == 429


# --- QR Check-in flow ---


class TestCheckIn:
    def _ongoing_event(self, authenticated_client):
        """Full-day event today → auto-sync marks it ongoing (any clock time
        except the final minute of the day)."""
        payload = _workshop_payload(
            name="Happening Now",
            event_date=date.today().isoformat(),
            start_time="00:00:00",
            end_time="23:59:00",
        )
        return authenticated_client.post("/api/admin/events", json=payload).json()

    def _seed_registration(self, db_session, event_id, **overrides):
        """Direct-insert an active registration (API blocks registering
        into ongoing events by design)."""
        from app.models.event_registration import EventRegistration

        reg = EventRegistration(
            event_id=uuid.UUID(str(event_id)),
            participant_name=overrides.get("name", "Riya Sharma"),
            participant_email=overrides.get("email", "riya@example.com"),
            fee_amount=0,
            payment_status="waived",
        )
        db_session.add(reg)
        db_session.commit()
        db_session.refresh(reg)
        return reg

    def test_checkin_info_public(self, client, authenticated_client):
        event = self._ongoing_event(authenticated_client)
        info = client.get(f"/api/check-in/{event['check_in_token']}")
        assert info.status_code == 200
        body = info.json()
        assert body["event_name"] == "Happening Now"
        assert "check_in_token" not in body

    def test_full_scan_flow_marks_present(
        self, client, authenticated_client, db_session
    ):
        event = self._ongoing_event(authenticated_client)
        self._seed_registration(db_session, event["id"])

        response = client.post(
            f"/api/check-in/{event['check_in_token']}",
            json={"email": "riya@example.com"},
        )
        assert response.status_code == 200
        body = response.json()
        assert body["participant_name"] == "Riya Sharma"
        assert body["already_checked_in"] is False

        # Roster reflects presence
        roster = authenticated_client.get(
            f"/api/admin/events/{event['id']}/registrations"
        ).json()
        assert roster[0]["attendance"] == "present"
        assert roster[0]["checked_in_at"] is not None

    def test_checkin_idempotent_second_scan(
        self, client, authenticated_client, db_session
    ):
        event = self._ongoing_event(authenticated_client)
        self._seed_registration(db_session, event["id"])
        url = f"/api/check-in/{event['check_in_token']}"

        assert (
            client.post(url, json={"email": "riya@example.com"}).status_code == 200
        )
        again = client.post(url, json={"email": "riya@example.com"})
        assert again.status_code == 200
        assert again.json()["already_checked_in"] is True

    def test_checkin_unknown_email_404(self, client, authenticated_client):
        event = self._ongoing_event(authenticated_client)
        response = client.post(
            f"/api/check-in/{event['check_in_token']}",
            json={"email": "ghost@example.com"},
        )
        assert response.status_code == 404

    def test_checkin_blocked_when_upcoming(self, client, authenticated_client):
        event = authenticated_client.post(
            "/api/admin/events", json=_workshop_payload()
        ).json()

        response = client.post(
            f"/api/check-in/{event['check_in_token']}",
            json={"email": "riya@example.com"},
        )
        assert response.status_code == 400
        assert "ongoing" in response.json()["detail"].lower()

    def test_checkin_blocked_after_end(
        self, client, authenticated_client, db_session
    ):
        event = self._ongoing_event(authenticated_client)
        self._seed_registration(db_session, event["id"])
        authenticated_client.post(f"/api/admin/events/{event['id']}/end")

        response = client.post(
            f"/api/check-in/{event['check_in_token']}",
            json={"email": "riya@example.com"},
        )
        assert response.status_code == 400

    def test_bad_token_404(self, client):
        assert client.get("/api/check-in/not-a-real-token").status_code == 404
        response = client.post(
            "/api/check-in/not-a-real-token", json={"email": "x@y.com"}
        )
        assert response.status_code == 404

# --- Registration window & attendance submission ---


class TestRegistrationWindow:
    def test_registration_open_property_boundaries(self, db_session):
        from app.models.event import Event

        now = datetime.now()
        soon_ok = Event(
            name="open",
            description="x",
            type="workshop",
            event_date=(now + timedelta(hours=5)).date(),
            start_time=(now + timedelta(hours=3)).time(),
            venue="v",
            max_capacity=5,
        )
        inside_window = Event(
            name="closed-late",
            description="x",
            type="workshop",
            event_date=(now + timedelta(hours=1)).date(),
            start_time=(now + timedelta(hours=1)).time(),
            venue="v",
            max_capacity=5,
        )
        already_started = Event(
            name="closed-started",
            description="x",
            type="workshop",
            event_date=now.date(),
            start_time=(now - timedelta(minutes=5)).time(),
            venue="v",
            max_capacity=5,
        )
        assert soon_ok.registration_open is True
        assert inside_window.registration_open is False
        assert already_started.registration_open is False

    def test_register_rejected_inside_closure_window(
        self, client, authenticated_client, db_session
    ):
        """API-level: an event starting in ~1h refuses signups."""
        from app.models.event import Event

        now = datetime.now()
        row = Event(
            name="Closing Soon",
            description="x",
            type="workshop",
            event_date=now.date(),
            start_time=(now + timedelta(hours=1)).time(),
            end_time=(
                min(now + timedelta(hours=3), now.replace(hour=23, minute=59))
            ).time(),
            venue="V",
            max_capacity=10,
        )
        db_session.add(row)
        db_session.commit()

        response = client.post(f"/api/events/{row.id}/register", json=_participant())
        assert response.status_code == 400


class TestAttendanceSubmission:
    def _event(self, authenticated_client, **overrides):
        return authenticated_client.post(
            "/api/admin/events", json=_workshop_payload(**overrides)
        ).json()

    def _register(self, authenticated_client, event):
        reg = authenticated_client.post(
            f"/api/admin/events/{event['id']}/register", json=_participant()
        ).json()
        return reg

    def test_resubmit_within_window_keeps_original_deadline(
        self, authenticated_client
    ):
        """Second submit inside 24h succeeds and does NOT extend the deadline."""
        event = self._event(authenticated_client)
        url = f"/api/admin/events/{event['id']}/attendance/submit"

        first = authenticated_client.post(url)
        assert first.status_code == 200
        original_stamp = first.json()["attendance_submitted_at"]

        second = authenticated_client.post(url)
        assert second.status_code == 200
        assert (
            second.json()["attendance_submitted_at"] == original_stamp
        ), "Resubmission must not extend the 24h window"

    def test_resubmit_after_lock_conflicts(
        self, db_session, authenticated_client
    ):
        from datetime import datetime as dt

        from app.models.event import Event

        now = dt.now()
        row = Event(
            name="Locked Resubmit",
            description="x",
            type="workshop",
            event_date=date.today() + timedelta(days=1),
            start_time=dt.strptime("09:00:00", "%H:%M:%S").time(),
            end_time=dt.strptime("11:00:00", "%H:%M:%S").time(),
            venue="V",
            max_capacity=10,
            attendance_submitted_at=now - timedelta(hours=25),
        )
        db_session.add(row)
        db_session.commit()

        response = authenticated_client.post(
            f"/api/admin/events/{row.id}/attendance/submit"
        )
        assert response.status_code == 409
        assert "locked" in response.json()["detail"].lower()

    def test_editable_within_24h_of_submission(
        self, authenticated_client
    ):
        event = self._event(authenticated_client)
        reg = self._register(authenticated_client, event)
        authenticated_client.post(
            f"/api/admin/events/{event['id']}/attendance/submit"
        )

        response = authenticated_client.patch(
            f"/api/admin/events/{event['id']}/registrations/{reg['id']}",
            json={"attendance": "present"},
        )
        assert response.status_code == 200
        assert response.json()["attendance"] == "present"

    def test_locked_after_24h(self, db_session, authenticated_client):
        from datetime import datetime as dt

        from app.models.event import Event

        now = dt.now()
        row = Event(
            name="Locked Attendance",
            description="x",
            type="workshop",
            event_date=date.today() + timedelta(days=1),
            start_time=dt.strptime("09:00:00", "%H:%M:%S").time(),
            end_time=dt.strptime("11:00:00", "%H:%M:%S").time(),
            venue="V",
            max_capacity=10,
            attendance_submitted_at=now - timedelta(hours=25),
        )
        db_session.add(row)
        db_session.commit()

        admin_row = authenticated_client.get("/api/admin/events?limit=100").json()
        item = next(e for e in admin_row["items"] if e["id"] == str(row.id))
        assert item["attendance_locked"] is True

        reg = self._register(authenticated_client, {"id": str(row.id)})
        response = authenticated_client.patch(
            f"/api/admin/events/{row.id}/registrations/{reg['id']}",
            json={"attendance": "present"},
        )
        assert response.status_code == 409

        # payment updates remain possible even when attendance is frozen
        pay = authenticated_client.patch(
            f"/api/admin/events/{row.id}/registrations/{reg['id']}",
            json={"payment_status": "paid"},
        )
        assert pay.status_code == 200

    def test_cancel_blocked_after_submission_on_past_event(
        self, authenticated_client, db_session
    ):
        from datetime import datetime as dt

        from app.models.event import Event

        now = dt.now()
        row = Event(
            name="Finished & Submitted",
            description="x",
            type="workshop",
            event_date=date.today() - timedelta(days=1),
            start_time=dt.strptime("09:00:00", "%H:%M:%S").time(),
            end_time=dt.strptime("11:00:00", "%H:%M:%S").time(),
            venue="V",
            max_capacity=10,
        )
        db_session.add(row)
        db_session.commit()

        reg = self._seed_past_registration(db_session, row.id)
        url = f"/api/admin/events/{row.id}/registrations/{reg.id}"

        # Before submission: cancellation still possible on a past event
        assert authenticated_client.delete(url).status_code == 200

        # Seed another participant, submit attendance → cancel now blocked
        reg2 = self._seed_past_registration(
            db_session, row.id, email="second@example.com", name="Second Person"
        )
        authenticated_client.post(f"/api/admin/events/{row.id}/attendance/submit")
        blocked = authenticated_client.delete(
            f"/api/admin/events/{row.id}/registrations/{reg2.id}"
        )
        assert blocked.status_code == 409

    @staticmethod
    def _seed_past_registration(db_session, event_id, email="riya@example.com", name="Riya Sharma"):
        from app.models.event_registration import EventRegistration

        reg = EventRegistration(
            event_id=event_id,
            participant_name=name,
            participant_email=email,
            fee_amount=0,
            payment_status="waived",
        )
        db_session.add(reg)
        db_session.commit()
        db_session.refresh(reg)
        return reg


# --- Admin registration with cash-in-person payment choice ---


class TestAdminPaymentChoice:
    def _paid_event(self, authenticated_client):
        return authenticated_client.post(
            "/api/admin/events",
            json=_competitive_payload(max_capacity=10),
        ).json()

    def test_received_cash_marks_paid_with_timestamp(
        self, authenticated_client
    ):
        event = self._paid_event(authenticated_client)
        response = authenticated_client.post(
            f"/api/admin/events/{event['id']}/register",
            json=_participant(payment_status="paid"),
        )
        assert response.status_code == 201
        body = response.json()
        assert body["payment_status"] == "paid"
        assert body["paid_at"] is not None
        # reference stays empty unless provided later via mark-paid flow
        assert body["payment_reference"] is None

    def test_waived_choice_marks_waived(self, authenticated_client):
        event = self._paid_event(authenticated_client)
        response = authenticated_client.post(
            f"/api/admin/events/{event['id']}/register",
            json=_participant(payment_status="waived"),
        )
        assert response.status_code == 201
        body = response.json()
        assert body["payment_status"] == "waived"
        assert body["paid_at"] is None

    def test_no_choice_defaults_to_pending(self, authenticated_client):
        event = self._paid_event(authenticated_client)
        response = authenticated_client.post(
            f"/api/admin/events/{event['id']}/register",
            json=_participant(),
        )
        assert response.status_code == 201
        body = response.json()
        assert body["payment_status"] == "pending"
        assert body["paid_at"] is None

    def test_free_event_forces_waived_even_if_paid_requested(
        self, authenticated_client
    ):
        event = authenticated_client.post(
            "/api/admin/events", json=_workshop_payload()
        ).json()
        response = authenticated_client.post(
            f"/api/admin/events/{event['id']}/register",
            json=_participant(payment_status="paid"),
        )
        assert response.status_code == 201
        assert response.json()["payment_status"] == "waived"

    def test_public_signup_cannot_send_payment_status(
        self, client, authenticated_client
    ):
        event = self._paid_event(authenticated_client)
        payload = _participant(payment_status="paid")
        payload["payment_status"] = "paid"  # explicit, must be rejected
        response = client.post(
            f"/api/events/{event['id']}/register", json=payload
        )
        assert response.status_code == 422  # extra="forbid" on public schema

    def test_reregister_after_cancel_honors_new_choice(
        self, authenticated_client
    ):
        event = self._paid_event(authenticated_client)
        url = f"/api/admin/events/{event['id']}/register"
        reg = authenticated_client.post(url, json=_participant()).json()
        assert (
            authenticated_client.delete(
                f"/api/admin/events/{event['id']}/registrations/{reg['id']}"
            ).status_code
            == 200
        )
        again = authenticated_client.post(
            url,
            json=_participant(name="Riya Again", payment_status="paid"),
        ).json()
        assert again["payment_status"] == "paid"
        assert again["paid_at"] is not None


# --- Cover image ---


class TestEventCover:
    @pytest.fixture(autouse=True)
    def _fake_storage(self, monkeypatch):
        """Never touch real Supabase from tests."""
        from app.core.config import config
        from app.services import events as events_service

        monkeypatch.setattr(events_service, "upload_file", lambda *a, **k: None)
        monkeypatch.setattr(events_service, "delete_file", lambda *a, **k: None)
        monkeypatch.setattr(config, "supabase_project_url", "https://abc.supabase.co")
        monkeypatch.setattr(config, "supabase_events_bucket", "events")

    def _png(self, size=100):
        from io import BytesIO

        buf = BytesIO()
        # minimal 1x1 PNG header bytes; content is never decoded server-side
        buf.write(
            b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01"
            b"\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15\xc4\x89"
        )
        return buf.getvalue() * max(1, size // 25)

    def _jpeg(self):
        from io import BytesIO

        buf = BytesIO()
        buf.write(b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01")
        return buf.getvalue()

    def test_upload_cover_sets_public_url(self, client, authenticated_client):
        event = authenticated_client.post(
            "/api/admin/events", json=_workshop_payload()
        ).json()
        response = authenticated_client.post(
            f"/api/admin/events/{event['id']}/cover",
            files={"file": ("cover.png", self._png(), "image/png")},
        )
        assert response.status_code == 200
        url = response.json()["cover_image_url"]
        assert url and "/events/" in url and url.startswith("http")

        # visible on the public payload (needed for the banner)
        public = client.get(f"/api/events/{event['id']}").json()
        assert public["cover_image_url"] == url

    def test_replace_cover_keeps_single_url(self, client, authenticated_client):
        event = authenticated_client.post(
            "/api/admin/events", json=_workshop_payload()
        ).json()
        first = authenticated_client.post(
            f"/api/admin/events/{event['id']}/cover",
            files={"file": ("a.png", self._png(), "image/png")},
        ).json()
        second = authenticated_client.post(
            f"/api/admin/events/{event['id']}/cover",
            files={"file": ("b.jpg", self._jpeg(), "image/jpeg")},
        ).json()
        assert second["cover_image_url"] != first["cover_image_url"]
        assert second["cover_image_url"].endswith(".jpeg")

    def test_remove_cover_clears_field(self, client, authenticated_client):
        event = authenticated_client.post(
            "/api/admin/events", json=_workshop_payload()
        ).json()
        authenticated_client.post(
            f"/api/admin/events/{event['id']}/cover",
            files={"file": ("c.png", self._png(), "image/png")},
        )
        response = authenticated_client.delete(
            f"/api/admin/events/{event['id']}/cover"
        )
        assert response.status_code == 200
        assert response.json()["cover_image_url"] is None

    def test_invalid_type_rejected(self, authenticated_client):
        event = authenticated_client.post(
            "/api/admin/events", json=_workshop_payload()
        ).json()
        response = authenticated_client.post(
            f"/api/admin/events/{event['id']}/cover",
            files={"file": ("x.gif", b"GIF89a", "image/gif")},
        )
        assert response.status_code == 400

    def test_oversized_rejected(self, authenticated_client, monkeypatch):
        from app.services import events as events_service

        monkeypatch.setattr(events_service, "MAX_IMAGE_SIZE_BYTES", 10)
        event = authenticated_client.post(
            "/api/admin/events", json=_workshop_payload()
        ).json()
        response = authenticated_client.post(
            f"/api/admin/events/{event['id']}/cover",
            files={"file": ("big.png", self._png(500), "image/png")},
        )
        assert response.status_code == 400

    def test_upload_requires_authentication(self, client):
        response = client.post(
            f"/api/admin/events/{uuid.uuid4()}/cover",
            files={"file": ("c.png", b"x", "image/png")},
        )
        assert response.status_code == 401
