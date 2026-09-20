const runtimeEnv = window.RUNTIME_ENV || {};

function readEnv(name, fallback = "") {
  return runtimeEnv[name] || import.meta.env[name] || fallback;
}

export const API_BASE_URL = readEnv("VITE_API_BASE_URL", "http://localhost:8001");
export const MCP_SSE_URL = readEnv("VITE_MCP_SSE_URL", `${API_BASE_URL}/sse`);
export const OPENAI_API_KEY = readEnv(
  "VITE_OPENAI_API_KEY",
  readEnv("VITE_OPENROUTER_API_KEY", readEnv("REACT_APP_OPENAI_API_KEY", "")),
);
