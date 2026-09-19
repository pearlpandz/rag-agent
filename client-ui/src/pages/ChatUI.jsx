import React, { useCallback, useEffect, useRef, useState } from "react";
import ChatBox from "./ChatBox";
import { useMcp } from "use-mcp/react";
import { MCP_SSE_URL, OPENAI_API_KEY } from "../config";


async function rephraseWithOpenAI({ userText, toolName, toolRaw }) {
  const apiKey = OPENAI_API_KEY;

  const instruction = [
    "You rewrite tool output into a clear, user-friendly answer.",
    "Rules:",
    "- Do not show raw JSON or internal fields unless asked.",
    "- Focus on the user's request and the essential facts from the tool output.",
    "- Use concise, natural language in a single answer.",
    "- If the tool reported an error, explain it briefly and suggest a corrective step.",
  ].join("\n");

  const content = [
    `User request: ${userText}`,
    `Tool name: ${toolName}`,
    "Tool raw output:",
    "```",
    String(toolRaw ?? "").slice(0, 6000),
    "```",
    "",
    "Rewrite the final answer for the user now."
  ].join("\n");

  if (!apiKey) {
    // Local fallback: very naive rephrase
    const raw = String(toolRaw || "").trim();
    const first = raw.split("\n").slice(0, 12).join("\n");
    return [
      "(Rephrased locally without OpenAI key)",
      "",
      first
    ].join("\n");
  }

  try {
    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: instruction },
          { role: "user", content }
        ],
        temperature: 0.3
      })
    });

    if (!resp.ok) {
      const txt = await resp.text();
      throw new Error(`OpenAI API error: ${resp.status} ${txt}`);
    }
    const data = await resp.json();
    const answer = data?.choices?.[0]?.message?.content?.trim();
    if (answer) return answer;

    const raw = String(toolRaw || "").trim();
    const first = raw.split("\n").slice(0, 12).join("\n");
    return [
      "(Fallback due to empty LLM result)",
      "",
      first
    ].join("\n");
  } catch (e) {
    const raw = String(toolRaw || "").trim();
    const first = raw.split("\n").slice(0, 12).join("\n");
    return [
      "(Fallback due to summarizer error)",
      "",
      first
    ].join("\n");
  }
}

export default function ChatUI() {
  const {
    state,          // 'discovering' | 'pending_auth' | 'authenticating' | 'connecting' | 'loading' | 'ready' | 'failed'
    tools,          // Available tools from MCP server
    error,          // Error if connection failed
    callTool,       // Function to call tools on the MCP server
    retry,          // Retry connection
    authenticate,   // Trigger authentication
  } = useMcp({
    url: MCP_SSE_URL,
    clientName: "Localhost Client",
    autoReconnect: true
  });

  // Toasts for connection success/failure (top-right)
  const [toasts, setToasts] = useState([]);
  const addToast = useCallback(({ type = "success", title, message }) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);
  const prevStateRef = useRef(state);
  useEffect(() => {
    if (prevStateRef.current !== state) {
      if (state === "ready") {
        addToast({
          type: "success",
          title: "MCP connected",
          message: `Tools available: ${Array.isArray(tools) ? tools.length : 0}`
        });
      } else if (state === "failed") {
        addToast({
          type: "error",
          title: "MCP connection failed",
          message: String(error || "Unknown error")
        });
      }
      prevStateRef.current = state;
    }
  }, [state, tools, error, addToast]);
  const toastContainerStyle = { position: "fixed", top: 12, right: 12, display: "flex", flexDirection: "column", gap: 8, zIndex: 9999 };
  const toastBaseStyle = { minWidth: 280, maxWidth: 420, background: "#fff", borderRadius: 10, border: "1px solid #e5e7eb", boxShadow: "0 8px 24px rgba(0,0,0,0.12)", padding: "10px 12px", color: "#111827", display: "flex", alignItems: "start", gap: 10 };
  const toastSuccessStyle = { background: "#ecfdf5", border: "1px solid #bbf7d0" };
  const toastErrorStyle = { background: "#fef2f2", border: "1px solid #fecaca" };

  const generateResponse = useCallback(
    async (userText) => {
      // Ensure connection ready
      if (state !== "ready") {
        addToast({
          type: "error",
          title: "MCP not ready",
          message: "Please wait a moment and try again."
        });
        return null;
      }

      // Choose a tool:
      // 1) Exact name mention, 2) known defaults, 3) first tool
      let chosenName = null;
      const list = Array.isArray(tools) ? tools : [];
      if (list.length) {
        const lower = userText.toLowerCase();
        const byMention = list.find((t) => lower.includes(String(t?.name || "").toLowerCase()));
        if (byMention) {
          chosenName = byMention.name;
        }
        if (!chosenName) {
          const preferred = list.find((t) => t?.name === "vector_search" || t?.name === "ask_documents");
          if (preferred) chosenName = preferred.name;
        }
        if (!chosenName) {
          chosenName = list[0].name;
        }
      } else {
        addToast({
          type: "error",
          title: "No tools available",
          message: "MCP server provided no tools."
        });
        return null;
      }

      // Call the chosen tool. Pass a generic shape so most tools can work.
      let result;
      try {
        result = await callTool(chosenName, { query: userText, input: userText });
      } catch (e) {
        const errText = `Tool call failed for ${chosenName}: ${e?.message || String(e)}`;
        return await rephraseWithOpenAI({ userText, toolName: chosenName, toolRaw: errText });
      }

      // Normalize result to raw text
      const raw = typeof result === "string" ? result : JSON.stringify(result, null, 2);

      // Rephrase with OpenAI (or local fallback)
      const rephrased = await rephraseWithOpenAI({
        userText,
        toolName: chosenName,
        toolRaw: raw
      });

      return rephrased;
    },
    [state, tools, callTool]
  );



  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {/* <div style={{ fontSize: 12, color: "#0a0" }}>
        MCP connected. Tools available: {Array.isArray(tools) ? tools.length : 0}
      </div> */}
      <ChatBox generateResponse={generateResponse} />
      <div style={toastContainerStyle}>
        {toasts.map((t) => (
          <div
            key={t.id}
            style={{
              ...toastBaseStyle,
              ...(t.type === "success" ? toastSuccessStyle : toastErrorStyle)
            }}
          >
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{t.title}</div>
              {t.message ? (
                <div style={{ fontSize: 13, color: "#374151" }}>{t.message}</div>
              ) : null}
            </div>
            <button
              onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
              style={{ background: "transparent", border: "none", color: "#6b7280", fontSize: 16, lineHeight: 1, padding: "2px 4px", cursor: "pointer", marginLeft: "auto" }}
              aria-label="Dismiss"
              title="Dismiss"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
