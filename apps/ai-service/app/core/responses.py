from __future__ import annotations


def success_response(data: object, request_id: str | None = None) -> dict[str, object]:
    payload: dict[str, object] = {
        "code": "OK",
        "message": "success",
        "data": data,
    }
    if request_id:
        payload["requestId"] = request_id
    return payload
