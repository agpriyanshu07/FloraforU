"""MCP server exposing Whoop recovery, sleep, strain and workout data."""

from __future__ import annotations

import datetime as dt
import os
import sys
from typing import Any

from mcp.server.mcpserver import MCPServer

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from whoop_client import WhoopAPIError, WhoopAuthError, WhoopClient  # noqa: E402

mcp = MCPServer("whoop")

_client: WhoopClient | None = None


def client() -> WhoopClient:
    global _client
    if _client is None:
        email = os.environ.get("WHOOP_EMAIL")
        password = os.environ.get("WHOOP_PASSWORD")
        if not email or not password:
            raise RuntimeError(
                "WHOOP_EMAIL and WHOOP_PASSWORD must be set in the MCP server's env block."
            )
        _client = WhoopClient(email, password)
    return _client


def _window(days: int) -> tuple[dt.datetime, dt.datetime]:
    end = dt.datetime.now(dt.timezone.utc)
    return end - dt.timedelta(days=days), end


def _cycles(days: int) -> list[dict[str, Any]]:
    start, end = _window(days)
    return client().get_cycles(start, end, limit=max(days + 5, 25))


def _day(cycle: dict[str, Any]) -> str | None:
    return (cycle.get("days") or [None])[0]


@mcp.tool()
def get_profile() -> dict[str, Any]:
    """Return the Whoop account profile: name, email, height, weight and max heart rate."""
    return client().get_profile()


@mcp.tool()
def get_recovery(days: int = 7) -> list[dict[str, Any]]:
    """Recovery scores for the last `days` days (recovery %, HRV, resting heart rate, SpO2)."""
    out = []
    for cycle in _cycles(days):
        recovery = cycle.get("recovery") or {}
        if not recovery:
            continue
        out.append(
            {
                "date": _day(cycle),
                "recovery_score": recovery.get("score"),
                "resting_heart_rate": recovery.get("restingHeartRate"),
                "hrv_rmssd_milli": recovery.get("heartRateVariabilityRmssd"),
                "spo2_percentage": recovery.get("spo2"),
                "skin_temp_celsius": recovery.get("skinTempCelsius"),
                "state": recovery.get("state"),
            }
        )
    return out


@mcp.tool()
def get_sleep(days: int = 7) -> list[dict[str, Any]]:
    """Sleep summaries for the last `days` days: duration, need, efficiency and stage breakdown."""
    out = []
    for cycle in _cycles(days):
        sleep = (cycle.get("sleeps") or [{}])[0]
        if not sleep:
            continue
        out.append(
            {
                "date": _day(cycle),
                "sleep_id": sleep.get("id"),
                "sleep_score": sleep.get("score"),
                "in_bed_minutes": round((sleep.get("inBedDuration") or 0) / 60000),
                "light_sleep_minutes": round((sleep.get("lightSleepDuration") or 0) / 60000),
                "slow_wave_sleep_minutes": round((sleep.get("slowWaveSleepDuration") or 0) / 60000),
                "rem_sleep_minutes": round((sleep.get("remSleepDuration") or 0) / 60000),
                "wake_minutes": round((sleep.get("wakeDuration") or 0) / 60000),
                "sleep_need_minutes": round((sleep.get("sleepNeed") or 0) / 60000),
                "disturbance_count": sleep.get("disturbanceCount"),
                "respiratory_rate": sleep.get("respiratoryRate"),
                "is_nap": sleep.get("isNap"),
            }
        )
    return out


@mcp.tool()
def get_strain(days: int = 7) -> list[dict[str, Any]]:
    """Daily strain, average/max heart rate and calories burned for the last `days` days."""
    out = []
    for cycle in _cycles(days):
        strain = cycle.get("strain") or {}
        out.append(
            {
                "date": _day(cycle),
                "strain_score": strain.get("score"),
                "average_heart_rate": strain.get("averageHeartRate"),
                "max_heart_rate": strain.get("maxHeartRate"),
                "kilojoules": strain.get("kilojoules"),
                "calories": round((strain.get("kilojoules") or 0) / 4.184) or None,
            }
        )
    return out


@mcp.tool()
def get_workouts(days: int = 7) -> list[dict[str, Any]]:
    """Individual workouts recorded in the last `days` days."""
    out = []
    for cycle in _cycles(days):
        for workout in (cycle.get("strain") or {}).get("workouts") or []:
            out.append(
                {
                    "date": _day(cycle),
                    "sport_id": workout.get("sportId"),
                    "start": workout.get("during", {}).get("lower"),
                    "end": workout.get("during", {}).get("upper"),
                    "strain_score": workout.get("score"),
                    "average_heart_rate": workout.get("averageHeartRate"),
                    "max_heart_rate": workout.get("maxHeartRate"),
                    "kilojoules": workout.get("kilojoules"),
                    "zone_durations_milli": workout.get("zones"),
                }
            )
    return out


@mcp.tool()
def get_heart_rate(hours: int = 6, step_seconds: int = 600) -> dict[str, Any]:
    """Heart-rate samples from the last `hours` hours, bucketed every `step_seconds` seconds."""
    end = dt.datetime.now(dt.timezone.utc)
    return client().get_heart_rate(end - dt.timedelta(hours=hours), end, step=step_seconds)


@mcp.tool()
def get_sleep_detail(sleep_id: int) -> dict[str, Any]:
    """Full detail for one sleep, by the `sleep_id` returned from get_sleep."""
    return client().get_sleep(sleep_id)


def main() -> None:
    try:
        mcp.run()
    except (WhoopAuthError, WhoopAPIError) as exc:
        print(f"whoop mcp server: {exc}", file=sys.stderr)
        raise SystemExit(1) from exc


if __name__ == "__main__":
    main()
