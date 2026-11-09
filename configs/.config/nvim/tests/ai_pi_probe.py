#!/usr/bin/env python3
"""Model-free feasibility probe for the installed Pi CLI's resource controls."""
from __future__ import annotations

import argparse
import json
import os
import pty
import queue
import select
import signal
from collections import deque
import shutil
import subprocess
import sys
import tempfile
import threading
import time
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
FIXTURE_EXTENSION = ROOT / "tests" / "fixtures" / "ai_pi_probe.ts"
COMPANION_EXTENSION = ROOT / "lua" / "ai" / "pi-extension" / "index.ts"
MODE_PROMPTS: dict[str, str] = {}
MODE_TOOLS: dict[str, set[str]] = {}
RESOURCE_FLAGS = {
    "--no-extensions",
    "--no-mcp",
    "--no-skills",
    "--no-prompt-templates",
    "--no-themes",
    "--no-context-files",
}
SENTINEL = "NVIM_PI_PROBE_SENTINEL_7F91C4"


class ProbeFailure(RuntimeError):
    pass


class RpcProcess:
    def __init__(self, argv: list[str], cwd: Path, env: dict[str, str], timeout: int):
        self.timeout = timeout
        self.records: queue.Queue[dict[str, Any] | str | None] = queue.Queue()
        self.recent_records: deque[str] = deque(maxlen=8)
        self.status_events: list[tuple[int, str, str]] = []
        self.status_sequence = 0
        self.status_lock = threading.Lock()
        self.last_capability_status: dict[str, Any] | None = None
        self.stderr_parts: list[bytes] = []
        self.stderr_lock = threading.Lock()
        try:
            self.proc = subprocess.Popen(
                argv,
                cwd=str(cwd),
                env=env,
                stdin=subprocess.PIPE,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                bufsize=0,
            )
        except OSError as exc:
            raise ProbeFailure(f"could not start installed Pi executable (OS error {exc.errno})") from None
        threading.Thread(target=self._read_stdout, daemon=True).start()
        threading.Thread(target=self._read_stderr, daemon=True).start()
        self.counter = 0

    def _read_stdout(self) -> None:
        assert self.proc.stdout is not None
        while True:
            line = self.proc.stdout.readline()
            if not line:
                self.records.put(None)
                return
            try:
                record = json.loads(line.decode("utf-8"))
                if not isinstance(record, dict):
                    raise ValueError("RPC record is not an object")
                summary = ":".join(str(record.get(key, "")) for key in ("type", "command", "method", "success"))
                self.recent_records.append(summary)
                if record.get("type") == "extension_ui_request" and record.get("method") == "setStatus":
                    key, value = record.get("statusKey"), record.get("statusText")
                    if isinstance(key, str) and isinstance(value, str):
                        with self.status_lock:
                            self.status_sequence += 1
                            self.status_events.append((self.status_sequence, key, value))
                self.records.put(record)
            except (UnicodeDecodeError, json.JSONDecodeError, ValueError):
                self.records.put("invalid RPC output record")

    def _read_stderr(self) -> None:
        assert self.proc.stderr is not None
        while True:
            chunk = self.proc.stderr.read(4096)
            if not chunk:
                return
            with self.stderr_lock:
                self.stderr_parts.append(chunk)
                if sum(map(len, self.stderr_parts)) > 65536:
                    self.stderr_parts[:] = [b"".join(self.stderr_parts)[-32768:]]

    def stderr_text(self) -> str:
        with self.stderr_lock:
            return b"".join(self.stderr_parts).decode("utf-8", errors="replace").lower()

    def command(self, command: dict[str, Any]) -> dict[str, Any]:
        if self.proc.poll() is not None:
            raise ProbeFailure(f"Pi exited before RPC command (exit {self.proc.returncode})")
        self.counter += 1
        request_id = f"nvim-pi-probe-{self.counter}"
        command = dict(command)
        command["id"] = request_id
        assert self.proc.stdin is not None
        try:
            self.proc.stdin.write((json.dumps(command, ensure_ascii=False) + "\n").encode("utf-8"))
            self.proc.stdin.flush()
        except (BrokenPipeError, OSError):
            raise ProbeFailure("Pi RPC input closed unexpectedly") from None
        deadline = time.monotonic() + self.timeout
        while time.monotonic() < deadline:
            try:
                record = self.records.get(timeout=min(0.25, max(0.01, deadline - time.monotonic())))
            except queue.Empty:
                if self.proc.poll() is not None:
                    raise ProbeFailure(f"Pi exited before RPC response (exit {self.proc.returncode})")
                continue
            if record is None:
                recent = ",".join(self.recent_records) or "no-records"
                raise ProbeFailure(f"Pi closed RPC output during {command.get('type')} (exit {self.proc.poll()}, records={recent})")
            if isinstance(record, str):
                raise ProbeFailure(record)
            if record.get("type") == "response" and record.get("id") == request_id:
                if not record.get("success"):
                    raise ProbeFailure(f"Pi RPC command {command.get('type')} was rejected")
                return record
        raise ProbeFailure(f"Pi RPC command {command.get('type')} timed out")

    def get_commands(self) -> list[dict[str, Any]]:
        data = self.command({"type": "get_commands"}).get("data") or {}
        commands = data.get("commands")
        if not isinstance(commands, list):
            raise ProbeFailure("Pi returned no command list")
        return commands

    def require_probe_and_capture(self, stage: str) -> dict[str, Any]:
        commands = self.get_commands()
        if not any(item.get("name") == "nvim_probe" for item in commands if isinstance(item, dict)):
            raise ProbeFailure("fixture command nvim_probe is not registered")
        response = self.command({"type": "prompt", "message": f"/nvim_probe {stage}"})
        data = response.get("data") or {}
        if data.get("disposition") != "handled":
            raise ProbeFailure("fixture command was not acknowledged as handled")
        return response

    def wait_for_status(self, key: str, after_sequence: int, stage: str, timeout: float | None = None) -> dict[str, Any]:
        deadline = time.monotonic() + (self.timeout if timeout is None else timeout)
        while time.monotonic() < deadline:
            with self.status_lock:
                fresh = [value for sequence, status_key, value in self.status_events
                         if sequence > after_sequence and status_key == key]
            if fresh:
                try:
                    status = json.loads(fresh[-1])
                except json.JSONDecodeError:
                    raise ProbeFailure(f"{stage}: fresh production capability status was malformed") from None
                if not isinstance(status, dict):
                    raise ProbeFailure(f"{stage}: fresh production capability status was malformed")
                return status
            if self.proc.poll() is not None:
                raise ProbeFailure(f"{stage}: Pi exited before a fresh production capability status")
            time.sleep(0.01)
        raise ProbeFailure(f"{stage}: no fresh production capability status followed the handled command")

    def require_production_capability(
        self, mode: str, stage: str, *, status_timeout: float | None = None,
    ) -> dict[str, Any]:
        commands = self.get_commands()
        if not any(item.get("name") == "nvim_ai_capabilities" for item in commands if isinstance(item, dict)):
            raise ProbeFailure(f"{mode} {stage}: production capability command is not registered")
        with self.status_lock:
            status_before = self.status_sequence
        response = self.command({"type": "prompt", "message": "/nvim_ai_capabilities"})
        if (response.get("data") or {}).get("disposition") != "handled":
            raise ProbeFailure(f"{mode} {stage}: production capability command was not acknowledged as handled")
        status = self.wait_for_status("nvim-ai-capabilities", status_before,
                                      f"{mode} {stage}", status_timeout)
        self.last_capability_status = status
        if status.get("tools") != sorted(MODE_TOOLS[mode]):
            raise ProbeFailure(f"{mode} {stage}: production capability status differs from the exact mode tool set")
        return status

    def close(self) -> int | None:
        if self.proc.poll() is None:
            try:
                assert self.proc.stdin is not None
                self.proc.stdin.close()
            except OSError:
                pass
            try:
                self.proc.wait(timeout=5)
            except subprocess.TimeoutExpired:
                self.proc.terminate()
                try:
                    self.proc.wait(timeout=2)
                except subprocess.TimeoutExpired:
                    self.proc.kill()
                    self.proc.wait(timeout=2)
        return self.proc.returncode


def write_json(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2) + "\n", encoding="utf-8")


def write_text(path: Path, value: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(value, encoding="utf-8")


def write_sentinel_extension(path: Path, command_name: str, started: Path) -> None:
    write_text(
        path,
        "import { writeFileSync } from 'node:fs';\n"
        f"writeFileSync({json.dumps(str(started))}, 'started\\n');\n"
        "import type { ExtensionAPI } from '@earendil-works/pi-coding-agent';\n"
        "export default function (pi: ExtensionAPI) {\n"
        f"  pi.registerCommand('{command_name}', {{ handler: async () => {{}} }});\n"
        "}\n",
    )


def write_once_then_missing_status_extension(path: Path) -> None:
    write_text(
        path,
        "import type { ExtensionAPI } from '@earendil-works/pi-coding-agent';\n"
        "export default function (pi: ExtensionAPI) {\n"
        "  let calls = 0;\n"
        "  pi.registerCommand('nvim_ai_capabilities', { handler: async (_args, ctx) => {\n"
        "    calls += 1;\n"
        "    if (calls === 1) ctx.ui.setStatus('nvim-ai-capabilities', JSON.stringify({ tools: [...pi.getActiveTools()].sort() }));\n"
        "  }});\n"
        "}\n",
    )


def write_mcp_fixture(path: Path, started: Path) -> None:
    source = '''import json, pathlib, sys
started = pathlib.Path(sys.argv[1])
started.write_text("started\\n", encoding="utf-8")
for line in sys.stdin:
    try:
        request = json.loads(line)
    except Exception:
        continue
    method = request.get("method")
    request_id = request.get("id")
    if request_id is None:
        continue
    if method == "initialize":
        result = {"protocolVersion": request.get("params", {}).get("protocolVersion", "2024-11-05"),
                  "capabilities": {"tools": {}},
                  "serverInfo": {"name": "nvim-probe-fixture", "version": "1"}}
    elif method == "tools/list":
        result = {"tools": [{"name": "nvim_probe_mcp_sentinel", "description": "Disposable probe sentinel",
                              "inputSchema": {"type": "object", "properties": {}}}]}
    elif method == "tools/call":
        result = {"content": [{"type": "text", "text": "fixture only"}]}
    else:
        result = {}
    print(json.dumps({"jsonrpc": "2.0", "id": request_id, "result": result}), flush=True)
'''
    write_text(path, source)


def make_fixture(base: Path, pi_path: Path, output: Path) -> dict[str, Path]:
    agent = base / "agent"
    project_parent = base / "ancestor"
    project = project_parent / "project"
    session_dir = agent / "sessions"
    for path in (agent, project, session_dir):
        path.mkdir(parents=True, exist_ok=True)

    # Fake-only model metadata and auth: no provider request or credential command is used.
    write_json(
        agent / "models.json",
        {
            "providers": {
                "nvim-probe-fake": {
                    "baseUrl": "http://127.0.0.1:9/v1",
                    "api": "openai-completions",
                    "apiKey": "nvim-pi-probe-fake-model-key",
                    "models": [
                        {
                            "id": "nvim-pi-probe-fake-model",
                            "name": "Disposable model-free probe",
                            "contextWindow": 32768,
                            "maxTokens": 512,
                            "input": ["text"],
                            "cost": {"input": 0, "output": 0, "cacheRead": 0, "cacheWrite": 0},
                        }
                    ],
                }
            }
        },
    )
    write_json(agent / "auth.json", {"nvim-probe-fake": {"type": "api_key", "key": "nvim-pi-probe-fake-auth"}})

    agent_ext = agent / "extensions" / "nvim_probe_agent_sentinel.ts"
    project_ext = project / ".pi" / "extensions" / "nvim_probe_project_sentinel.ts"
    agent_ext_started = base / "agent-extension-started.txt"
    project_ext_started = base / "project-extension-started.txt"
    write_sentinel_extension(agent_ext, "nvim_probe_agent_sentinel", agent_ext_started)
    write_sentinel_extension(project_ext, "nvim_probe_project_sentinel", project_ext_started)
    write_json(
        agent / "settings.json",
        {
            "cacheWarming": "off",
            "defaultProjectTrust": "never",
            "extensions": ["extensions"],
            "skills": ["skills"],
            "prompts": ["prompts"],
            "themes": ["themes"],
        },
    )
    write_json(
        project / ".pi" / "settings.json",
        {
            "extensions": ["extensions"],
            "skills": ["skills"],
            "prompts": ["prompts"],
            "themes": ["themes"],
        },
    )

    for directory, skill_name, prompt_name in (
        (agent, "nvim_probe_agent_skill", "nvim_probe_agent_template"),
        (project / ".pi", "nvim_probe_project_skill", "nvim_probe_project_template"),
    ):
        write_text(
            directory / "skills" / skill_name / "SKILL.md",
            f"---\nname: {skill_name}\ndescription: Disposable resource sentinel\n---\n\n{SENTINEL} skill\n",
        )
        write_text(
            directory / "prompts" / f"{prompt_name}.md",
            f"---\ndescription: Disposable prompt sentinel\n---\n\n{SENTINEL} template\n",
        )

    theme_source = json.loads((pi_path.parent / "theme" / "dark.json").read_text(encoding="utf-8"))
    for directory, name in ((agent, "nvim_probe_agent_theme"), (project / ".pi", "nvim_probe_project_theme")):
        theme = dict(theme_source)
        theme["name"] = name
        write_json(directory / "themes" / f"{name}.json", theme)

    # Context and prompt discovery fixtures cover agent, project, and ancestor scopes.
    write_text(agent / "AGENTS.md", f"{SENTINEL} agent instructions\n")
    write_text(project_parent / "AGENTS.md", f"{SENTINEL} ancestor instructions\n")
    write_text(project / "CLAUDE.md", f"{SENTINEL} project context\n")
    write_text(agent / "SYSTEM.md", f"{SENTINEL} agent system prompt\n")
    write_text(agent / "APPEND_SYSTEM.md", f"{SENTINEL} agent appended prompt\n")
    write_text(project / ".pi" / "SYSTEM.md", f"{SENTINEL} project system prompt\n")
    write_text(project / ".pi" / "APPEND_SYSTEM.md", f"{SENTINEL} project appended prompt\n")

    mcp_started = base / "mcp-started.txt"
    mcp_script = base / "mcp_fixture.py"
    write_mcp_fixture(mcp_script, mcp_started)
    write_json(
        project / ".pi" / "mcp.json",
        {
            "mcpServers": {
                "nvim_probe": {
                    "command": sys.executable,
                    "args": [str(mcp_script), str(mcp_started)],
                    "exposure": "direct",
                    "timeout": 3,
                }
            }
        },
    )
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text("", encoding="utf-8")
    return {
        "agent": agent,
        "project": project,
        "session_dir": session_dir,
        "output": output,
        "mcp_started": mcp_started,
        "agent_ext_started": agent_ext_started,
        "project_ext_started": project_ext_started,
        "mcp_tool": Path("mcp__nvim_probe__nvim_probe_mcp_sentinel"),
    }


def fixture_env(agent: Path, output: Path, *, capture_themes: bool = False) -> dict[str, str]:
    env = os.environ.copy()
    # The sole Pi production-policy environment override is agent dir; the output is private fixture plumbing.
    env["PI_CODING_AGENT_DIR"] = str(agent)
    env["AI_PI_PROBE_OUTPUT"] = str(output)
    if capture_themes:
        env["AI_PI_PROBE_CAPTURE_THEMES"] = "1"
    return env


def generated_args(fixture: dict[str, Path], mode: str, search: Path) -> list[str]:
    nvim = shutil.which("nvim")
    if not nvim:
        raise ProbeFailure("Neovim executable is not available to generate the installed-Pi argv")
    role = "chat" if mode == "chat" else "cheap"
    output = fixture["agent"].parent / f"generated-{mode}.json"
    env = os.environ.copy()
    env.update(
        {
            "AI_PI_PROBE_ROOT": str(fixture["project"]),
            "AI_PI_PROBE_AGENT_DIR": str(fixture["agent"]),
            "AI_PI_PROBE_ARGV_OUTPUT": str(output),
            "AI_PI_PROBE_MODE": mode,
            "AI_PI_PROBE_ROLE": role,
            "AI_PI_PROBE_SEARCH_EXTENSION": str(search),
            "AI_PI_PROBE_PLUGIN_ROOT": str(ROOT),
            "AI_PI_PROBE_COMPANION_EXTENSION": str(COMPANION_EXTENSION),
        }
    )
    helper = ROOT / "tests" / "fixtures" / "ai_pi_probe_argv.lua"
    try:
        result = subprocess.run(
            [nvim, "--headless", "-u", "NONE", "-l", str(helper)],
            cwd=ROOT,
            env=env,
            stdin=subprocess.DEVNULL,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            timeout=30,
            check=False,
        )
    except (OSError, subprocess.TimeoutExpired):
        raise ProbeFailure("Neovim could not generate the installed-Pi argv") from None
    if result.returncode != 0 or not output.is_file():
        raise ProbeFailure("Neovim session.args failed to generate installed-Pi argv")
    try:
        args = json.loads(output.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        raise ProbeFailure("Neovim generated malformed installed-Pi argv") from None
    if not isinstance(args, list) or not all(isinstance(arg, str) for arg in args):
        raise ProbeFailure("Neovim generated a non-string installed-Pi argv")
    return args


def _take_pairs(args: list[str], flag: str) -> list[str]:
    values: list[str] = []
    index = 0
    while index < len(args):
        if args[index] == flag:
            if index + 1 >= len(args):
                raise ProbeFailure(f"generated argv has a value-less {flag}")
            values.append(args[index + 1])
            del args[index : index + 2]
        else:
            index += 1
    return values


def argv_for(
    pi: Path,
    fixture: dict[str, Path],
    mode: str,
    stage_session: str | None,
    extensions: list[Path],
    search: Path,
    *,
    resource_suppression: bool = True,
    trust_project: bool = False,
    system_prompt: bool = True,
    appended_prompt: bool = True,
) -> list[str]:
    generated = generated_args(fixture, mode, search)
    try:
        MODE_PROMPTS[mode] = generated[generated.index("--system-prompt") + 1]
        MODE_TOOLS[mode] = set(generated[generated.index("--tools") + 1].split(","))
    except (ValueError, IndexError):
        raise ProbeFailure(f"generated argv lacks prompt or tool policy for {mode}") from None

    generated_extensions = _take_pairs(generated, "--extension")
    configured_extensions = []
    if mode == "chat":
        configured_extensions = [str(search), str(COMPANION_EXTENSION)]
    elif mode == "selection":
        configured_extensions = [str(COMPANION_EXTENSION)]
    requested_extensions = [str(path) for path in extensions]
    if sorted(generated_extensions) != sorted(configured_extensions):
        raise ProbeFailure(f"generated argv extension policy differs for {mode}")
    # Negative controls deliberately replace a production local entry or add a broken extension.
    if sorted(requested_extensions) == sorted(configured_extensions):
        requested_extensions = generated_extensions

    if not resource_suppression:
        generated = [arg for arg in generated if arg not in RESOURCE_FLAGS]
    if trust_project:
        generated = ["--approve" if arg == "--no-approve" else arg for arg in generated]
    if not system_prompt:
        _take_pairs(generated, "--system-prompt")
    if not appended_prompt:
        _take_pairs(generated, "--append-system-prompt")

    ephemeral_selection = mode == "selection" and stage_session is None
    if ephemeral_selection:
        if "--no-session" not in generated or "--session" in generated or "--session-id" in generated:
            raise ProbeFailure("production selection argv is not the unmodified --no-session path")
    else:
        for flag in ("--session-id", "--session"):
            _take_pairs(generated, flag)
        generated = [arg for arg in generated if arg != "--no-session"]
        if not isinstance(stage_session, str):
            raise ProbeFailure(f"{mode} lifecycle stage lacks an explicit session identity")
        if stage_session.startswith("nvim-probe-"):
            generated.extend(["--session-id", stage_session])
        else:
            generated.extend(["--session", stage_session])

    if requested_extensions != generated_extensions:
        _take_pairs(generated, "--extension")
    argv = [str(pi), *generated, "--offline"]
    for extension in [FIXTURE_EXTENSION, *requested_extensions]:
        argv.extend(["--extension", str(extension)])
    return argv


def read_snapshots(path: Path) -> list[dict[str, Any]]:
    try:
        return [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]
    except (OSError, json.JSONDecodeError):
        raise ProbeFailure("fixture did not write valid snapshots") from None


def _string_list(value: Any) -> list[str]:
    if not isinstance(value, list):
        return []
    result = []
    for item in value:
        if isinstance(item, str):
            result.append(item)
        elif isinstance(item, dict):
            candidate = item.get("path") or item.get("name")
            if isinstance(candidate, str):
                result.append(candidate)
    return result


def _empty(value: Any) -> bool:
    return value is None or value == "" or value == []


def check_positive_snapshot(snapshot: dict[str, Any], mode: str, stage: str, fixture: dict[str, Path]) -> None:
    if snapshot.get("stage") != stage:
        raise ProbeFailure(f"{mode} {stage}: fixture stage mismatch")
    if snapshot.get("customPrompt") != MODE_PROMPTS[mode]:
        raise ProbeFailure(f"{mode} {stage}: custom prompt was not the exact mode text")
    if not _empty(snapshot.get("appendedText")):
        raise ProbeFailure(f"{mode} {stage}: appended system text was not empty")
    if _string_list(snapshot.get("contextFiles")):
        raise ProbeFailure(f"{mode} {stage}: context resources were loaded")
    if _string_list(snapshot.get("skills")):
        raise ProbeFailure(f"{mode} {stage}: skills were loaded")
    active_tools = set(snapshot.get("activeTools") or [])
    if active_tools != MODE_TOOLS[mode]:
        raise ProbeFailure(f"{mode} {stage}: active tool set differs from exact mode policy")
    names = {item.get("name") for item in snapshot.get("commands", []) if isinstance(item, dict)}
    if "nvim_probe" not in names:
        raise ProbeFailure(f"{mode} {stage}: fixture command disappeared")
    if any("sentinel" in name.lower() or "nvim_probe_" in name.lower() for name in names):
        raise ProbeFailure(f"{mode} {stage}: an automatic sentinel command was exposed")
    if any(fixture[name].exists() for name in ("mcp_started", "agent_ext_started", "project_ext_started")):
        raise ProbeFailure(f"{mode} {stage}: an automatic extension or MCP server executed despite suppression")

def run_lifecycle(pi: Path, search: Path, timeout: int, work: Path, mode: str) -> None:
    base = work / f"positive-{mode}"
    base.mkdir()
    fixture = make_fixture(base, pi, base / "snapshots.jsonl")
    extensions = []
    if mode in ("selection", "chat"):
        extensions.append(COMPANION_EXTENSION)
    if mode == "chat":
        extensions.append(search)

    start_id = None if mode == "selection" else f"nvim-probe-{mode}"
    env = fixture_env(fixture["agent"], fixture["output"])
    argv = argv_for(pi, fixture, mode, start_id, extensions, search)
    if mode == "selection" and "--no-session" not in argv:
        raise ProbeFailure("selection startup did not preserve production --no-session")
    child = RpcProcess(argv, fixture["project"], env, timeout)
    try:
        try:
            child.require_probe_and_capture("startup")
            if mode in ("chat", "selection"):
                child.require_production_capability(mode, "startup")
        except ProbeFailure as exc:
            raise ProbeFailure(f"{mode} startup: {exc}") from None
        startup_session_id = None
        if mode == "selection":
            startup_state = child.command({"type": "get_state"}).get("data") or {}
            startup_session_id = startup_state.get("sessionId")
            if not isinstance(startup_session_id, str) or not startup_session_id or startup_state.get("sessionFile"):
                raise ProbeFailure("selection startup was not an unpersisted --no-session context")
        response = child.command({"type": "new_session"})
        if (response.get("data") or {}).get("cancelled"):
            raise ProbeFailure(f"{mode}: new_session was unexpectedly cancelled")
        try:
            child.require_probe_and_capture("new_session")
            if mode in ("chat", "selection"):
                child.require_production_capability(mode, "new_session")
        except ProbeFailure as exc:
            raise ProbeFailure(f"{mode} new_session: {exc}") from None
        state = child.command({"type": "get_state"}).get("data") or {}
        session_file = state.get("sessionFile")
        session_id = state.get("sessionId")
        if mode == "selection":
            if (not isinstance(session_id, str) or not session_id or session_id == startup_session_id
                    or session_file or (fixture["session_dir"].exists() and any(fixture["session_dir"].iterdir()))):
                raise ProbeFailure("selection new_session did not replace the unpersisted --no-session context")
        else:
            if not isinstance(session_file, str) or not isinstance(session_id, str) or not session_id:
                raise ProbeFailure(f"{mode}: replacement session identity was not returned")
            session_path = Path(session_file)
            if session_path.resolve().parent != fixture["session_dir"].resolve():
                raise ProbeFailure(f"{mode}: session escaped its owned fixture directory")
            # A model-free extension-handled command is not a provider turn, so Pi
            # leaves this new session unmaterialized. Seed only its documented
            # header format in the owned fixture; never send a prompt to create it.
            if not session_path.exists():
                header = {
                    "type": "session",
                    "version": 3,
                    "id": session_id,
                    "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                    "cwd": str(fixture["project"].resolve()),
                }
                session_path.write_text(json.dumps(header) + "\n", encoding="utf-8")
            if not session_path.is_file():
                raise ProbeFailure(f"{mode}: owned replacement session fixture was not materialized")
    finally:
        rc = child.close()
    if rc != 0:
        raise ProbeFailure(f"{mode}: Pi did not exit cleanly after startup/new_session")

    stages = ["startup", "new_session"]
    if mode != "selection":
        resume_args = argv_for(pi, fixture, mode, session_file, extensions, search)
        resumed = RpcProcess(resume_args, fixture["project"], env, timeout)
        try:
            try:
                resumed.require_probe_and_capture("resume")
                if mode == "chat":
                    resumed.require_production_capability(mode, "resume")
            except ProbeFailure as exc:
                raise ProbeFailure(f"{mode} resume: {exc}") from None
            resumed_state = resumed.command({"type": "get_state"}).get("data") or {}
            if Path(resumed_state.get("sessionFile", "")).resolve() != Path(session_file).resolve():
                raise ProbeFailure(f"{mode}: Pi did not resume the replacement session file")
            if resumed_state.get("sessionId") != session_id:
                raise ProbeFailure(f"{mode}: Pi did not resume the replacement session identity")
        finally:
            rc = resumed.close()
        if rc != 0:
            raise ProbeFailure(f"{mode}: Pi did not exit cleanly after resume")
        stages.append("resume")

    snapshots = read_snapshots(fixture["output"])
    if [item.get("stage") for item in snapshots] != stages:
        raise ProbeFailure(f"{mode}: lifecycle snapshot count/order was incomplete")
    for snapshot, stage in zip(snapshots, stages):
        check_positive_snapshot(snapshot, mode, stage, fixture)


def run_system_override_control(pi: Path, search: Path, timeout: int, work: Path) -> None:
    base = work / "control-system-append"
    base.mkdir()
    fixture = make_fixture(base, pi, base / "snapshots.jsonl")
    argv = argv_for(pi, fixture, "edit", "nvim-probe-system-control", [], search, system_prompt=False, appended_prompt=False)
    child = RpcProcess(argv, fixture["project"], fixture_env(fixture["agent"], fixture["output"]), timeout)
    try:
        child.require_probe_and_capture("system_control")
    finally:
        rc = child.close()
    if rc != 0:
        raise ProbeFailure("system/append negative control exited unexpectedly")
    snapshots = read_snapshots(fixture["output"])
    if len(snapshots) != 1:
        raise ProbeFailure("system/append negative control did not write one snapshot")
    snapshot = snapshots[0]
    custom = snapshot.get("customPrompt")
    appended = snapshot.get("appendedText")
    if not isinstance(custom, str) or f"{SENTINEL} agent system prompt" not in custom:
        raise ProbeFailure("system override negative control did not reveal the agent SYSTEM sentinel")
    if not isinstance(appended, str) or f"{SENTINEL} agent appended prompt" not in appended:
        raise ProbeFailure("append override negative control did not reveal the agent APPEND_SYSTEM sentinel")


def resource_snapshot_complete(snapshot: dict[str, Any], fixture: dict[str, Path]) -> bool:
    context_paths = _string_list(snapshot.get("contextFiles"))
    skills = _string_list(snapshot.get("skills"))
    commands = {item.get("name") for item in snapshot.get("commands", []) if isinstance(item, dict)}
    tools = set(snapshot.get("activeTools") or [])
    return (
        any(name.endswith("AGENTS.md") for name in context_paths)
        and any(name.endswith("CLAUDE.md") for name in context_paths)
        and any("nvim_probe_agent_skill" in name for name in skills)
        and any("nvim_probe_project_skill" in name for name in skills)
        and "nvim_probe_agent_sentinel" in commands
        and "nvim_probe_project_sentinel" in commands
        and "nvim_probe_agent_template" in commands
        and "nvim_probe_project_template" in commands
        and str(fixture["mcp_tool"]) in tools
        and fixture["mcp_started"].is_file()
        and fixture["agent_ext_started"].is_file()
        and fixture["project_ext_started"].is_file()
    )


def run_resource_trust_control(pi: Path, search: Path, timeout: int, work: Path) -> None:
    base = work / "control-resources-trust"
    base.mkdir()
    fixture = make_fixture(base, pi, base / "snapshots.jsonl")
    argv = argv_for(pi, fixture, "edit", "nvim-probe-resource-control", [], search, resource_suppression=False, trust_project=True)
    argv[argv.index("--tools") + 1] += f",{fixture['mcp_tool']}"
    child = RpcProcess(argv, fixture["project"], fixture_env(fixture["agent"], fixture["output"]), timeout)
    try:
        commands = child.get_commands()
        if not any(isinstance(item, dict) and item.get("name") == "nvim_probe" for item in commands):
            raise ProbeFailure("resource control fixture command was not registered")
        deadline = time.monotonic() + min(timeout, 15)
        snapshot: dict[str, Any] | None = None
        while time.monotonic() < deadline:
            response = child.command({"type": "prompt", "message": "/nvim_probe resource_control"})
            if (response.get("data") or {}).get("disposition") != "handled":
                raise ProbeFailure("resource control fixture command was not handled")
            rows = read_snapshots(fixture["output"])
            if rows:
                snapshot = rows[-1]
                if resource_snapshot_complete(snapshot, fixture):
                    break
            time.sleep(0.15)
        if snapshot is None or not resource_snapshot_complete(snapshot, fixture):
            raise ProbeFailure("resource/trust negative control did not expose every fixture sentinel")
    finally:
        rc = child.close()
    if rc != 0:
        raise ProbeFailure("resource/trust negative control exited unexpectedly")


def capture_tui_themes(pi: Path, fixture: dict[str, Path], argv: list[str], timeout: int) -> set[str]:
    mode_index = argv.index("--mode")
    del argv[mode_index:mode_index + 2]
    env = fixture_env(fixture["agent"], fixture["output"], capture_themes=True)
    env.setdefault("TERM", "xterm-256color")

    child_pid, terminal = pty.fork()
    if child_pid == 0:
        os.chdir(fixture["project"])
        os.execvpe(str(pi), argv, env)
    child_status: int | None = None
    try:
        deadline = time.monotonic() + min(timeout, 20)
        while time.monotonic() < deadline:
            ready, _, _ = select.select([terminal], [], [], 0.2)
            if ready:
                try:
                    os.read(terminal, 65536)
                except OSError:
                    break
            finished, status = os.waitpid(child_pid, os.WNOHANG)
            if finished:
                child_status = status
                break
            if read_snapshots(fixture["output"]):
                break
        snapshots = read_snapshots(fixture["output"])
        if not snapshots:
            raise ProbeFailure("TUI session_start theme sentinel was not captured")
        names = {item.get("name") for item in snapshots[-1].get("themes", []) if isinstance(item, dict)}

        # This built-in command exits the no-prompt TUI without sending user text to a provider.
        os.write(terminal, b"/quit\r")
        exit_deadline = time.monotonic() + 5
        while time.monotonic() < exit_deadline:
            ready, _, _ = select.select([terminal], [], [], 0.2)
            if ready:
                try:
                    os.read(terminal, 65536)
                except OSError:
                    pass
            finished, status = os.waitpid(child_pid, os.WNOHANG)
            if finished:
                child_status = status
                break
        if child_status is None:
            os.kill(child_pid, signal.SIGTERM)
            _, child_status = os.waitpid(child_pid, 0)
    finally:
        try:
            os.close(terminal)
        except OSError:
            pass
        if child_status is None:
            try:
                finished, _ = os.waitpid(child_pid, os.WNOHANG)
                if not finished:
                    os.kill(child_pid, signal.SIGTERM)
                    os.waitpid(child_pid, 0)
            except ChildProcessError:
                pass
    if not os.WIFEXITED(child_status) or os.WEXITSTATUS(child_status) != 0:
        raise ProbeFailure("TUI theme control did not exit cleanly")
    return {name for name in names if isinstance(name, str)}


def run_theme_resource_control(pi: Path, search: Path, timeout: int, work: Path) -> None:
    base = work / "control-themes-tui"
    base.mkdir()
    fixture = make_fixture(base, pi, base / "snapshots.jsonl")
    argv = argv_for(pi, fixture, "edit", "nvim-probe-theme-control", [], search, resource_suppression=False, trust_project=True)
    names = capture_tui_themes(pi, fixture, argv, timeout)
    expected = {"nvim_probe_agent_theme", "nvim_probe_project_theme"}
    if not expected.issubset(names):
        raise ProbeFailure("theme resource negative control did not reveal both configured themes")


def run_theme_suppression_observation(pi: Path, search: Path, timeout: int, work: Path) -> str:
    base = work / "control-themes-suppressed"
    base.mkdir()
    fixture = make_fixture(base, pi, base / "snapshots.jsonl")
    argv = argv_for(pi, fixture, "edit", "nvim-probe-theme-suppression", [], search, trust_project=True)
    if "--no-themes" not in argv:
        raise ProbeFailure("theme observation was not launched with --no-themes")
    names = capture_tui_themes(pi, fixture, argv, timeout)
    if "nvim_probe_agent_theme" not in names:
        raise ProbeFailure("expected installed-Pi TUI theme-observability limitation changed; revalidate before updating the record")
    return "Pi 1.5.0 TUI still lists the agent theme with --no-themes; RPC getAllThemes() is an empty stub, so RPC theme discovery is unobservable"


def run_missing_entry_control(pi: Path, search: Path, timeout: int, work: Path) -> None:
    base = work / "control-missing-search-entry"
    base.mkdir()
    fixture = make_fixture(base, pi, base / "snapshots.jsonl")
    missing = base / "absent-search-entry.ts"
    argv = argv_for(pi, fixture, "chat", "nvim-probe-missing-search", [COMPANION_EXTENSION, missing], search)
    child = RpcProcess(argv, fixture["project"], fixture_env(fixture["agent"], fixture["output"]), timeout)
    try:
        try:
            child.require_probe_and_capture("missing_search_entry")
        except ProbeFailure:
            rc = child.close()
            deadline = time.monotonic() + 1
            while not child.stderr_text() and time.monotonic() < deadline:
                time.sleep(0.05)
            diagnostics = child.stderr_text()
            if rc == 0 or missing.name.lower() not in diagnostics or "failed to load extension" not in diagnostics:
                raise ProbeFailure("missing search-entry control failed without identifying the missing local path")
            return
        snapshot = read_snapshots(fixture["output"])[-1]
        tools = set(snapshot.get("activeTools") or [])
        if "webfetch" not in tools or "web_search" in tools:
            raise ProbeFailure("missing search-entry control did not fail closed on the search tool")
        diagnostics = child.stderr_text()
        if missing.name.lower() not in diagnostics:
            raise ProbeFailure("missing search-entry control produced no local-entry diagnostic")
    finally:
        child.close()


def run_missing_status_control(pi: Path, search: Path, timeout: int, work: Path) -> None:
    base = work / "control-missing-status"
    base.mkdir()
    fixture = make_fixture(base, pi, base / "snapshots.jsonl")
    once = base / "capability-status-once.ts"
    write_once_then_missing_status_extension(once)
    argv = argv_for(pi, fixture, "chat", "nvim-probe-status-freshness", [search, once], search)
    child = RpcProcess(argv, fixture["project"], fixture_env(fixture["agent"], fixture["output"]), timeout)
    previous_tools = MODE_TOOLS["chat"]
    try:
        child.require_probe_and_capture("status_freshness")
        snapshot = read_snapshots(fixture["output"])[-1]
        observed_tools = set(snapshot.get("activeTools") or [])
        MODE_TOOLS["chat"] = observed_tools
        child.require_production_capability("chat", "first status control")
        try:
            child.require_production_capability("chat", "missing-status control", status_timeout=2)
        except ProbeFailure as exc:
            if "no fresh production capability status" not in str(exc):
                raise ProbeFailure(f"missing-status control was rejected for an unrelated capability error: {exc}") from None
        else:
            raise ProbeFailure("missing-status control reused a previous command's stale status event")
        if len([event for event in child.status_events if event[1] == "nvim-ai-capabilities"]) != 1:
            raise ProbeFailure("missing-status control did not emit exactly one initial status event")
        rc = child.close()
        if rc != 0:
            raise ProbeFailure("missing-status control Pi RPC did not close cleanly")
    finally:
        MODE_TOOLS["chat"] = previous_tools
        child.close()


def run_missing_dependency_control(pi: Path, search: Path, timeout: int, work: Path) -> str:
    base = work / "control-missing-dependency"
    base.mkdir()
    fixture = make_fixture(base, pi, base / "snapshots.jsonl")
    missing_package = "nvim-pi-probe-intentionally-missing-dependency-7f91c4"
    broken_root = base / "selected-pi-web-search"
    broken = broken_root / "src" / "index.ts"
    write_json(broken_root / "package.json", {"name": "pi-web-search", "version": "1.6.0", "pi": {"extensions": ["./src/index.ts"]}})
    write_text(
        broken,
        f"import '{missing_package}';\n"
        "import type { ExtensionAPI } from '@earendil-works/pi-coding-agent';\n"
        "export default function (pi: ExtensionAPI) { pi.registerCommand('nvim_probe_broken_dependency', { handler: async () => {} }); }\n",
    )
    argv = argv_for(pi, fixture, "chat", "nvim-probe-missing-dependency", [COMPANION_EXTENSION, broken], broken)
    child = RpcProcess(argv, fixture["project"], fixture_env(fixture["agent"], fixture["output"]), timeout)
    try:
        try:
            child.require_production_capability("chat", "selected broken search package")
        except ProbeFailure as exc:
            if "Pi closed RPC output during get_commands" in str(exc):
                rc = child.close()
                deadline = time.monotonic() + 1
                while not child.stderr_text() and time.monotonic() < deadline:
                    time.sleep(0.05)
                diagnostics = child.stderr_text()
                if rc == 0 or child.last_capability_status is not None:
                    raise ProbeFailure("broken search package closed RPC without a failing pre-prompt startup") from None
                if missing_package not in diagnostics or not any(term in diagnostics for term in ("cannot find", "not found", "failed")):
                    raise ProbeFailure("broken search package failed before capability status without a local dependency diagnostic") from None
                return "selected broken search package fails closed at startup before the capability handshake with a local dependency diagnostic"
            if "production capability status differs from the exact mode tool set" not in str(exc):
                raise ProbeFailure(f"selected broken package was not rejected by the production capability handshake: {exc}") from None
        else:
            raise ProbeFailure("selected broken package unexpectedly passed the production capability handshake")
        status = child.last_capability_status or {}
        status_tools = set(status.get("tools") or [])
        if "web_search" in status_tools or "webfetch" not in status_tools:
            raise ProbeFailure("selected broken package capability status did not fail closed on web_search")
        try:
            child.require_probe_and_capture("missing_dependency")
        except ProbeFailure:
            rc = child.close()
            deadline = time.monotonic() + 1
            while not child.stderr_text() and time.monotonic() < deadline:
                time.sleep(0.05)
            diagnostics = child.stderr_text()
            if rc == 0 or missing_package not in diagnostics or not any(term in diagnostics for term in ("cannot find", "not found", "failed")):
                raise ProbeFailure("missing dependency control failed without identifying the absent package")
            return "selected broken search package is rejected by the capability handshake with a local dependency diagnostic"
        snapshot = read_snapshots(fixture["output"])[-1]
        names = {item.get("name") for item in snapshot.get("commands", []) if isinstance(item, dict)}
        diagnostics = child.stderr_text()
        if "nvim_probe_broken_dependency" in names:
            raise ProbeFailure("missing dependency control unexpectedly loaded the broken extension")
        if missing_package not in diagnostics or not any(term in diagnostics for term in ("cannot find", "not found", "failed")):
            raise ProbeFailure("missing dependency control produced no dependency-load diagnostic")
        tools = set(snapshot.get("activeTools") or [])
        if "webfetch" not in tools or "web_search" in tools:
            raise ProbeFailure("broken selected search package did not fail closed on web_search while retaining webfetch")
        return "selected broken search package is rejected by the capability handshake with a local dependency diagnostic"
    finally:
        child.close()


def validate_local_search_package(search: Path) -> None:
    if not search.is_absolute() or not search.is_file():
        raise ProbeFailure("local search extension entry is missing; provision the pinned local package before probing")
    package_root = search.parent.parent
    manifest = package_root / "package.json"
    try:
        data = json.loads(manifest.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        raise ProbeFailure("local search package manifest is missing or invalid") from None
    if data.get("name") != "pi-web-search" or data.get("version") != "1.6.0":
        raise ProbeFailure("local search package name/version does not match pi-web-search@1.6.0")
    if search.resolve() != (package_root / "src" / "index.ts").resolve():
        raise ProbeFailure("local search entry is not the package's declared src/index.ts")
    if "./src/index.ts" not in (data.get("pi") or {}).get("extensions", []):
        raise ProbeFailure("local search package manifest does not declare src/index.ts")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--pi", required=True, help="absolute installed Pi executable")
    parser.add_argument("--timeout", type=int, default=60, help="RPC request timeout in seconds")
    parser.add_argument("--search-extension", required=True, help="absolute local pi-web-search entry point")
    args = parser.parse_args()
    pi = Path(args.pi)
    search = Path(args.search_extension)
    if not pi.is_absolute() or not pi.is_file() or not os.access(pi, os.X_OK):
        print("FAIL: --pi must name an executable absolute installed-Pi path", file=sys.stderr)
        return 2
    if args.timeout < 1:
        print("FAIL: --timeout must be positive", file=sys.stderr)
        return 2
    if not FIXTURE_EXTENSION.is_file() or not COMPANION_EXTENSION.is_file():
        print("FAIL: local probe or companion extension entry is missing", file=sys.stderr)
        return 2
    try:
        validate_local_search_package(search)
        with tempfile.TemporaryDirectory(prefix="nvim-ai-pi-probe-") as temp:
            work = Path(temp)
            for mode in ("edit", "question", "selection", "chat"):
                run_lifecycle(pi, search, args.timeout, work, mode)
                lifecycle = "startup, --no-session replacement" if mode == "selection" else "startup, new_session, resume"
                print(f"PASS lifecycle {mode}: {lifecycle}; exact prompt/resources/tools")
            run_system_override_control(pi, search, args.timeout, work)
            print("PASS negative control: removing system/append overrides reveals both prompt sentinels")
            run_resource_trust_control(pi, search, args.timeout, work)
            print("PASS negative control: trusted resources expose context, skills, templates, extension and local MCP sentinels")
            run_theme_resource_control(pi, search, args.timeout, work)
            print("PASS negative control: trusted TUI exposes both configured theme sentinels")
            limitation = run_theme_suppression_observation(pi, search, args.timeout, work)
            print(f"LIMITATION: {limitation}")
            run_missing_entry_control(pi, search, args.timeout, work)
            print("PASS negative control: missing local search entry fails closed with a diagnostic")
            dependency_outcome = run_missing_dependency_control(pi, search, args.timeout, work)
            print(f"PASS negative control: {dependency_outcome}")
            run_missing_status_control(pi, search, args.timeout, work)
            print("PASS negative control: stale capability status cannot satisfy a command without a fresh status event")
    except ProbeFailure as exc:
        # Deliberately report only classified, non-sensitive diagnostics; never print child stderr or environment values.
        print(f"FAIL: {exc}", file=sys.stderr)
        return 1
    except Exception as exc:
        print(f"FAIL: unexpected probe error ({type(exc).__name__})", file=sys.stderr)
        return 1
    print("PASS installed Pi model-free feasibility gate")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
