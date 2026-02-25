import secrets
import hashlib
from typing import Tuple


def generate_access_token() -> str:
    """
    Generate a secure random access token.

    Returns:
        str: URL-safe access token (32 bytes encoded)
    """
    return secrets.token_urlsafe(32)


def hash_token(token: str) -> str:
    """
    Hash an access token using SHA256.

    Args:
        token: Raw access token to hash

    Returns:
        str: Hex-encoded SHA256 hash
    """
    return hashlib.sha256(token.encode()).hexdigest()


def generate_token_pair() -> Tuple[str, str]:
    """
    Generate a token and its hash in one operation.

    Returns:
        Tuple[str, str]: (raw_token, token_hash)
    """
    token = generate_access_token()
    token_hash = hash_token(token)
    return token, token_hash


def verify_token(incoming_token: str, stored_hash: str) -> bool:
    """
    Verify an incoming token against a stored hash.

    Args:
        incoming_token: Token received from client
        stored_hash: Hashed token stored in database

    Returns:
        bool: True if token matches, False otherwise
    """
    incoming_hash = hash_token(incoming_token)
    return incoming_hash == stored_hash

