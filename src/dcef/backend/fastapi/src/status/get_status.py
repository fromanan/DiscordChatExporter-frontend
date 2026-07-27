
from fastapi import APIRouter

from ..common.Database import Database

router = APIRouter(
	prefix="",
	tags=["status"]
)

@router.get("/")
@router.get("/status")
async def api_status():
	"""
	Returns the status of the api and the database.
	"""
	try:
		database_status = "online" if Database.is_online() else "offline"
		revision = Database.get_global_collection("config").find_one(
			{"key": "archive_revision"}
		)
	except:
		database_status = "offline"
		revision = None
	return {
		"api_backend": "online",  # it api_backend is offline, the api would not respond
		"database": database_status,
		"archiveRevision": revision.get("value", 0) if revision else 0
	}
