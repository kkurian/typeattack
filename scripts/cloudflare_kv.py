#!/usr/bin/env python3
"""
Cloudflare KV API Client
Handles communication with Cloudflare KV storage for queue operations
No external dependencies - uses only standard library
"""

import json
import os
import urllib.request
import urllib.error
from typing import Dict, List, Optional, Any


class CloudflareKV:
    """Client for Cloudflare KV operations"""

    def __init__(self, account_id: str, api_token: str, namespace_id: str):
        """
        Initialize Cloudflare KV client

        Args:
            account_id: Cloudflare account ID
            api_token: Cloudflare API token with KV permissions
            namespace_id: KV namespace ID
        """
        self.account_id = account_id
        self.api_token = api_token
        self.namespace_id = namespace_id
        self.base_url = f"https://api.cloudflare.com/client/v4/accounts/{account_id}/storage/kv/namespaces/{namespace_id}"

    def _make_request(self, endpoint: str, method: str = "GET", data: Optional[bytes] = None) -> Any:
        """
        Make HTTP request to Cloudflare API

        Args:
            endpoint: API endpoint path
            method: HTTP method (GET, PUT, DELETE, etc.)
            data: Request body data (bytes)

        Returns:
            Parsed JSON response or None
        """
        url = f"{self.base_url}{endpoint}"

        request = urllib.request.Request(url, method=method)
        request.add_header("Authorization", f"Bearer {self.api_token}")

        if data:
            request.add_header("Content-Type", "application/json")
            request.data = data

        try:
            with urllib.request.urlopen(request) as response:
                if response.status == 200:
                    return json.loads(response.read().decode('utf-8'))
                return None
        except urllib.error.HTTPError as e:
            print(f"HTTP Error {e.code}: {e.reason}")
            if hasattr(e, 'read'):
                error_body = e.read().decode('utf-8')
                print(f"Error details: {error_body}")
            return None
        except Exception as e:
            print(f"Error making request: {e}")
            return None

    def list_keys(self, prefix: str = "", limit: int = 1000) -> List[str]:
        """
        List all keys with optional prefix filter

        Args:
            prefix: Filter keys by prefix
            limit: Maximum number of keys to return

        Returns:
            List of key names
        """
        endpoint = f"/keys?limit={limit}"
        if prefix:
            endpoint += f"&prefix={prefix}"

        response = self._make_request(endpoint)
        if response and 'result' in response:
            return [item['name'] for item in response['result']]
        return []

    def get_value(self, key: str) -> Optional[Dict]:
        """
        Get value for a specific key

        Args:
            key: Key name

        Returns:
            Parsed JSON value or None if not found
        """
        endpoint = f"/values/{key}"
        response = self._make_request(endpoint)
        return response

    def put_value(self, key: str, value: Dict, expiration_ttl: Optional[int] = None) -> bool:
        """
        Store value for a key

        Args:
            key: Key name
            value: Value to store (will be JSON encoded)
            expiration_ttl: Optional TTL in seconds

        Returns:
            True if successful
        """
        endpoint = f"/values/{key}"
        if expiration_ttl:
            endpoint += f"?expiration_ttl={expiration_ttl}"

        data = json.dumps(value).encode('utf-8')
        response = self._make_request(endpoint, method="PUT", data=data)
        return response is not None

    def delete_key(self, key: str) -> bool:
        """
        Delete a key from KV storage

        Args:
            key: Key name to delete

        Returns:
            True if successful
        """
        endpoint = f"/values/{key}"
        response = self._make_request(endpoint, method="DELETE")
        return response is not None or response == ""

    def bulk_delete(self, keys: List[str]) -> bool:
        """
        Delete multiple keys at once

        Args:
            keys: List of key names to delete

        Returns:
            True if successful
        """
        if not keys:
            return True

        endpoint = "/bulk"
        data = json.dumps(keys).encode('utf-8')
        response = self._make_request(endpoint, method="DELETE", data=data)
        return response is not None


def get_client_from_env() -> CloudflareKV:
    """
    Create CloudflareKV client from environment variables

    Returns:
        CloudflareKV client instance

    Raises:
        ValueError: If required environment variables are missing
    """
    account_id = os.environ.get('CF_ACCOUNT_ID')
    api_token = os.environ.get('CF_API_TOKEN')
    namespace_id = os.environ.get('CF_KV_NAMESPACE_ID')

    if not all([account_id, api_token, namespace_id]):
        missing = []
        if not account_id:
            missing.append('CF_ACCOUNT_ID')
        if not api_token:
            missing.append('CF_API_TOKEN')
        if not namespace_id:
            missing.append('CF_KV_NAMESPACE_ID')

        raise ValueError(f"Missing required environment variables: {', '.join(missing)}")

    return CloudflareKV(account_id, api_token, namespace_id)


def test_connection():
    """Test connection to Cloudflare KV"""
    try:
        client = get_client_from_env()
        keys = client.list_keys(limit=1)
        print(f"✓ Connection successful! Found {len(keys)} key(s)")
        return True
    except Exception as e:
        print(f"✗ Connection failed: {e}")
        return False


if __name__ == "__main__":
    # Test the connection when run directly
    test_connection()