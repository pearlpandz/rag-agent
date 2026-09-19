import React, { useEffect, useRef, useState } from 'react';
import './ChatBox.css';

function ChatBox({ generateResponse }) {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [isFirstMessage, setIsFirstMessage] = useState(true);

    const chatBodyRef = useRef(null);
    const textareaRef = useRef(null);
    const streamIntervalRef = useRef(null);

    useEffect(() => {
        if (chatBodyRef.current) {
            chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
        }
    }, [messages]);

    useEffect(() => {
        return () => {
            if (streamIntervalRef.current) {
                clearInterval(streamIntervalRef.current);
            }
        };
    }, []);

    const autoResize = () => {
        const el = textareaRef.current;
        if (!el) return;
        el.style.height = 'auto';
        el.style.height = Math.min(el.scrollHeight, 6 * 24) + 'px';
    };

    useEffect(() => {
        autoResize();
    }, [input]);

    const suggestions = [
        'Explain quantum computing in simple terms',
        'Write a short poem about autumn',
        'Give me 3 ideas for a React side project',
        'How do I center a div with CSS?'
    ];

    const startAssistantStream = (userText) => {
        const id = Date.now() + '-ai';
        const assistantTarget =
            "I'm a simulated assistant responding in a ChatGPT-like style.\n\n" +
            `You said: "${userText}"\n\n` +
            'Here is a helpful, streamed reply to demonstrate the UI:\n' +
            '- It appears word-by-word (or character-by-character)\n' +
            '- Auto-scroll keeps the latest message in view\n' +
            '- Input is disabled while generating\n' +
            '- You can Stop generating to keep partial output' +
            '- You should answer based on document only' +
            '- If answer or results empty then return No data found or relevant, do not answer your own'

        setMessages((prev) => [
            ...prev,
            { id, text: '', sender: 'ai', typing: true }
        ]);

        setIsGenerating(true);

        let i = 0;
        streamIntervalRef.current = setInterval(() => {
            i++;
            const chunk = assistantTarget.slice(0, i);

            setMessages((prev) =>
                prev.map((m) =>
                    m.id === id ? { ...m, text: chunk, typing: i < assistantTarget.length } : m
                )
            );

            if (i >= assistantTarget.length) {
                clearInterval(streamIntervalRef.current);
                streamIntervalRef.current = null;
                setIsGenerating(false);
            }
        }, 15);
    };

    const startExternalGeneration = async (userText) => {
        const id = Date.now() + '-ai';
        setMessages((prev) => [
            ...prev,
            { id, text: '', sender: 'ai', typing: true }
        ]);

        setIsGenerating(true);
        try {
            const resp = await generateResponse(userText);
            if (resp == null || String(resp).trim() === '') {
                setMessages((prev) => prev.filter((m) => m.id !== id));
            } else {
                setMessages((prev) =>
                    prev.map((m) =>
                        m.id === id ? { ...m, text: String(resp), typing: false } : m
                    )
                );
            }
        } catch (err) {
            setMessages((prev) =>
                prev.map((m) =>
                    m.id === id
                        ? {
                            ...m,
                            text: 'Error generating response: ' + (err?.message || String(err)),
                            typing: false
                        }
                        : m
                )
            );
        } finally {
            setIsGenerating(false);
        }
    };

    const stopGenerating = () => {
        if (streamIntervalRef.current) {
            clearInterval(streamIntervalRef.current);
            streamIntervalRef.current = null;
        }
        setIsGenerating(false);
        setMessages((prev) => prev.map((m) => (m.typing ? { ...m, typing: false } : m)));
    };

    const sendMessage = () => {
        if (!input.trim() || isGenerating) return;

        const userText = input.trim();
        const userMessage = {
            id: Date.now() + '-u',
            text: userText,
            sender: 'user'
        };

        setMessages((prev) => [...prev, userMessage]);
        setInput('');
        autoResize();
        if (isFirstMessage) {
            setIsFirstMessage(false);
        }

        if (generateResponse) {
            startExternalGeneration(userText);
        } else {
            startAssistantStream(userText);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    const handleSuggestionClick = (text) => {
        setInput(text);
        sendMessageWithText(text);
    };

    const sendMessageWithText = (text) => {
        if (!text.trim() || isGenerating) return;
        const userMessage = {
            id: Date.now() + '-u',
            text: text.trim(),
            sender: 'user'
        };
        setMessages((prev) => [...prev, userMessage]);
        setInput('');
        autoResize();
        if (isFirstMessage) {
            setIsFirstMessage(false);
        }
        if (generateResponse) {
            startExternalGeneration(text.trim());
        } else {
            startAssistantStream(text.trim());
        }
    };

    return (
        <div className={`chat-container ${isFirstMessage ? 'centered' : ''}`}>
            <div className="chat-messages" ref={chatBodyRef}>
                {messages.length === 0 && (
                    <div className="suggestions">
                        <div className="title">Start a conversation</div>
                        <div className="suggestions-grid">
                            {suggestions.map((s, idx) => (
                                <button key={idx} className="suggestion-card" onClick={() => handleSuggestionClick(s)}>
                                    {s}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {messages.map((msg) => (
                    <div key={msg.id} className={`message ${msg.sender}`}>
                        {msg.sender === 'ai' && <div className="avatar">AI</div>}
                        <div className="bubble">
                            {msg.text.split('\n').map((line, i) => (
                                <div key={i}>{line}</div>
                            ))}
                            {msg.typing && (
                                <span style={{ opacity: 0.6 }}>▋</span>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            <div className="chat-input">
                <textarea ref={textareaRef} rows={1} placeholder="Message ChatGPT..." value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown} disabled={isGenerating} />
                {isGenerating ? (
                    <button onClick={stopGenerating} className="danger">Stop</button>
                ) : (
                    <button onClick={sendMessage} disabled={!input.trim()}>Send</button>
                )}
            </div>
        </div>
    );
}


export default ChatBox;
