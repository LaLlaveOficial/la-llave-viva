"""Never expose a server without Google OAuth configured."""
import os
from urllib.parse import urlparse

required = ["GOOGLE_PROJECT_ID", "GOOGLE_ADS_MCP_OAUTH_CLIENT_ID",
            "GOOGLE_ADS_MCP_OAUTH_CLIENT_SECRET", "GOOGLE_ADS_MCP_BASE_URL",
            "GOOGLE_ADS_MCP_JWT_SIGNING_KEY", "GOOGLE_ADS_MCP_STORAGE_ENCRYPTION_KEY",
            "GOOGLE_ADS_MCP_STORAGE_PATH"]
missing = [name for name in required if not os.environ.get(name)]
if missing:
    raise SystemExit("Google Ads no iniciado: faltan " + ", ".join(missing))
url = urlparse(os.environ["GOOGLE_ADS_MCP_BASE_URL"])
if url.scheme != "https" or not url.netloc or url.username or url.password or url.query or url.fragment or url.path not in ("", "/"):
    raise SystemExit("Google Ads no iniciado: BASE_URL debe ser un origen HTTPS.")
os.environ["GOOGLE_ADS_MCP_STORAGE_TYPE"] = "filetree"
os.environ["GOOGLE_ADS_MCP_STORAGE_DISABLE_ENCRYPTION"] = "false"
os.makedirs(os.environ["GOOGLE_ADS_MCP_STORAGE_PATH"], mode=0o700, exist_ok=True)
os.execvp("google-ads-mcp", ["google-ads-mcp"])
