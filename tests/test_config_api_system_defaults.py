import asyncio
from types import SimpleNamespace


def test_get_system_config_will_initialize_system_defaults(monkeypatch):
    import landppt.api.config_api as config_api

    calls = {
        "initialized": False,
        "get_all_config_called": False,
    }

    class FakeConfigService:
        async def initialize_system_defaults(self):
            calls["initialized"] = True
            return 3

        async def get_all_config(self, user_id=None):
            calls["get_all_config_called"] = True
            assert calls["initialized"] is True
            assert user_id is None
            return {
                "default_ai_provider": "landppt",
                "landppt_model": "MODEL1",
            }

    monkeypatch.setattr(config_api, "get_db_config_service", lambda: FakeConfigService(), raising=True)

    result = asyncio.run(config_api.get_system_config(user=SimpleNamespace(is_admin=True)))

    assert calls["initialized"] is True
    assert calls["get_all_config_called"] is True
    assert result["success"] is True
    assert result["config"]["default_ai_provider"] == "landppt"
    assert result["config"]["landppt_model"] == "MODEL1"


def test_user_config_hides_inherited_provider_key_but_keeps_own_key(monkeypatch):
    import landppt.api.config_api as config_api

    class FakeConfigService:
        def get_config_schema(self, include_admin_only=True):
            return {
                "openai_api_key": {"type": "password", "category": "ai_providers"},
                "anthropic_api_key": {"type": "password", "category": "ai_providers"},
                "openai_model": {"type": "select", "category": "ai_providers"},
            }

        async def get_all_config_for_user(self, user_id, is_admin):
            return {
                "openai_api_key": "server-secret",
                "anthropic_api_key": "own-secret",
                "openai_model": "deepseek-flash",
            }

        async def is_user_override(self, user_id, key):
            return key == "anthropic_api_key"

    monkeypatch.setattr(config_api, "get_db_config_service", FakeConfigService)
    user = SimpleNamespace(id=2, is_admin=False)

    result = asyncio.run(config_api.get_user_config_by_category("ai_providers", user=user))

    assert "openai_api_key" not in result["config"]
    assert result["config"]["anthropic_api_key"] == "own-secret"
    assert result["config"]["openai_model"] == "deepseek-flash"
