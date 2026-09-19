"""Minimal FastMCP HTTP server exposing registered tools and MCP manifest.

Run with: python main.py
Configure MCP Inspector with transport: streamable-http and URL: http://localhost:8000
"""

import logging
import inspect
import uvicorn

from mcp.server.fastmcp import FastMCP
from starlette.applications import Starlette
from starlette.responses import JSONResponse
from starlette.middleware import Middleware
from starlette.middleware.cors import CORSMiddleware

# Expose FastAPI-based REST routers (api/*.py)
from fastapi import FastAPI
from api.category import router as category_router
from api.docs import router as docs_router
from api.ticket import router as ticket_router

from tools.metadata_tool import mcp as metadata_mcp
from tools.vector_search_tool import mcp as vector_search_mcp

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("mcp-server")

# Create server with CORS enabled for MCP Inspector
# Configure paths for both SSE and streamable-http transports
server = FastMCP(
    name="RAGMCPServer", 
    sse_path="/sse",
    message_path="/messages/",
    streamable_http_path="/",
    stateless_http=False
)

def merge_tools(src: FastMCP):
    for tool in src._tool_manager._tools.values():
        server._tool_manager._tools[tool.name] = tool
        logger.info(f"Registered tool: {tool.name}")

merge_tools(metadata_mcp)
merge_tools(vector_search_mcp)

@server.custom_route("/.well-known/mcp.json", ["GET"])
async def manifest(request):
    tools_list = []
    for name, tool in server._tool_manager._tools.items():
        sig = inspect.signature(tool.fn)
        properties = {}
        required = []
        for pname, param in sig.parameters.items():
            t = "string"
            if param.annotation == int:
                t = "integer"
            elif param.annotation == dict:
                t = "object"
            elif param.annotation == bool:
                t = "boolean"
            properties[pname] = {"type": t}
            if param.default == inspect.Parameter.empty:
                required.append(pname)
        tools_list.append({
            "name": name,
            "description": tool.fn.__doc__ or "",
            "inputSchema": {"type": "object", "properties": properties, "required": required},
        })
    return JSONResponse({
        "name": server.name,
        "version": "1.0.0",
        "description": "RAG MCP Server",
        "tools": tools_list,
    })

@server.custom_route("/health", ["GET"])
async def health(request):
    return JSONResponse({"status": "ok", "tool_count": len(server._tool_manager._tools)})

if __name__ == "__main__":
    # Create the app with both SSE and streamable-http support
    
    
    # Get both SSE and streamable-http apps
    sse_app = server.sse_app()
    streamable_app = server.streamable_http_app()
    
    # Merge routes from both apps with CORS
    # SSE app should handle /sse and /messages/* endpoints
    # Streamable-http app handles / endpoint
    combined_routes = list(sse_app.routes) + list(streamable_app.routes)

    # Create a small FastAPI app to host REST-style routers under this server.
    # We merge its routes into the combined Starlette routes so existing
    # APIRouter prefixes (e.g. "/api/categories") remain as defined in the
    # `api` package.
    api_app = FastAPI(title="mcp-rest")
    api_app.include_router(category_router)
    api_app.include_router(docs_router)
    api_app.include_router(ticket_router)
    # Do NOT merge FastAPI routes into Starlette routes (that breaks FastAPI's
    # middleware stack and leads to "fastapi_middleware_astack not found in
    # request scope"). Instead we'll mount the FastAPI app as a sub-application
    # on the Starlette app after it's created.
    
    # Add custom routes
    for route in server._custom_starlette_routes:
        combined_routes.append(route)
    
    # Create combined app with CORS middleware
    app = Starlette(
        routes=combined_routes,
        middleware=[
            Middleware(
                CORSMiddleware,
                allow_origins=["*"],
                allow_credentials=True,
                allow_methods=["*"],
                allow_headers=["*"],
            )
        ]
    )
    # Mount the FastAPI app to ensure FastAPI middleware and request scope
    # are correctly set for API routes. We mount at root because the
    # APIRouter in `api.category` already uses the `/api/categories` prefix.
    app.mount("/", api_app)
    
    uvicorn.run(app, host="127.0.0.1", port=8001)
