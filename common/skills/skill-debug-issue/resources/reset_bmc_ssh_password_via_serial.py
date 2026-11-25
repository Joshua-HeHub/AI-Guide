#!/usr/bin/env python3

import argparse
import base64
import json
import re
import sys
from textwrap import dedent

import pexpect


STORAGE_PROMPT = r"storage@[^\n]*\$ "


def parse_args():
    parser = argparse.ArgumentParser(
        description="通过串口服务器登录 BMC，并把目标 SSH 用户密码重置为指定值（需显式传参，无硬编码默认凭据/旧机台 IP）。"
    )
    parser.add_argument("--serial-host", required=True)
    parser.add_argument("--serial-user", required=True)
    parser.add_argument("--serial-password", required=True)
    parser.add_argument("--serial-device", required=True)
    parser.add_argument("--bmc-serial-user", required=True)
    parser.add_argument("--bmc-serial-password", required=True)
    parser.add_argument("--target-user", default="sysadmin")
    parser.add_argument("--new-password", required=True)
    parser.add_argument("--verify-ssh-host", default="")
    parser.add_argument("--verify-ssh-user", default="sysadmin")
    parser.add_argument("--verify-ssh-password", default="")
    parser.add_argument("--verify-ssh-command", default="id")
    parser.add_argument("--skip-ssh-verify", action="store_true")
    parser.add_argument("--preserve-capture", action="store_true")
    parser.add_argument("--capture-path", default="")
    parser.add_argument("--ssh-timeout", type=int, default=30)
    parser.add_argument("--serial-timeout", type=int, default=120)
    parser.add_argument("--debug", action="store_true")
    args = parser.parse_args()
    if not args.skip_ssh_verify and not (args.verify_ssh_host and args.verify_ssh_password):
        parser.error("--verify-ssh-host and --verify-ssh-password are required unless --skip-ssh-verify is set")
    return args


def spawn_ssh(args):
    command = (
        "ssh -tt -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null "
        + "{}@{}".format(args.serial_user, args.serial_host)
    )
    child = pexpect.spawn(command, encoding="utf-8", timeout=args.ssh_timeout)
    if args.debug:
        child.logfile_read = sys.stdout

    while True:
        index = child.expect(
            [r"[Pp]assword:", r"Are you sure you want to continue connecting", STORAGE_PROMPT]
        )
        if index == 0:
            child.sendline(args.serial_password)
        elif index == 1:
            child.sendline("yes")
        else:
            break

    child.sendline("stty cols 200 rows 40")
    child.expect(STORAGE_PROMPT)
    return child


def run_remote_script(child, args):
    remote_config = {
        "serial_device": args.serial_device,
        "bmc_serial_user": args.bmc_serial_user,
        "bmc_serial_password": args.bmc_serial_password,
        "target_user": args.target_user,
        "new_password": args.new_password,
        "preserve_capture": args.preserve_capture,
        "capture_path": args.capture_path,
    }
    config_b64 = base64.b64encode(json.dumps(remote_config).encode("utf-8")).decode("ascii")
    remote_script = dedent(
        """
        import base64
        import datetime as dt
        import json
        import os
        import select
        import shlex
        import signal
        import subprocess
        import sys
        import termios
        import time

        config = json.loads(base64.b64decode(__CONFIG_B64__).decode("utf-8"))
        device = config["serial_device"]
        capture_path = config["capture_path"]
        if not capture_path:
            capture_path = "/tmp/bmc_serial_%s.cap" % dt.datetime.now().strftime("%%Y%%m%%d")

        def marker(name, value=""):
            print("COPILOT_%s=%s" % (name, value), flush=True)

        def shell(command):
            return subprocess.run(
                ["bash", "-lc", command],
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                universal_newlines=True,
                check=False,
            ).stdout

        def find_capture_holders():
            output = shell(
                "ps -eo pid=,args= | grep -E 'cat /dev/ttyUSB[0-9]+$' | grep -v grep"
            )
            holders = []
            for line in output.splitlines():
                line = line.strip()
                if not line:
                    continue
                parts = line.split(None, 1)
                if len(parts) != 2:
                    continue
                pid_text, command = parts
                try:
                    pid = int(pid_text)
                except ValueError:
                    continue
                if command.endswith(device):
                    holders.append((pid, command))
            return holders

        holders = find_capture_holders()
        if holders and not config["preserve_capture"]:
            for pid, _ in holders:
                try:
                    os.kill(pid, signal.SIGTERM)
                except ProcessLookupError:
                    pass
            time.sleep(1)
        marker("KILLED_HOLDERS", ",".join(str(pid) for pid, _ in holders) or "none")

        fd = os.open(device, os.O_RDWR | os.O_NOCTTY | os.O_NONBLOCK)
        attrs = termios.tcgetattr(fd)
        attrs[0] = 0
        attrs[1] = 0
        attrs[2] = attrs[2] | termios.CLOCAL | termios.CREAD | termios.CS8
        attrs[3] = 0
        attrs[4] = termios.B115200
        attrs[5] = termios.B115200
        termios.tcsetattr(fd, termios.TCSANOW, attrs)

        def read_for(seconds):
            data = []
            end = time.time() + seconds
            while time.time() < end:
                ready, _, _ = select.select([fd], [], [], 0.2)
                if fd not in ready:
                    continue
                try:
                    chunk = os.read(fd, 4096)
                except BlockingIOError:
                    continue
                if chunk:
                    data.append(chunk)
            return b"".join(data)

        def wait_for(tokens, timeout):
            buffer = b""
            end = time.time() + timeout
            lowered = [token.lower() for token in tokens]
            while time.time() < end:
                chunk = read_for(0.5)
                if chunk:
                    sys.stdout.write(chunk.decode("utf-8", "replace"))
                    sys.stdout.flush()
                    buffer += chunk
                    lower_buffer = buffer.lower()
                    if any(token in lower_buffer for token in lowered):
                        return buffer
            return buffer

        def send(text, delay=0.8):
            os.write(fd, text.encode("utf-8"))
            time.sleep(delay)

        marker("STEP", "serial_probe")
        send("\\003\\r\\r", 1.0)
        state = wait_for([b"login:", b"password:", b"~ #", b"# "], 8)
        if b"password:" in state.lower() and b"login:" not in state.lower() and b"#" not in state:
            send("\\003\\r\\r", 1.0)
            state = wait_for([b"login:", b"~ #", b"# "], 8)

        if b"login:" in state.lower():
            marker("STEP", "serial_login")
            send(config["bmc_serial_user"] + "\\r", 0.8)
            prompt = wait_for([b"password:"], 8)
            if b"password:" not in prompt.lower():
                marker("STATUS", "FAIL")
                marker("ERROR", "serial_login_missing_password_prompt")
                os.close(fd)
                raise SystemExit(2)
            send(config["bmc_serial_password"] + "\\r", 1.2)
            state = wait_for([b"~ #", b"# ", b"login incorrect", b"login:"], 10)

        if b"login incorrect" in state.lower() or b"login:" in state.lower() and b"#" not in state:
            marker("STATUS", "FAIL")
            marker("ERROR", "serial_login_failed")
            os.close(fd)
            raise SystemExit(3)

        marker("STEP", "verify_shell")
        send("id\\r", 0.8)
        identity = wait_for([b"uid="], 5)
        if b"uid=" not in identity.lower():
            marker("STATUS", "FAIL")
            marker("ERROR", "serial_shell_not_ready")
            os.close(fd)
            raise SystemExit(4)

        marker("STEP", "passwd_start")
        send("passwd %s\\r" % config["target_user"], 0.8)
        prompt = wait_for([b"new password:", b"new unix password:", b"password:"], 8)
        lower_prompt = prompt.lower()
        if b"new password:" in lower_prompt or b"new unix password:" in lower_prompt:
            send(config["new_password"] + "\\r", 0.8)
        elif b"password:" in lower_prompt:
            send(config["new_password"] + "\\r", 0.8)
            prompt = wait_for([b"new password:", b"new unix password:"], 8)
            lower_prompt = prompt.lower()
            if b"new password:" not in lower_prompt and b"new unix password:" not in lower_prompt:
                marker("STATUS", "FAIL")
                marker("ERROR", "passwd_prompt_unexpected")
                os.close(fd)
                raise SystemExit(5)
            send(config["new_password"] + "\\r", 0.8)
        else:
            marker("STATUS", "FAIL")
            marker("ERROR", "missing_new_password_prompt")
            os.close(fd)
            raise SystemExit(6)

        retype = wait_for([b"retype password:", b"retype new password:", b"re-enter new password:"], 8)
        if not any(token in retype.lower() for token in [b"retype password:", b"retype new password:", b"re-enter new password:"]):
            marker("STATUS", "FAIL")
            marker("ERROR", "missing_retype_prompt")
            os.close(fd)
            raise SystemExit(7)

        marker("STEP", "passwd_commit")
        send(config["new_password"] + "\\r", 1.2)
        result = wait_for([b"changed by", b"updated successfully", b"authentication token manipulation error", b"bad password", b"# "], 10)
        lower_result = result.lower()
        if b"changed by" not in lower_result and b"updated successfully" not in lower_result:
            marker("STATUS", "FAIL")
            marker("ERROR", "passwd_update_failed")
            os.close(fd)
            raise SystemExit(8)

        marker("STEP", "verify_shell_after_passwd")
        send("id\\r", 0.8)
        wait_for([b"uid="], 5)
        os.close(fd)

        if holders and not config["preserve_capture"]:
            marker("STEP", "restart_capture")
            shell(
                "nohup sh -c %s >/dev/null 2>&1 &"
                % shlex.quote("cat %s >> %s" % (device, capture_path))
            )
            marker("CAPTURE_RESTARTED", capture_path)
        else:
            marker("CAPTURE_RESTARTED", "no")

        marker("STEP", "done")
        marker("STATUS", "OK")
        """
    ).replace("__CONFIG_B64__", repr(config_b64))

    payload = base64.b64encode(remote_script.encode("utf-8")).decode("ascii")
    wrapper = (
        "python3 -c \"import base64; code = base64.b64decode({payload!r}).decode('utf-8'); "
        "exec(compile(code, '<copilot-serial-reset>', 'exec'), {{}})\"; "
        "echo COPILOT_REMOTE_DONE:$?"
    ).format(payload=payload)

    child.sendline(wrapper.rstrip())
    child.expect(r"COPILOT_REMOTE_DONE:\d+", timeout=args.serial_timeout)
    output = child.before + child.after
    if "COPILOT_STATUS=OK" not in output:
        raise RuntimeError("serial reset failed:\n{}".format(output))
    return output


def verify_ssh(args):
    command = (
        "ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null "
        + "{}@{} {!r}".format(
            args.verify_ssh_user, args.verify_ssh_host, args.verify_ssh_command
        )
    )
    child = pexpect.spawn(command, encoding="utf-8", timeout=args.ssh_timeout)
    if args.debug:
        child.logfile_read = sys.stdout

    while True:
        index = child.expect([r"[Pp]assword:", r"Are you sure you want to continue connecting", pexpect.EOF])
        if index == 0:
            child.sendline(args.verify_ssh_password)
        elif index == 1:
            child.sendline("yes")
        else:
            break

    output = child.before
    child.close()
    if child.exitstatus != 0:
        raise RuntimeError("ssh verify failed:\n{}".format(output))
    return output.strip()


def main():
    args = parse_args()
    child = spawn_ssh(args)
    remote_output = None
    try:
        remote_output = run_remote_script(child, args)
    finally:
        try:
            child.sendline("exit")
            child.expect(pexpect.EOF, timeout=10)
        except Exception:
            child.close(force=True)

    print("=== serial reset summary ===")
    for line in remote_output.splitlines():
        if line.startswith("COPILOT_"):
            print(line)

    if not args.skip_ssh_verify:
        verify_output = verify_ssh(args)
        print("=== ssh verify ===")
        print(verify_output)


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print("ERROR: {}".format(exc), file=sys.stderr)
        sys.exit(1)