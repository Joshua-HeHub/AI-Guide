import os
import sys
import time
import pexpect


def connect_bmc_serial():
    serial_host = os.environ.get("SERIAL_HOST", "")
    serial_user = os.environ.get("SERIAL_USER", "")
    serial_pass = os.environ.get("SERIAL_PASS", "")
    serial_dev = os.environ.get("SERIAL_DEV", "")
    bmc_user = os.environ.get("BMC_SERIAL_USER", "")
    bmc_pass = os.environ.get("BMC_SERIAL_PASS", "")
    if not all((serial_host, serial_user, serial_pass, serial_dev, bmc_user, bmc_pass)):
        sys.stderr.write(
            "Set SERIAL_HOST, SERIAL_USER, SERIAL_PASS, SERIAL_DEV, BMC_SERIAL_USER, BMC_SERIAL_PASS\n"
        )
        return None

    ssh_command = (
        f"ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null {serial_user}@{serial_host}"
    )
    child = pexpect.spawn(ssh_command, encoding="utf-8", timeout=30)

    child.expect(r"[Pp]assword:")
    child.sendline(serial_pass)
    child.expect(r"[$#] ")

    child.sendline(f"minicom -o -D {serial_dev}")

    try:
        child.expect(r"Welcome to minicom", timeout=10)
    except Exception:
        child.sendcontrol("c")
        child.sendline(f"screen {serial_dev} 115200")
        try:
            child.expect(r"~ # ", timeout=10)
            return child
        except Exception:
            return None

    time.sleep(2)
    child.sendline("")

    try:
        index = child.expect([r"login:", r"~ # "], timeout=5)
        if index == 0:
            child.sendline(bmc_user)
            child.expect(r"Password:")
            child.sendline(bmc_pass)
            child.expect(r"~ # ")
    except pexpect.TIMEOUT:
        child.sendcontrol("c")
        child.sendline("")
        child.sendline("id")
        try:
            child.expect(r"uid=", timeout=5)
        except Exception:
            return None

    return child


bmc = connect_bmc_serial()
if bmc:
    bmc.sendline("ps | head -5")
    bmc.expect(r"~ # ")

    bmc.sendline("ls /proc/$$/fd | wc -l")
    bmc.expect(r"~ # ")

    bmc.sendline("exit")
    bmc.expect(pexpect.EOF)