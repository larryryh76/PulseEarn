import os
import json
import firebase_admin
from firebase_admin import credentials, storage

def test_storage():
    service_account_info = os.environ.get('FIREBASE_SERVICE_ACCOUNT_JSON')
    bucket_name = os.environ.get('VITE_FIREBASE_STORAGE_BUCKET') or os.environ.get('FIREBASE_STORAGE_BUCKET')

    print(f"Bucket Name from ENV: {bucket_name}")

    if not service_account_info:
        print("Error: FIREBASE_SERVICE_ACCOUNT_JSON not found in ENV")
        return

    try:
        cred_dict = json.loads(service_account_info)
        cred = credentials.Certificate(cred_dict)
        if not firebase_admin._apps:
            firebase_admin.initialize_app(cred, {'storageBucket': bucket_name})

        bucket = storage.bucket()
        print(f"Testing access to bucket: {bucket.name}")

        if bucket.exists():
            print("SUCCESS: Bucket is accessible")
        else:
            print(f"FAILURE: Bucket {bucket_name} does not exist or is inaccessible")

    except Exception as e:
        print(f"CRITICAL ERROR during test: {str(e)}")

if __name__ == "__main__":
    test_storage()
