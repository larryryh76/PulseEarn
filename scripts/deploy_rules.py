"""
Deploy Firestore + Storage security rules to Firebase using the service-account
credential in FIREBASE_SERVICE_ACCOUNT. Uses the Firebase Rules REST API.
Read-only probe when called with 'probe'; full deploy with 'deploy'.
Never prints secret material.
"""
import os, sys, json, time
import google.auth.transport.requests
from google.oauth2 import service_account
import requests

SCOPES = ["https://www.googleapis.com/auth/firebase", "https://www.googleapis.com/auth/cloud-platform"]

def get_creds():
    raw = os.environ.get("FIREBASE_SERVICE_ACCOUNT")
    if not raw:
        print("NO_CREDS"); sys.exit(2)
    info = json.loads(raw)
    if isinstance(info.get("private_key"), str):
        info["private_key"] = info["private_key"].replace("\\n", "\n")
    return service_account.Credentials.from_service_account_info(info, scopes=SCOPES), info["project_id"]

def token(creds):
    creds.refresh(google.auth.transport.requests.Request())
    return creds.token

def probe(creds, project):
    t = token(creds)
    r = requests.get(f"https://firebaserules.googleapis.com/v1/projects/{project}/rulesets?pageSize=1",
                     headers={"Authorization": f"Bearer {t}"})
    print("PROBE_STATUS", r.status_code)
    print(r.text[:400])
    return r.status_code == 200

def create_ruleset(t, project, files):
    src_files = []
    for name, path in files:
        with open(path) as f:
            src_files.append({"name": name, "content": f.read()})
    body = {"source": {"files": src_files}}
    r = requests.post(f"https://firebaserules.googleapis.com/v1/projects/{project}/rulesets",
                      headers={"Authorization": f"Bearer {t}", "Content-Type": "application/json"},
                      data=json.dumps(body))
    if r.status_code not in (200, 201):
        print("RULESET_CREATE_FAIL", r.status_code, r.text[:500]); return None
    return r.json()["name"]  # projects/<p>/rulesets/<id>

def release(t, project, release_name, ruleset_name):
    # Try update (PATCH) first, fall back to create.
    rn = f"projects/{project}/releases/{release_name}"
    body = {"release": {"name": rn, "rulesetName": ruleset_name}}
    u = requests.patch(f"https://firebaserules.googleapis.com/v1/{rn}",
                       headers={"Authorization": f"Bearer {t}", "Content-Type": "application/json"},
                       data=json.dumps(body))
    if u.status_code == 200:
        print("RELEASE_UPDATED", release_name); return True
    c = requests.post(f"https://firebaserules.googleapis.com/v1/projects/{project}/releases",
                      headers={"Authorization": f"Bearer {t}", "Content-Type": "application/json"},
                      data=json.dumps({"name": rn, "rulesetName": ruleset_name}))
    if c.status_code in (200, 201):
        print("RELEASE_CREATED", release_name); return True
    print("RELEASE_FAIL", release_name, u.status_code, u.text[:300], "|", c.status_code, c.text[:300])
    return False

def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else "probe"
    creds, project = get_creds()
    print("PROJECT", project)
    if mode == "probe":
        probe(creds, project); return
    t = token(creds)
    # Firestore
    fs_rs = create_ruleset(t, project, [("firestore.rules", "firestore.rules")])
    if fs_rs:
        print("FIRESTORE_RULESET", fs_rs.split("/")[-1])
        release(t, project, "cloud.firestore", fs_rs)
    # Storage (release name is firebase.storage/<bucket>)
    bucket = os.environ.get("VITE_FIREBASE_STORAGE_BUCKET") or f"{project}.appspot.com"
    st_rs = create_ruleset(t, project, [("storage.rules", "storage.rules")])
    if st_rs:
        print("STORAGE_RULESET", st_rs.split("/")[-1])
        release(t, project, f"firebase.storage/{bucket}", st_rs)

if __name__ == "__main__":
    main()
