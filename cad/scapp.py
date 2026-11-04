#!/usr/bin/env python3
"""Açık SolidCraft uygulamasını (solidcraft --control 7878) MCP köprüsüyle sürer.

python3 cad/scapp.py <araç> '<json argümanlar>'
örn.: python3 cad/scapp.py open '{"path": "C:\\\\Users\\\\eates\\\\Downloads\\\\tren_cad\\\\montaj_kontrol.sc"}'
"""
import json
import os
import subprocess
import sys

CLI = os.environ.get("SOLIDCRAFT_CLI", "/mnt/d/Tools/solidcraft/solidcraft-cli.exe")


class App:
    def __init__(self, port=7878):
        self.p = subprocess.Popen(
            [CLI, "mcp", "--connect", f"127.0.0.1:{port}", "--allow-path", r"C:\Users\eates\Downloads"],
            stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, text=True)
        self.n = 0
        self._rpc("initialize", {"protocolVersion": "2024-11-05", "capabilities": {},
                                 "clientInfo": {"name": "tren", "version": "1"}})
        self._send({"jsonrpc": "2.0", "method": "notifications/initialized"})

    def _send(self, msg):
        self.p.stdin.write(json.dumps(msg) + "\n")
        self.p.stdin.flush()

    def _rpc(self, method, params):
        self.n += 1
        self._send({"jsonrpc": "2.0", "id": self.n, "method": method, "params": params})
        while True:
            line = self.p.stdout.readline()
            if not line:
                raise RuntimeError("MCP köprüsü kapandı")
            msg = json.loads(line)
            if msg.get("id") == self.n:
                if "error" in msg:
                    raise RuntimeError(msg["error"])
                return msg["result"]

    def call(self, tool, **args):
        r = self._rpc("tools/call", {"name": tool, "arguments": args})
        texts = [c.get("text", "") for c in r.get("content", []) if c.get("type") == "text"]
        out = "\n".join(texts)
        if r.get("isError"):
            raise RuntimeError(out)
        try:
            return json.loads(out)
        except ValueError:
            return out

    def close(self):
        self.p.stdin.close()
        self.p.wait(timeout=10)


if __name__ == "__main__":
    a = App()
    try:
        res = a.call(sys.argv[1], **(json.loads(sys.argv[2]) if len(sys.argv) > 2 else {}))
        print(json.dumps(res, ensure_ascii=False, indent=1)[:8000])
    finally:
        a.close()
