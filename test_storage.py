import os
import firebase_admin
from firebase_admin import credentials, storage
import json

def test():
    service_account = os.environ.get('FIREBASE_SERVICE_ACCOUNT_JSON')
    bucket_name = os.environ.get('VITE_FIREBASE_STORAGE_BUCKET')

    print(f"Bucket Name from ENV: {bucket_name}")

    if not service_account:
        print("Error: FIREBASE_SERVICE_ACCOUNT_JSON not found in ENV")
        return

    try:
        cred_dict = json.loads(service_account)
        cred = credentials.Certificate(cred_dict)
        firebase_admin.initialize_app(cred, {
            'storageBucket': bucket_name
        })

        bucket = storage.bucket()
        print(f"Connected to bucket: {bucket.name}")

        blob = bucket.blob("test_connection.txt")
        blob.upload_from_string("PulseEarn Storage Audit Test", content_type="text/plain")
        print("Upload successful")

        url = blob.generate_signed_url(expiration=3600)
        print(f"Signed URL: {url}")

        # blob.delete()
        # print("Cleanup successful")

    except Exception as e:
        print(f"Test failed: {e}")

if __name__ == "__main__":
    test()
