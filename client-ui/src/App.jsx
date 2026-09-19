import React, { useState } from "react";
import { Routes, Route, NavLink, Navigate } from "react-router-dom";
import Homepage from "./pages/Home";
import ChatUI from "./pages/ChatUI";
import DocumentsList from "./pages/documents/List";
import "./App.css";

function App() {
    const [collapsed, setCollapsed] = useState(true);
    const userName = "Muthupandi";
    const userInitial = userName ? userName[0].toUpperCase() : "U";

    return (
        <div className="app-shell">
            <aside className={`sidebar ${collapsed ? "collapsed" : ""}`}>
                <div className="nav-section">
                    <NavLink
                        to="/"
                        end
                        className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}>
                        <span className="icon">🏠</span>
                        <span className="label">Home</span>
                    </NavLink>

                    <NavLink
                        to="/chat"
                        className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}>
                        <span className="icon">💬</span>
                        <span className="label">Chat</span>
                    </NavLink>

                    <NavLink
                        to="/documents"
                        className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}>
                        <span className="icon">📄</span>
                        <span className="label">Documents</span>
                    </NavLink>
                </div>

                <div className="sidebar-bottom nav-section">
                    <button
                        type="button"
                        className="nav-item"
                        style={{ background: "transparent", border: "none", color: "inherit", textAlign: "left", width: "100%", cursor: "pointer" }}
                        onClick={() => alert("Settings clicked")}
                    >
                        <span className="icon">⚙️</span>
                        <span className="label">Settings</span>
                    </button>

                    <button
                        type="button"
                        className="nav-item"
                        style={{ background: "transparent", border: "none", color: "inherit", textAlign: "left", width: "100%", cursor: "pointer" }}
                        onClick={() => alert("Logged out")}
                    >
                        <span className="icon">⎋</span>
                        <span className="label">Logout</span>
                    </button>
                </div>
            </aside>

            <section className="content">
                <header className="topbar">
                    <div className="topbar-left">
                        <button
                            className="menu-btn"
                            aria-label="Toggle menu"
                            onClick={() => setCollapsed((c) => !c)}
                            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                        >
                            ☰
                        </button>
                        <div className="logo">Doc Hub</div>
                    </div>

                    <div className="topbar-right">
                        <div className="user-name">{userName}</div>
                        <div className="avatar">{userInitial}</div>
                    </div>
                </header>

                <main className="main">
                    <Routes>
                        <Route path="/" element={<Homepage />} />
                        <Route path="/chat" element={<ChatUI />} />
                        <Route path="/documents" element={<DocumentsList />} />
                        <Route path="/documents/:categoryId" element={<DocumentsList />} />
                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                </main>
            </section>
        </div>
    );
}

export default App;
