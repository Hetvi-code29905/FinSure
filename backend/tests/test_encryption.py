# tests/test_encryption.py
import pytest
from cryptography.exceptions import InvalidTag


def test_encrypt_decrypt_roundtrip():
    from app.core.encryption import decrypt, encrypt
    plain     = "access-token-abc123"
    encrypted = encrypt(plain)
    assert encrypted != plain
    assert decrypt(encrypted) == plain


def test_encrypt_non_deterministic():
    from app.core.encryption import encrypt
    plain = "same-value"
    assert encrypt(plain) != encrypt(plain)


def test_decrypt_tampered_raises():
    from app.core.encryption import decrypt, encrypt
    import base64
    enc   = encrypt("sensitive")
    raw   = bytearray(base64.urlsafe_b64decode(enc.encode()))
    raw[15] ^= 0xFF                          # flip a bit in the ciphertext
    bad   = base64.urlsafe_b64encode(bytes(raw)).decode()
    with pytest.raises(InvalidTag):
        decrypt(bad)


def test_encrypt_nullable_none():
    from app.core.encryption import encrypt_nullable, decrypt_nullable
    assert encrypt_nullable(None) is None
    assert decrypt_nullable(None) is None


def test_encrypt_empty_raises():
    from app.core.encryption import encrypt
    with pytest.raises(ValueError):
        encrypt("")


def test_decrypt_empty_raises():
    from app.core.encryption import decrypt
    with pytest.raises(ValueError):
        decrypt("")


def test_encrypt_unicode():
    from app.core.encryption import decrypt, encrypt
    plain = "こんにちは — financial data 🔐"
    assert decrypt(encrypt(plain)) == plain