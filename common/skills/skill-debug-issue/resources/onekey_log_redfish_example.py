import json
import os
import ssl
import sys
import time
import urllib.error
import urllib.request


ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

HOST = os.environ.get("BMC_HOST", "")
USER = os.environ.get("BMC_REDFISH_USER", "")
PASS = os.environ.get("BMC_REDFISH_PASS", "")
SAVE_PATH = os.environ.get("BMC_ONEKEY_SAVE_PATH", "/tmp/bmc_onekey_log.zip")

if not (HOST and USER and PASS):
    sys.stderr.write(
        "Missing required env vars: BMC_HOST, BMC_REDFISH_USER, BMC_REDFISH_PASS\n"
    )
    sys.exit(2)


def req(method, url, data=None, extra_headers=None, timeout=30):
    headers = {"Content-Type": "application/json"}
    if extra_headers:
        headers.update(extra_headers)
    request = urllib.request.Request(url, data=data, method=method, headers=headers)
    try:
        with urllib.request.urlopen(request, context=ctx, timeout=timeout) as response:
            return response.status, dict(response.headers), response.read()
    except urllib.error.HTTPError as error:
        return error.code, dict(error.headers), error.read()
    except Exception as error:
        return 0, {}, str(error).encode()


status, headers, body = req(
    "POST",
    f"http://{HOST}/redfish/v1/SessionService/Sessions",
    data=json.dumps({"UserName": USER, "Password": PASS}).encode(),
)
payload = json.loads(body)
token = payload.get("Oem", {}).get("Bytedance", {}).get("X-Auth-Token", "")
session_id = str(payload.get("Id", ""))
print(f"Session created: id={session_id}, token={token[:20]}...")
auth = {"X-Auth-Token": token}

status, _, body = req(
    "POST",
    f"http://{HOST}/redfish/v1/Managers/0/LogServices/Actions/Oem/Bytedance/CollectAllLog",
    data=b"{}",
    extra_headers=auth,
)
print(f"Trigger collect: {status}, {body.decode(errors='replace')[:100]}")

print("等待收集完成...")
for index in range(30):
    time.sleep(10)
    status, _, body = req(
        "GET",
        f"http://{HOST}/redfish/v1/Managers/0/LogServices/Actions/Oem/Bytedance/CollectAllLog.Status",
        extra_headers=auth,
    )
    try:
        status_value = json.loads(body).get("Status", -1)
    except Exception:
        status_value = -1
    print(f"  [{(index + 1) * 10}s] Status={status_value}")
    if status_value == 0:
        print("收集完成")
        break

print("等待 web service 恢复...")
for _ in range(30):
    status, _, _ = req("GET", f"http://{HOST}/redfish/v1/")
    if status == 200:
        break
    time.sleep(5)

status, headers, body = req(
    "POST",
    f"http://{HOST}/redfish/v1/SessionService/Sessions",
    data=json.dumps({"UserName": USER, "Password": PASS}).encode(),
)
payload = json.loads(body)
token = payload.get("Oem", {}).get("Bytedance", {}).get("X-Auth-Token", "")
session_id = str(payload.get("Id", ""))
auth = {"X-Auth-Token": token}

status, _, body = req(
    "POST",
    f"http://{HOST}/redfish/v1/Managers/0/LogServices/Actions/Oem/Bytedance/DownloadAllLog",
    data=b"{}",
    extra_headers=auth,
    timeout=60,
)
print(f"下载: status={status}, size={len(body)} bytes")
if len(body) > 5000:
    with open(SAVE_PATH, "wb") as output_file:
        output_file.write(body)
    print(f"已保存: {SAVE_PATH}")
else:
    print(f"下载失败: {body.decode(errors='replace')[:200]}")

req(
    "DELETE",
    f"http://{HOST}/redfish/v1/SessionService/Sessions/{session_id}",
    extra_headers=auth,
)
print("Session 已删除")