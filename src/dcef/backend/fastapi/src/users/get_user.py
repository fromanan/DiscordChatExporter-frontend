import re

from fastapi import APIRouter, HTTPException

from ..common.Database import Database
from ..common.helpers import pad_id


router = APIRouter(
	prefix="",
	tags=["guild"]
)


@router.get("/guild/user")
async def get_user(guild_id: str, user_id: str):
	"""Return the best archived profile for a guild member."""
	if re.fullmatch(r"\d+", guild_id) is None or re.fullmatch(r"\d+", user_id) is None:
		raise HTTPException(status_code=400, detail="guild_id and user_id must be numeric")

	padded_user_id = pad_id(user_id)
	if padded_user_id in Database.get_denylisted_user_ids():
		raise HTTPException(status_code=404, detail="User not found")

	collection_authors = Database.get_guild_collection(guild_id, "authors")
	author = collection_authors.find_one({"_id": padded_user_id})
	if author is None:
		raise HTTPException(status_code=404, detail="User not found")

	names = author.get("names") or [""]
	current_name = names[-1]
	name, separator, discriminator = current_name.rpartition("#")
	if not separator:
		name = current_name
		discriminator = ""

	nicknames = author.get("nicknames") or []
	return {
		"_id": author["_id"],
		"name": name,
		"nickname": nicknames[-1] if nicknames else name,
		"discriminator": discriminator,
		"color": author.get("color"),
		"isBot": author.get("isBot", False),
		"avatar": author.get("avatar"),
		"roles": author.get("roles"),
		"msgCount": author.get("msg_count", 0),
	}
