from typing import List, Dict, Any, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from .plugins import plugin_manager

router = APIRouter(prefix="/plugins", tags=["Tool Plugins"])

class PluginCreate(BaseModel):
    name: str
    display_name: str
    category: str = "Custom Extensions"
    description: str = "Custom security plugin"
    version: str = "1.0.0"
    command_template: str
    intensity_flags: Optional[Dict[str, str]] = {
        "light": "-t 1",
        "medium": "-t 5",
        "aggressive": "-t 10"
    }
    vulnerability_keywords: Optional[List[str]] = ["vulnerable", "warning", "critical", "exposed"]
    enabled: bool = True

@router.get("")
def list_plugins():
    return plugin_manager.list_plugins()

@router.post("")
def create_plugin(plugin_in: PluginCreate):
    manifest = plugin_in.model_dump()
    created = plugin_manager.register_plugin(manifest)
    return {"status": "registered", "plugin": created}

@router.post("/{plugin_id}/toggle")
def toggle_plugin(plugin_id: str):
    res = plugin_manager.toggle_plugin(plugin_id)
    if not res:
        raise HTTPException(status_code=404, detail="Plugin not found")
    return {"status": "toggled", "plugin": res}

@router.delete("/{plugin_id}")
def delete_plugin(plugin_id: str):
    deleted = plugin_manager.delete_plugin(plugin_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Plugin not found")
    return {"status": "deleted", "plugin_id": plugin_id}

