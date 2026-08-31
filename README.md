# FloraforU

An MCP server that exposes your [Whoop](https://www.whoop.com/) data — recovery,
sleep, strain, workouts and heart rate — to any MCP client.

## Setup

```bash
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
```

## Configuration

Copy `mcp.example.json` into your MCP client's config and replace
`/path/to/whoop` with the path to this checkout, `command` with the interpreter
that has the dependencies installed (e.g. `/path/to/whoop/.venv/bin/python`),
and the two `env` values with your Whoop login:

```json
{
    "mcpServers": {
        "Whoop": {
            "command": "python",
            "args": ["/path/to/whoop/src/whoop_server.py"],
            "cwd": "/path/to/whoop",
            "env": {
                "WHOOP_EMAIL": "your.email@example.com",
                "WHOOP_PASSWORD": "your_password"
            }
        }
    }
}
```

Your credentials live only in that config file and are sent only to Whoop.
Because the file holds a plaintext password, keep it out of version control.

## Tools

| Tool | What it returns |
| --- | --- |
| `get_profile` | Account profile: name, email, height, weight, max heart rate |
| `get_recovery(days=7)` | Daily recovery score, resting heart rate, HRV, SpO2, skin temp |
| `get_sleep(days=7)` | Sleep score, time in bed, stage breakdown, sleep need, disturbances |
| `get_strain(days=7)` | Daily strain, average/max heart rate, kilojoules and calories |
| `get_workouts(days=7)` | Per-workout strain, heart rate, duration and zone times |
| `get_heart_rate(hours=6, step_seconds=600)` | Recent heart-rate samples |
| `get_sleep_detail(sleep_id)` | Full record for one sleep, by id from `get_sleep` |

## How it talks to Whoop

Whoop's public developer API uses OAuth app registration, not a password. Since
this server is configured with an email and password, it authenticates against
`api-7.whoop.com` — the endpoint the Whoop mobile app uses. That API is
undocumented and can change without notice, and the login flow does not work for
accounts with multi-factor authentication enabled.

The session token is fetched on the first tool call and reused until it expires.
