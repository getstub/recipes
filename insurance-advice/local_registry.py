"""Run the real registry logic locally so the recipe verifies with no network.

Starts a small HTTP server backed by the actual registry.js via Node, and
points the client at it. That way what the tests prove here is what the
deployed Worker does, rather than a Python reimplementation of it.
"""
import json, os, subprocess, tempfile, threading, time
from http.server import BaseHTTPRequestHandler, HTTPServer

BACKEND = "/home/claude/stub/backend"


class _Handler(BaseHTTPRequestHandler):
    registry_proc = None

    def log_message(self, *a):
        pass

    def do_POST(self):
        n = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(n).decode()
        out = _call_node(self.path, body)
        self._send(out)

    def do_GET(self):
        out = _call_node(self.path, None)
        self._send(out)

    def _send(self, obj):
        data = json.dumps(obj).encode()
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)


_STATE = {"db": None}


def _call_node(path, body):
    """One Node process per call, sharing a sqlite file so state persists."""
    script = f"""
import {{ Registry }} from '{BACKEND}/registry.js';
import {{ makeLocalDb }} from '{BACKEND}/local-db.js';
import fs from 'fs';
const db = makeLocalDb('{_STATE["db"]}');
const wkRaw = fs.existsSync('{_STATE["db"]}.key')
  ? JSON.parse(fs.readFileSync('{_STATE["db"]}.key','utf8')) : null;
let wk;
if (wkRaw) {{
  wk = await crypto.subtle.importKey('jwk', wkRaw, {{name:'Ed25519'}}, true, ['sign']);
}} else {{
  const kp = await crypto.subtle.generateKey({{name:'Ed25519'}}, true, ['sign','verify']);
  const jwk = await crypto.subtle.exportKey('jwk', kp.privateKey);
  fs.writeFileSync('{_STATE["db"]}.key', JSON.stringify(jwk));
  wk = kp.privateKey;
}}
const reg = new Registry(db, wk);
const path = {json.dumps(path)};
const body = {json.dumps(body) if body else 'null'};
let out;
if (path === '/register') out = await reg.registerOperator(JSON.parse(body));
else if (path === '/issue') out = await reg.issue(JSON.parse(body));
else if (path.startsWith('/resolve/') || path.startsWith('/check/')) out = await reg.resolve(path.split('/').pop());
else out = {{ ok: true }};
console.log(JSON.stringify(out));
"""
    with tempfile.NamedTemporaryFile("w", suffix=".mjs", delete=False) as f:
        f.write(script)
        p = f.name
    try:
        r = subprocess.run(["node", p], capture_output=True, text=True, timeout=30)
        line = r.stdout.strip().splitlines()[-1]
        return json.loads(line)
    finally:
        os.unlink(p)


def start(port=8799):
    _STATE["db"] = tempfile.mktemp(suffix=".sqlite")
    srv = HTTPServer(("127.0.0.1", port), _Handler)
    t = threading.Thread(target=srv.serve_forever, daemon=True)
    t.start()
    time.sleep(0.2)
    return srv, f"http://127.0.0.1:{port}"


def stop(srv):
    srv.shutdown()
    for suffix in ("", ".key"):
        try:
            os.unlink(_STATE["db"] + suffix)
        except Exception:
            pass
