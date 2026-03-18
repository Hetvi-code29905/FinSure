# tests/test_auth.py
import pytest
from app.services.auth_service import AuthService


@pytest.mark.asyncio
async def test_register_success(db):
    svc    = AuthService(db)
    result = await svc.register("new@finomous.com", "Test@1234!", "New User")
    assert result["user"]["email"] == "new@finomous.com"
    assert "access_token" in result["tokens"]


@pytest.mark.asyncio
async def test_register_duplicate_email(db, test_user):
    svc = AuthService(db)
    from app.core.exceptions import ConflictException
    with pytest.raises(ConflictException):
        await svc.register("test@finomous.com", "Test@1234!", "Dupe")


@pytest.mark.asyncio
async def test_register_weak_password(db):
    svc = AuthService(db)
    from app.core.exceptions import ValidationException
    with pytest.raises(ValidationException):
        await svc.register("weak@finomous.com", "password", "Weak")


@pytest.mark.asyncio
async def test_login_success(db, test_user):
    svc    = AuthService(db)
    result = await svc.login("test@finomous.com", "Test@1234")
    assert result["user"]["email"] == "test@finomous.com"
    assert "access_token" in result["tokens"]


@pytest.mark.asyncio
async def test_login_wrong_password(db, test_user):
    svc = AuthService(db)
    from app.core.exceptions import AuthException
    with pytest.raises(AuthException):
        await svc.login("test@finomous.com", "wrongpassword")


@pytest.mark.asyncio
async def test_login_unknown_email(db):
    svc = AuthService(db)
    from app.core.exceptions import AuthException
    with pytest.raises(AuthException):
        await svc.login("nobody@finomous.com", "Test@1234")


@pytest.mark.asyncio
async def test_account_lockout(db, test_user):
    svc = AuthService(db)
    from app.core.exceptions import AuthException
    # Exhaust max attempts
    for _ in range(5):
        try:
            await svc.login("test@finomous.com", "wrong!")
        except AuthException:
            pass
    # Next attempt should be locked
    with pytest.raises(AuthException, match="locked"):
        await svc.login("test@finomous.com", "Test@1234")


@pytest.mark.asyncio
async def test_refresh_token_rotation(db, test_user):
    svc    = AuthService(db)
    login  = await svc.login("test@finomous.com", "Test@1234")
    tokens = await svc.refresh(login["tokens"]["refresh_token"])
    assert "access_token" in tokens
    # Old token must not work again
    from app.core.exceptions import AuthException
    with pytest.raises(AuthException):
        await svc.refresh(login["tokens"]["refresh_token"])


@pytest.mark.asyncio
async def test_logout_revokes_token(db, test_user):
    svc   = AuthService(db)
    login = await svc.login("test@finomous.com", "Test@1234")
    uid   = str(test_user["_id"])
    await svc.logout(uid, login["tokens"]["refresh_token"])
    from app.core.exceptions import AuthException
    with pytest.raises(AuthException):
        await svc.refresh(login["tokens"]["refresh_token"])