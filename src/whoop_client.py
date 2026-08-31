"""Thin client for the Whoop mobile API (api-7.whoop.com).

This is the endpoint the Whoop app itself talks to, so it authenticates with an
email/password pair rather than an OAuth app registration. It is not covered by
Whoop's public developer API contract and can change without notice.
"""

from __future__ import annotations

import datetime as dt
from typing import Any

import httpx

BASE_URL = "https://api-7.whoop.com"
# Whoop rejects requests without a plausible app user-agent.
USER_AGENT = "okhttp/4.9.1"


class WhoopAuthError(RuntimeError):
    """Raised when Whoop rejects the credentials or the session cannot renew."""


class WhoopAPIError(RuntimeError):
    """Raised when Whoop answers a data request with an error status."""


def _iso(value: dt.datetime) -> str:
    if value.tzinfo is None:
        value = value.replace(tzinfo=dt.timezone.utc)
    return value.astimezone(dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z"


class WhoopClient:
    """Logs in once, then reuses the access token until it expires."""

    def __init__(self, email: str, password: str, timeout: float = 30.0) -> None:
        self._email = email
        self._password = password
        self._http = httpx.Client(
            base_url=BASE_URL,
            timeout=timeout,
            headers={"User-Agent": USER_AGENT},
        )
        self._access_token: str | None = None
        self._user_id: int | None = None
        self._expires_at: dt.datetime = dt.datetime.min.replace(tzinfo=dt.timezone.utc)

    # -- auth ---------------------------------------------------------------

    def login(self) -> None:
        response = self._http.post(
            "/oauth/token",
            json={
                "grant_type": "password",
                "issueRefresh": False,
                "password": self._password,
                "username": self._email,
            },
        )
        if response.status_code == 401:
            raise WhoopAuthError(
                "Whoop rejected WHOOP_EMAIL/WHOOP_PASSWORD. Note that accounts with "
                "multi-factor authentication cannot use this login flow."
            )
        if response.status_code >= 400:
            raise WhoopAuthError(f"Whoop login failed ({response.status_code}): {response.text}")

        payload = response.json()
        self._access_token = payload["access_token"]
        self._user_id = payload["user"]["id"]
        # Renew a minute early so an in-flight request never races the expiry.
        lifetime = int(payload.get("expires_in", 3600))
        self._expires_at = dt.datetime.now(dt.timezone.utc) + dt.timedelta(seconds=lifetime - 60)

    def _ensure_session(self) -> None:
        if self._access_token is None or dt.datetime.now(dt.timezone.utc) >= self._expires_at:
            self.login()

    @property
    def user_id(self) -> int:
        self._ensure_session()
        assert self._user_id is not None
        return self._user_id

    # -- requests -----------------------------------------------------------

    def _get(self, path: str, params: dict[str, Any] | None = None) -> Any:
        self._ensure_session()
        response = self._http.get(
            path,
            params=params,
            headers={"Authorization": f"Bearer {self._access_token}"},
        )
        if response.status_code == 401:
            # Token was revoked ahead of its stated expiry; one retry after a fresh login.
            self.login()
            response = self._http.get(
                path,
                params=params,
                headers={"Authorization": f"Bearer {self._access_token}"},
            )
        if response.status_code >= 400:
            raise WhoopAPIError(f"GET {path} failed ({response.status_code}): {response.text}")
        return response.json()

    # -- endpoints ----------------------------------------------------------

    def get_profile(self) -> dict[str, Any]:
        return self._get(f"/users/{self.user_id}")

    def get_cycles(self, start: dt.datetime, end: dt.datetime, limit: int = 25) -> list[dict[str, Any]]:
        """Daily cycles, each carrying that day's strain, recovery and sleep summary."""
        payload = self._get(
            f"/activities-service/v1/cycles/aggregate/range/{self.user_id}",
            params={
                "startTime": _iso(start),
                "endTime": _iso(end),
                "limit": limit,
                "apiVersion": 7,
            },
        )
        return payload if isinstance(payload, list) else payload.get("records", [])

    def get_sleep(self, sleep_id: int) -> dict[str, Any]:
        return self._get(f"/activities-service/v1/sleeps/{sleep_id}")

    def get_heart_rate(
        self, start: dt.datetime, end: dt.datetime, step: int = 600
    ) -> dict[str, Any]:
        """Heart-rate samples; `step` is the bucket size in seconds."""
        return self._get(
            f"/users/{self.user_id}/metrics/heart_rate",
            params={"start": _iso(start), "end": _iso(end), "step": step},
        )

    def close(self) -> None:
        self._http.close()
