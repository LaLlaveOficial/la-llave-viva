"""La Llave approval executor. Separate from Google's read-only MCP tools.

Only the production Vercel project may call this authenticated extension.
No campaign writes are performed during installation or validation.
"""
import hashlib
import json
import os
import re
import sqlite3
import time

CUSTOMER = "3149885754"
TEAM = "la-llave-oficial-s-projects"
PROJECT = "prj_ZPjGSkXIoNQL9Bffl737UVQZ5363"
OWNER = "team_z4kBjgTzE68bW5vnitnmGZEi"


def verify_project(token):
    import jwt
    issuer = jwt.decode(token, options={"verify_signature": False}).get("iss")
    if issuer not in ("https://oidc.vercel.com", f"https://oidc.vercel.com/{TEAM}"):
        raise ValueError("Identidad de proyecto no permitida.")
    key = jwt.PyJWKClient("https://oidc.vercel.com/.well-known/jwks", timeout=10).get_signing_key_from_jwt(token).key
    claims = jwt.decode(token, key, algorithms=["RS256"], issuer=issuer,
                        audience=f"https://vercel.com/{TEAM}",
                        options={"require": ["exp", "iat", "iss", "aud", "sub", "project_id", "owner_id", "environment"]})
    if (claims["project_id"] != PROJECT or claims["owner_id"] != OWNER
            or claims["environment"] != "production"
            or claims["sub"] != f"owner:{TEAM}:project:la-llave-viva:environment:production"):
        raise ValueError("Solo la consola de producción puede validar y ejecutar cambios.")


def normalize(change):
    if not isinstance(change, dict) or set(change) - {"action", "campaignId", "resource", "value", "matchType"}:
        raise ValueError("Propuesta inválida.")
    action = change.get("action")
    cid = str(change.get("campaignId", ""))
    if not re.fullmatch(r"\d{1,20}", cid):
        raise ValueError("Campaña inválida.")
    result = {"action": action, "campaignId": cid}
    if action in ("campaign_status", "ad_status"):
        if change.get("value") not in ("PAUSED", "ENABLED"):
            raise ValueError("Estado inválido.")
        result["value"] = change["value"]
        if action == "ad_status":
            if not re.fullmatch(r"customers/3149885754/adGroupAds/\d+~\d+", change.get("resource", "")):
                raise ValueError("Anuncio inválido.")
            result["resource"] = change["resource"]
    elif action == "campaign_budget":
        value = change.get("value")
        if not isinstance(value, int) or isinstance(value, bool) or not 1 <= value <= 500000:
            raise ValueError("Presupuesto diario inválido: 1 a 500.000 CLP.")
        result["value"] = value
    elif action == "negative_keyword":
        text = change.get("value", "")
        if not isinstance(text, str) or not 1 <= len(text.strip()) <= 80 or any(ord(c) < 32 for c in text):
            raise ValueError("Palabra negativa inválida.")
        if change.get("matchType") not in ("EXACT", "PHRASE", "BROAD"):
            raise ValueError("Concordancia inválida.")
        result.update(value=text.strip(), matchType=change["matchType"])
    else:
        raise ValueError("Cambio no permitido.")
    return result


def quoted(value):
    return "'" + value.replace("\\", "\\\\").replace("'", "\\'") + "'"


def current(change):
    from ads_mcp.tools.search import search
    cid = change["campaignId"]
    campaign = search(CUSTOMER, ["campaign.resource_name", "campaign.name", "campaign.status", "campaign.campaign_budget"], "campaign", [f"campaign.id = {cid}"], limit=1)
    if len(campaign) != 1 or campaign[0]["campaign.status"] == "REMOVED":
        raise ValueError("La campaña no está disponible.")
    row = campaign[0]
    result = {"campaign": row["campaign.resource_name"], "name": row["campaign.name"]}
    if change["action"] == "campaign_status":
        result["value"] = row["campaign.status"]
    elif change["action"] == "campaign_budget":
        currency = search(CUSTOMER, ["customer.currency_code"], "customer", limit=1)
        if not currency or currency[0]["customer.currency_code"] != "CLP":
            raise ValueError("La cuenta no confirmó CLP.")
        budget = search(CUSTOMER, ["campaign_budget.resource_name", "campaign_budget.amount_micros", "campaign_budget.explicitly_shared"], "campaign_budget", [f"campaign_budget.resource_name = {quoted(row['campaign.campaign_budget'])}"], limit=1)
        if len(budget) != 1 or budget[0]["campaign_budget.explicitly_shared"]:
            raise ValueError("No se modifican presupuestos compartidos desde esta consola.")
        result.update(resource=budget[0]["campaign_budget.resource_name"], value=int(budget[0]["campaign_budget.amount_micros"]), currency="CLP")
    elif change["action"] == "ad_status":
        ads = search(CUSTOMER, ["campaign.id", "ad_group_ad.resource_name", "ad_group_ad.status"], "ad_group_ad", [f"ad_group_ad.resource_name = {quoted(change['resource'])}"], limit=1)
        if len(ads) != 1 or str(ads[0]["campaign.id"]) != cid or ads[0]["ad_group_ad.status"] == "REMOVED":
            raise ValueError("El anuncio no pertenece a la campaña seleccionada.")
        result.update(resource=change["resource"], value=ads[0]["ad_group_ad.status"])
    else:
        existing = search(CUSTOMER, ["campaign_criterion.resource_name", "campaign_criterion.keyword.text", "campaign_criterion.keyword.match_type"], "campaign_criterion", [f"campaign.id = {cid}", "campaign_criterion.negative = TRUE", "campaign_criterion.type = 'KEYWORD'", f"campaign_criterion.keyword.text = {quoted(change['value'])}", f"campaign_criterion.keyword.match_type = '{change['matchType']}'"], limit=100)
        result["exists"] = bool(existing)
    return result


def mutate(change, before, validate_only):
    from ads_mcp import utils
    operation = utils.get_googleads_type("MutateOperation")
    action = change["action"]
    if action == "campaign_status":
        op = operation.campaign_operation
        op.update.resource_name = before["campaign"]
        op.update.status = change["value"]
        op.update_mask.paths.append("status")
    elif action == "campaign_budget":
        op = operation.campaign_budget_operation
        op.update.resource_name = before["resource"]
        op.update.amount_micros = change["value"] * 1000000
        op.update_mask.paths.append("amount_micros")
    elif action == "ad_status":
        op = operation.ad_group_ad_operation
        op.update.resource_name = before["resource"]
        op.update.status = change["value"]
        op.update_mask.paths.append("status")
    else:
        op = operation.campaign_criterion_operation
        op.create.campaign = before["campaign"]
        op.create.negative = True
        op.create.keyword.text = change["value"]
        op.create.keyword.match_type = change["matchType"]
    request = utils.get_googleads_type("MutateGoogleAdsRequest")
    request.customer_id = CUSTOMER
    request.mutate_operations.append(operation)
    request.validate_only = validate_only
    request.partial_failure = False
    return utils.get_googleads_service("GoogleAdsService").mutate(request=request)


def applied(change, after):
    if change["action"] == "negative_keyword":
        return after.get("exists") is True
    value = change["value"] * 1000000 if change["action"] == "campaign_budget" else change["value"]
    return after.get("value") == value


def execute(change, expected, proposal_id, mode):
    change = normalize(change)
    before = current(change)
    if mode == "validate":
        if applied(change, before):
            raise ValueError("El cambio ya está aplicado; no se creó otra propuesta.")
        mutate(change, before, True)
        return {"status": "validated", "before": before, "change": change}
    if mode != "execute" or not re.fullmatch(r"[1-9]\d{0,18}", str(proposal_id)) or not isinstance(expected, dict):
        raise ValueError("Aprobación inválida.")
    digest = hashlib.sha256(json.dumps({"change": change, "expected": expected}, sort_keys=True, separators=(",", ":")).encode()).hexdigest()
    path = os.environ["GOOGLE_ADS_MCP_STORAGE_PATH"]
    with sqlite3.connect(os.path.join(path, "llave-executions.sqlite3"), timeout=20) as db:
        db.execute("CREATE TABLE IF NOT EXISTS executions (id TEXT PRIMARY KEY, digest TEXT NOT NULL, status TEXT NOT NULL, result TEXT, created REAL)")
        db.execute("BEGIN IMMEDIATE")
        existing = db.execute("SELECT digest,status,result FROM executions WHERE id=?", (str(proposal_id),)).fetchone()
        if existing:
            if existing[0] != digest:
                raise ValueError("No se puede cambiar una propuesta ya procesada.")
            if existing[1] == "verified":
                return json.loads(existing[2])
            return {"status": "uncertain", "message": "Esta ejecución ya se intentó. No se repite automáticamente; revisa el historial y el estado actual."}
        if before != expected:
            raise ValueError("El estado cambió desde la propuesta. Valida una propuesta nueva.")
        db.execute("INSERT INTO executions VALUES (?,?,?,NULL,?)", (str(proposal_id), digest, "executing", time.time()))
        db.commit()
        try:
            mutate(change, before, False)
            after = current(change)
            result = {"status": "verified" if applied(change, after) else "uncertain", "before": before, "after": after, "change": change}
            db.execute("UPDATE executions SET status=?,result=? WHERE id=?", (result["status"], json.dumps(result), str(proposal_id)))
            db.commit()
            return result
        except Exception:
            db.execute("UPDATE executions SET status='uncertain' WHERE id=?", (str(proposal_id),))
            db.commit()
            raise ValueError("No se confirmó la ejecución. No vuelvas a ejecutarla sin revisar el historial y el estado real.") from None


def register():
    from ads_mcp.coordinator import mcp
    from fastmcp.exceptions import ToolError
    from mcp.types import ToolAnnotations

    @mcp.tool(name="llave_approved_change", annotations=ToolAnnotations(readOnlyHint=False, destructiveHint=True, idempotentHint=True))
    def llave_approved_change(project_token: str, change: dict, mode: str = "validate", expected: dict | None = None, proposal_id: str = "") -> dict:
        """La Llave extension. Production-project authentication and owner approval are mandatory. Validation does not write Google Ads. Only four allowlisted action types on account 3149885754; no arbitrary mutate requests."""
        try:
            verify_project(project_token)
            return execute(change, expected, proposal_id, mode)
        except Exception as exc:
            from google.ads.googleads.errors import GoogleAdsException
            if isinstance(exc, GoogleAdsException):
                raise ToolError("Google Ads rechazó la validación o ejecución. Revisa permisos, tipo de campaña y políticas; no se confirma un cambio.") from None
            if isinstance(exc, ValueError):
                raise ToolError(str(exc)) from None
            raise ToolError("La extensión no pudo confirmar la operación.") from None
