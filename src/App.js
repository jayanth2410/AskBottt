import React, { useState, useCallback, useEffect, useRef } from "react";
import { Container } from "@mui/material";
import { marked } from "marked";
import DOMPurify from "dompurify";
import hljs from "highlight.js";
import { ToastContainer, toast } from "react-toastify";
import {
  FaBrain,
  FaRedo,
  FaEdit,
  FaCheck,
  FaTimes,
  FaLightbulb,
  FaBookOpen,
  FaBolt,
  FaCode,
  FaCompass,
  FaRocket,
  FaGraduationCap,
} from "react-icons/fa";
import { IoMdSend } from "react-icons/io";
import "highlight.js/styles/github-dark.css";
import "react-toastify/dist/ReactToastify.css";

// At the top of your file, outside the component:
let codeBlockCounter = 0;

// Add this hash function at the top (outside the component)
function hashCode(str) {
  let hash = 0,
    i,
    chr;
  if (str.length === 0) return hash;
  for (i = 0; i < str.length; i++) {
    chr = str.charCodeAt(i);
    hash = (hash << 5) - hash + chr;
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

function App() {
  const [query, setQuery] = useState("");
  const [responses, setResponses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);
  const [editQuery, setEditQuery] = useState("");
  const responseBoxRef = useRef(null);
  const [dynamicWord, setDynamicWord] = useState("Discover");
  const [dynamicLabel, setDynamicLabel] = useState("Ask me Anything...");
  const [showTour, setShowTour] = useState(false);
  const [tourPosition, setTourPosition] = useState({
    left: "50%",
    bottom: 110,
  });

  // Rotate dynamic word every 2 seconds
  useEffect(() => {
    const words = ["Discover", "Explore", "Search", "Create"];
    const labelWords = [
      "Ask me anything...",
      "Explore here now...",
      "Unveil the unknown...",
      "Discover new insights...",
    ];
    let index = 0;
    const interval = setInterval(() => {
      index = (index + 1) % words.length;
      setDynamicWord(words[index]);
      // setDynamicLabel(labelWords[index]);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (responses.length === 0) {
      const timer = setTimeout(() => {
        setShowTour(true);
        console.log("Tour started"); // Debug log
        // debugger; // This will pause execution in dev tools
      }, 5000); // 5 seconds
      return () => clearTimeout(timer);
    } else {
      setShowTour(false);
    }
  }, [responses.length]);

  useEffect(() => {
    if (showTour && responses.length === 0) {
      const btn = document.getElementById("landing-send-btn");
      if (btn) {
        const rect = btn.getBoundingClientRect();
        setTourPosition({
          left: rect.left + rect.width / 2,
          bottom: window.innerHeight - rect.top + 12, // 12px gap above button
        });
      }
    }
  }, [showTour, responses.length]);

  // Enhance marked to add copy buttons to code blocks
  marked.use({
    renderer: {
      code(code, infostring) {
        let codeStr =
          typeof code === "object" && code !== null
            ? code.text || code.raw || JSON.stringify(code, null, 2)
            : String(code);
        const codeId = `code-${hashCode(codeStr + (infostring || ""))}`;
        let highlighted = codeStr;
        try {
          if (infostring && hljs.getLanguage(infostring)) {
            highlighted = hljs.highlight(codeStr, {
              language: infostring,
            }).value;
          } else {
            highlighted = hljs.highlightAuto(codeStr).value;
          }
        } catch (error) {
          highlighted = codeStr;
        }
        return `
          <pre>
            <button class="copy-btn" data-code-id="${codeId}" aria-label="Copy code to clipboard">Copy</button>
            <code id="${codeId}" class="hljs">${highlighted}</code>
          </pre>
        `;
      },
    },
  });

  // Handle copy button clicks
  const handleCopy = useCallback((e) => {
    if (e.target.classList.contains("copy-btn")) {
      const codeId = e.target.getAttribute("data-code-id");
      const codeElem = document.getElementById(codeId);
      if (!codeElem) {
        toast.error("Code block not found.");
        return;
      }
      const codeText = codeElem.textContent;

      // Try Clipboard API if in secure context
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard
          .writeText(codeText)
          .then(() => {
            updateButtonState(e.target, "Copied!", true);
          })
          .catch((err) => {
            console.error("Clipboard API error:", err);
            toast.error("Failed to copy. Secure context (HTTPS) required.");
            updateButtonState(e.target, "Error", false);
          });
      } else {
        // Fallback for non-secure contexts (e.g., IPv4, mobile)
        fallbackCopyTextToClipboard(codeText, e.target);
      }
      e.target.blur();
    }
  }, []);

  // Fallback copy function
  function fallbackCopyTextToClipboard(text, btnElem) {
    try {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      // Place off-screen
      textArea.style.position = "fixed";
      textArea.style.top = "0";
      textArea.style.left = "0";
      textArea.style.width = "2em";
      textArea.style.height = "2em";
      textArea.style.padding = 0;
      textArea.style.border = "none";
      textArea.style.outline = "none";
      textArea.style.boxShadow = "none";
      textArea.style.background = "transparent";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();

      // For iOS Safari
      textArea.setSelectionRange(0, textArea.value.length);

      const successful = document.execCommand("copy");
      document.body.removeChild(textArea);

      if (successful) {
        updateButtonState(btnElem, "Copied!", true);
      } else {
        throw new Error("Copy command failed");
      }
    } catch (err) {
      toast.error("Copy failed. Try selecting the code manually or use HTTPS.");
      updateButtonState(btnElem, "Error", false);
    }
  }

  // Update button state
  function updateButtonState(btnElem, text, success) {
    btnElem.textContent = text;
    btnElem.setAttribute(
      "aria-label",
      success ? "Code copied to clipboard" : "Failed to copy code"
    );
    // Remove the toast from here!
    setTimeout(() => {
      btnElem.textContent = "Copy";
      btnElem.setAttribute("aria-label", "Copy code to clipboard");
    }, 1500);
  }

  // Attach copy event listener
  useEffect(() => {
    const responseBox = responseBoxRef.current;
    if (responseBox) {
      responseBox.addEventListener("click", handleCopy);
      responseBox.addEventListener("touchend", handleCopy); // For mobile
      return () => {
        responseBox.removeEventListener("click", handleCopy);
        responseBox.removeEventListener("touchend", handleCopy);
      };
    }
    // Re-run this effect whenever the design/layout changes
  }, [handleCopy, responses.length]);

  // Auto-scroll to latest response
  useEffect(() => {
    if (responseBoxRef.current && responses.length > 0) {
      const lastResponse = responseBoxRef.current.lastElementChild;
      if (lastResponse) {
        lastResponse.scrollIntoView({ behavior: "smooth", block: "end" });
      }
    }
  }, [responses]);

  const getResponse = async (query, index = null) => {
    if (!query.trim()) {
      toast.error("Please enter a query.");
      return;
    }
    setLoading(true);
    setEditingIndex(null);

    if (index === null) {
      setResponses((prev) => [
        ...prev,
        { query, response: "", loading: true, error: false },
      ]);
    } else {
      setResponses((prev) => {
        const updated = [...prev];
        updated[index] = { query, response: "", loading: true, error: false };
        return updated;
      });
    }
    setQuery("");
    const apiKey = process.env.API_KEY;
    try {
      const response = await fetch(
        "https://openrouter.ai/api/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "meta-llama/llama-3.3-70b-instruct",
            messages: [{ role: "user", content: query }],
          }),
        }
      );

      if (!response.ok)
        throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      const rawMarkdown =
        data.choices[0]?.message?.content || "No response received.";

      const dirtyHtml = marked.parse(String(rawMarkdown));
      const cleanHtml = DOMPurify.sanitize(dirtyHtml, {
        ADD_ATTR: ["data-code-id", "class"],
        ADD_TAGS: ["button"],
      });

      setResponses((prev) => {
        const updated = [...prev];
        updated[index === null ? prev.length - 1 : index] = {
          query,
          response: `<div class="markdown-body">${cleanHtml}</div>`,
          loading: false,
          error: false,
        };
        return updated;
      });
    } catch (error) {
      console.error("Error fetching response:", error);
      toast.error("Failed to load response. Please try again.");
      setResponses((prev) => {
        const updated = [...prev];
        updated[index === null ? prev.length - 1 : index] = {
          query,
          response: `<div style="color:red;">Failed to load response.</div>`,
          loading: false,
          error: true,
        };
        return updated;
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (index, query) => {
    setEditingIndex(index);
    setEditQuery(query);
  };

  const handleEditSubmit = (index) => {
    getResponse(editQuery, index);
  };

  // Heights for header and footer
  const HEADER_HEIGHT = 88;
  const FOOTER_HEIGHT = 80;

  // No chats: Enhanced Grok-like homepage
  if (responses.length === 0) {
    return (
      <div
        style={{
          minHeight: "100vh",
          width: "100vw",
          background: "linear-gradient(135deg, #f0f0f0 0%, #e0e7ff 100%)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        {/* Header */}
        <div
          id="homeContent"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            zIndex: 100,
            background: "#f0f0f0",
            padding: "1.5rem 0",
            borderBottom: "1px solid #e0e0e0",
            boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
          }}
        >
          <Container maxWidth="false">
            <h1
              style={{
                margin: 0,
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              <FaBrain size={40} color="#1976d2" />
              <a
                href=""
                style={{
                  color: "black",
                  textDecoration: "none",
                  fontSize: "1.5rem",
                }}
              >
                AskBottt
              </a>
            </h1>
          </Container>
        </div>
        {/* Centered content */}
        <div
          style={{
            marginTop: "50px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            flex: 1,
            padding: "0 1rem",
            textAlign: "center",
            maxWidth: "800px",
          }}
        >
          <h2
            style={{
              fontSize: "3rem",
              fontWeight: 800,
              color: "#111",
              marginBottom: "1.5rem",
              lineHeight: 1.2,
            }}
          >
            <span className="dynamic-word" style={{ color: "#1976d2" }}>
              {dynamicWord}
            </span>{" "}
            it, Learn it, Master it
          </h2>
          <p
            style={{
              fontSize: "1.3rem",
              color: "#444",
              marginBottom: "2.5rem",
              maxWidth: "600px",
              fontWeight: 300,
            }}
          >
            Unleash your curiosity with AskBot. From coding challenges to deep
            insights, get precise answers powered by cutting-edge AI.
          </p>
          <form
            id="tour-spotlight-form"
            onSubmit={(e) => {
              e.preventDefault();
              getResponse(query);
            }}
            style={{
              width: "100%",
              maxWidth: "600px",
              display: "flex",
              alignItems: "center",
              background: "#fff",
              border: "1.5px solid #bbb",
              borderRadius: "2rem",
              boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
              padding: "0.25rem 0.5rem 0.25rem 1rem",
              gap: "0.5rem",
              transition: "transform 0.2s, box-shadow 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow = "0 6px 16px rgba(0, 0, 0, 0.2)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow =
                "0 4px 12px rgba(0, 0, 0, 0.15)";
            }}
          >
            <textarea
              rows={1}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && e.shiftKey) {
                  e.preventDefault();
                  getResponse(query);
                }
              }}
              placeholder="Ask me anything..."
              style={{
                flex: 1,
                resize: "none",
                border: "none",
                outline: "none",
                fontSize: "1.1rem",
                fontFamily: "inherit",
                background: "transparent",
                minHeight: "40px",
                maxHeight: "120px",
                padding: "0.7rem 0",
                margin: 0,
                color: "#222",
                borderRadius: "0",
                boxShadow: "none",
                lineHeight: 1.5,
                overflowY: "auto",
              }}
              disabled={loading}
            />
            <button
              id="landing-send-btn"
              type="submit"
              style={{
                background: "#1976d2",
                color: "#fff",
                border: "none",
                borderRadius: "50%",
                width: "44px",
                height: "44px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "2rem",
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.7 : 1,
                transition: "background 0.2s, transform 0.2s",
                margin: 0,
              }}
              disabled={loading}
              aria-label="Send"
            >
              {loading ? (
                <span>
                  <span
                    className="dot-pulse-black"
                    style={{ animationDelay: "0.2s" }}
                  />
                </span>
              ) : (
                <IoMdSend color="#fff" />
              )}
            </button>
          </form>

          <div className="feature-boxes">
            <div className="feature-box" tabIndex="0">
              <FaCode size={24} />
              <h3>Code Smarter</h3>
              <p>Instant fixes for coding challenges.</p>
            </div>
            <div className="feature-box" tabIndex="0">
              <FaBolt size={24} />
              <h3>Rapid Answers</h3>
              <p>Quick solutions to any question.</p>
            </div>
            <div className="feature-box" tabIndex="0">
              <FaCompass size={24} />
              <h3>Navigate Knowledge</h3>
              <p>Find answers across any topic.</p>
            </div>
            <div className="feature-box" tabIndex="0">
              <FaRocket size={24} />
              <h3>Boost Productivity</h3>
              <p>Streamline tasks with smart solutions.</p>
            </div>
            <div className="feature-box" tabIndex="0">
              <FaBookOpen size={24} />
              <h3>Deep Insights</h3>
              <p>Explore complex topics effortlessly.</p>
            </div>
          </div>
        </div>

        {showTour && (
          <div className="tour-overlay" onClick={() => setShowTour(false)}>
            <div id="tour-spotlight-blur" />
            <div
              className="tour-tooltip-home"
              style={{
                position: "fixed",
                left: tourPosition.left,
                bottom: tourPosition.bottom,
                transform: "translateX(-50%)",
                zIndex: 10001,
              }}
            >
              <div>
                <b>Tip:</b> You can use <kbd>Shift</kbd> + <kbd>Enter</kbd> to
                send your query!
              </div>
              <button
                className="tour-close"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowTour(false);
                }}
              >
                Got it
              </button>
              <div className="tour-arrow-home" />
            </div>
          </div>
        )}
      </div>
    );
  }

  // Chat UI with bottom input
  return (
    <>
      <div
        style={{
          minHeight: "100vh",
          width: "100vw",
          backgroundColor: "#f0f0f0",
          overflowY: "auto",
        }}
      >
        {/* Header */}
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            zIndex: 100,
            background: "#f0f0f0",
            padding: "1.5rem 0",
            borderBottom: "1px solid #e0e0e0",
            boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
          }}
        >
          <Container maxWidth="false">
            <h1
              style={{
                margin: 0,
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              <FaBrain size={40} color="#1976d2" />
              <a
                href=""
                style={{
                  color: "black",
                  textDecoration: "none",
                  fontSize: "1.5rem",
                }}
              >
                AskBottt
              </a>
            </h1>
          </Container>
        </div>

        {/* Responses */}
        <Container
          maxWidth="false"
          id="responseBox"
          ref={responseBoxRef}
          style={{
            marginTop: HEADER_HEIGHT,
            marginBottom: FOOTER_HEIGHT,
            minHeight: `calc(100vh - ${HEADER_HEIGHT + FOOTER_HEIGHT}px)`,
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-start",
            padding: "1rem 0",
          }}
        >
          {responses.map((item, idx) => (
            <div key={idx} style={{ width: "100%", marginBottom: "1rem" }}>
              {/* Query */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  width: "100%",
                  alignItems: "center",
                  gap: "0.5rem",
                }}
              >
                {editingIndex === idx ? (
                  <div
                    style={{
                      fontWeight: "bold",
                      color: "white",
                      backgroundColor: "#1976d2",
                      padding: "0.5rem 1rem",
                      borderRadius: "16px",
                      marginBottom: "2px",
                      maxWidth: "70%",
                      wordBreak: "break-word",
                      marginRight: "10px",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                    }}
                  >
                    <textarea
                      rows={1}
                      value={editQuery}
                      onChange={(e) => setEditQuery(e.target.value)}
                      style={{
                        flex: 1,
                        resize: "none",
                        border: "none",
                        outline: "none",
                        fontSize: "1rem",
                        fontFamily: "inherit",
                        background: "transparent",
                        minHeight: "32px",
                        maxHeight: "120px",
                        padding: "0.5rem 0",
                        margin: "0 0 0 2px",
                        color: "#fff",
                        borderRadius: "0",
                        boxShadow: "none",
                        lineHeight: 1.5,
                        overflowY: "auto",
                      }}
                    />
                    <button
                      onClick={() => handleEditSubmit(idx)}
                      style={{
                        background: "white",
                        border: "none",
                        borderRadius: "50%",
                        width: "28px",
                        height: "28px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        padding: 0,
                      }}
                      aria-label="Submit edit"
                    >
                      <FaCheck size={14} color="green" />
                    </button>
                    <button
                      onClick={() => setEditingIndex(null)}
                      style={{
                        background: "white",
                        border: "none",
                        borderRadius: "50%",
                        width: "28px",
                        height: "28px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        padding: 0,
                      }}
                      aria-label="Cancel edit"
                    >
                      <FaTimes size={14} color="red" />
                    </button>
                  </div>
                ) : (
                  <>
                    <div
                      style={{
                        position: "relative",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "flex-end",
                        maxWidth: "70%",
                        marginRight: "10px",
                      }}
                      className="query-bubble-container"
                    >
                      <div
                        style={{
                          fontWeight: "bold",
                          color: "white",
                          backgroundColor: "#1976d2",
                          padding: "1rem",
                          borderRadius: "16px",
                          marginBottom: "2px",
                          wordBreak: "break-word",
                          textAlign: "right",
                          // width: "100%",
                        }}
                        className="query-bubble"
                      >
                        {item.query}
                      </div>
                      <button
                        onClick={() => handleEdit(idx, item.query)}
                        className="edit-query-btn"
                        style={{
                          background: "#e3e3e3",
                          border: "none",
                          borderRadius: "50%",
                          width: "28px",
                          height: "28px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          cursor: "pointer",
                          padding: 0,
                          marginTop: "4px",
                          visibility: "hidden", // hidden by default, shown on hover via CSS
                          transition: "visibility 0.2s, opacity 0.2s",
                          opacity: 0,
                        }}
                        aria-label="Edit query"
                      >
                        <FaEdit id="edit" size={14} color="#1976d2" />
                      </button>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        gap: "0.25rem",
                        marginRight: "10px",
                      }}
                    >
                      {item.error && (
                        <button
                          onClick={() => getResponse(item.query, idx)}
                          style={{
                            background: "#ffeaea",
                            border: "none",
                            borderRadius: "50%",
                            width: "28px",
                            height: "28px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            cursor: "pointer",
                            padding: 0,
                          }}
                          aria-label="Retry query"
                        >
                          <FaRedo size={14} color="#d32f2f" />
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
              {/* Response */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-start",
                  width: "100%",
                }}
              >
                {item.loading ? (
                  <span style={{ display: "flex", marginLeft: "50px" }}>
                    <span className="dot-pulse-black" />
                    <span
                      className="dot-pulse-black"
                      style={{ animationDelay: "0.2s" }}
                    />
                    <span
                      className="dot-pulse-black"
                      style={{ animationDelay: "0.4s" }}
                    />
                  </span>
                ) : (
                  <div
                    className="response"
                    style={{
                      backgroundColor: "#f8f9fa",
                      borderRadius: "16px",
                      marginLeft: "10px",
                      maxWidth: "70%",
                      wordBreak: "break-word",
                      minHeight: "48px",
                      border: "1px solid #e0e0e0",
                      boxShadow: item.loading
                        ? "0 0 8px 2px #1976d233"
                        : "none",
                      transition: "box-shadow 0.3s",
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
                    <span dangerouslySetInnerHTML={{ __html: item.response }} />
                  </div>
                )}
              </div>
            </div>
          ))}
        </Container>

        {/* Bottom Input */}
        <div
          style={{
            position: "fixed",
            bottom: 0,
            left: 0,
            width: "100vw",
            backgroundColor: "#f0f0f0",
            padding: "1rem 0",
            zIndex: 100,
            borderTop: "1px solid #e0e0e0",
          }}
        >
          <Container
            maxWidth="lg"
            style={{ display: "flex", alignItems: "center" }}
          >
            <form
              onSubmit={(e) => {
                e.preventDefault();
                getResponse(query);
              }}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                background: "#fff",
                border: "1.5px solid #bbb",
                borderRadius: "2rem",
                boxShadow: "0 2px 8px #0001",
                padding: "0.25rem 0.5rem 0.25rem 1rem",
                gap: "0.5rem",
              }}
            >
              <textarea
                rows={1}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && e.shiftKey) {
                    e.preventDefault();
                    getResponse(query);
                  }
                }}
                placeholder="Ask me anything..."
                style={{
                  flex: 1,
                  resize: "none",
                  border: "none",
                  outline: "none",
                  fontSize: "1.1rem",
                  fontFamily: "inherit",
                  background: "transparent",
                  minHeight: "40px",
                  maxHeight: "120px",
                  padding: "0.7rem 0",
                  margin: 0,
                  color: "#222",
                  borderRadius: "0",
                  boxShadow: "none",
                  lineHeight: 1.5,
                  overflowY: "auto",
                }}
                disabled={loading}
              />

              {loading ? (
                <span>
                  <span
                    className="dot-pulse-black"
                    style={{
                      animationDelay: "0.2s",
                      width: "20px",
                      height: "20px",
                    }}
                  />
                </span>
              ) : (
                <button
                  type="submit"
                  style={{
                    background: "#1976d2",
                    color: "#fff",
                    border: "none",
                    borderRadius: "50%",
                    width: "44px",
                    height: "44px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "2rem",
                    cursor: loading ? "not-allowed" : "pointer",
                    opacity: loading ? 0.7 : 1,
                    transition: "background 0.2s",
                    margin: 0,
                  }}
                  disabled={loading}
                  aria-label="Send"
                >
                  <IoMdSend color="#fff" />
                </button>
              )}
            </form>
          </Container>
        </div>
        <ToastContainer />
      </div>
    </>
  );
}

export default App;
