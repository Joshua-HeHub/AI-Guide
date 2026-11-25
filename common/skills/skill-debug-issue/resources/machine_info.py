#!/usr/bin/env python3
"""Read non-sensitive machine identity from a HOST OS."""

import json
import os
import re
import shutil
import socket
import subprocess
import sys


def run(command):
    try:
        result = subprocess.run(
            command,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            timeout=15,
            check=False,
        )
    except (OSError, subprocess.TimeoutExpired) as error:
        return {"returncode": None, "output": str(error)}
    return {"returncode": result.returncode, "output": result.stdout.strip()}


def parse_bmc_ip(output):
    patterns = (
        r"^IP Address\s*:\s*(\S+)",
        r"^IP Address\s*:\s*([0-9.]+)",
    )
    for line in output.splitlines():
        line = line.strip()
        for pattern in patterns:
            match = re.search(pattern, line, re.IGNORECASE)
            if match and match.group(1) not in {"0.0.0.0", "255.255.255.255"}:
                return match.group(1)
    return None


def main():
    result = {
        "hostname": socket.gethostname(),
        "os": {},
        "ipmi": {},
        "bmc": {},
    }

    result["os"]["uname"] = run(["uname", "-a"])["output"]
    result["os"]["ip_addr"] = run(["ip", "-brief", "address"])["output"]

    ipmitool = shutil.which("ipmitool")
    if not ipmitool:
        result["ipmi"]["status"] = "ipmitool_not_found"
    else:
        ipmi = run([ipmitool, "-I", "open", "lan", "print"])
        result["ipmi"]["returncode"] = ipmi["returncode"]
        result["ipmi"]["status"] = "ok" if ipmi["returncode"] == 0 else "failed"
        if ipmi["returncode"] == 0:
            result["bmc"]["ip"] = parse_bmc_ip(ipmi["output"])
            result["bmc"]["lan_summary"] = [
                line for line in ipmi["output"].splitlines()
                if re.match(r"^\s*(IP Address|MAC Address|IP Address Source)\s*:", line, re.I)
            ]
        else:
            result["ipmi"]["error"] = ipmi["output"][-300:]

    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
