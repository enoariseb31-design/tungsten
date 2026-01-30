// script.js - Works with your auth.js
(function () {
  "use strict";

  const API_URL = "http://localhost:3001";

  // ============ INITIALIZATION ============
  function init() {
    console.log("🚀 Tungs AI Initializing...");

    // Wait for authManager
    const checkAuth = setInterval(() => {
      if (window.authManager) {
        clearInterval(checkAuth);
        console.log(
          "✅ AuthManager ready. User authenticated?",
          window.authManager.isAuthenticated(),
        );
        setupApp();
      }
    }, 100);
  }

  // ============ APP SETUP ============
  function setupApp() {
    console.log("✅ AuthManager ready");

    // Setup auth event listeners
    setupAuthUI();

    // Setup chat
    setupChat();

    // Setup history sidebar
    setupHistorySidebar();

    // Check initial auth state
    if (window.authManager.isAuthenticated()) {
      showChatInterface();
      loadAndDisplayHistory(); // Load history on startup
    } else {
      showLandingPage();
    }
  }

  // ============ HISTORY SIDEBAR SETUP ============
  function setupHistorySidebar() {
    const historyToggleBtn = document.getElementById("history-toggle");
    const historySidebar = document.getElementById("history-sidebar");
    const closeHistoryBtn = document.getElementById("close-history");
    const historyList = document.getElementById("history-list");
    const clearHistoryBtn = document.getElementById("clear-history");

    if (!historyToggleBtn || !historySidebar) {
      console.warn("History sidebar elements not found");
      return;
    }

    // Toggle sidebar visibility
    historyToggleBtn.addEventListener("click", () => {
      console.log("History toggle clicked");
      historySidebar.classList.toggle("active");
      // Load history when sidebar opens
      if (historySidebar.classList.contains("active")) {
        loadAndDisplayHistory();
      }
    });

    // Close sidebar
    if (closeHistoryBtn) {
      closeHistoryBtn.addEventListener("click", () => {
        historySidebar.classList.remove("active");
      });
    }

    // Clear history
    if (clearHistoryBtn) {
      clearHistoryBtn.addEventListener("click", async () => {
        if (confirm("Clear all chat history? This cannot be undone.")) {
          await clearChatHistory();
          if (historyList) historyList.innerHTML = "";
          showNotification("History cleared", "success");
        }
      });
    }

    // Close sidebar when clicking outside
    document.addEventListener("click", (e) => {
      if (
        historySidebar.classList.contains("active") &&
        !historySidebar.contains(e.target) &&
        e.target !== historyToggleBtn &&
        !historyToggleBtn.contains(e.target)
      ) {
        historySidebar.classList.remove("active");
      }
    });

    console.log("✅ History sidebar setup complete");
  }

  // ============ HISTORY FUNCTIONS ============
  async function loadAndDisplayHistory() {
    try {
      const history = await loadChatHistory();
      updateHistorySidebar(history);
    } catch (error) {
      console.error("Failed to load history:", error);
    }
  }

  async function loadChatHistory() {
    const user = window.authManager?.getUser();
    if (!user?.uid) {
      console.log("No user logged in, cannot load history");
      return [];
    }

    try {
      const response = await fetch(
        `${API_URL}/api/chat/history/${user.uid}?limit=50`,
      );
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      console.log("Loaded history items:", data.history?.length || 0);
      return data.history || [];
    } catch (error) {
      console.error("Failed to load history:", error);
      return [];
    }
  }

  function updateHistorySidebar(history) {
    const historyList = document.getElementById("history-list");
    if (!historyList) {
      console.error("History list element not found");
      return;
    }

    // Clear existing items (keep "New Chat" button if it exists)
    const existingItems = historyList.querySelectorAll(
      ".history-item:not(.new-chat)",
    );
    existingItems.forEach((item) => item.remove());

    // If no history items, show empty state
    if (!history || history.length === 0) {
      const emptyState = document.createElement("div");
      emptyState.className = "history-empty";
      emptyState.innerHTML = `
        <i class="fas fa-history"></i>
        <p>No chat history yet</p>
        <small>Start a conversation to see it here</small>
      `;
      historyList.appendChild(emptyState);
      return;
    }

    // Add history items in reverse chronological order (newest first)
    history.forEach((item, index) => {
      const historyItem = document.createElement("div");
      historyItem.className = "history-item";
      historyItem.dataset.id = item.id;

      // Create a short preview of the conversation
      const preview =
        item.user_message.substring(0, 40) +
        (item.user_message.length > 40 ? "..." : "");

      const date = new Date(item.created_at);
      const timeString =
        date.toLocaleDateString() +
        " " +
        date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

      historyItem.innerHTML = `
        <div class="history-icon">
          <i class="fas fa-comment"></i>
        </div>
        <div class="history-content">
          <div class="history-title">${escapeHtml(preview)}</div>
          <div class="history-time">${timeString}</div>
        </div>
      `;

      historyItem.addEventListener("click", () => {
        loadChatIntoView(item);
        // Close sidebar on mobile
        const historySidebar = document.getElementById("history-sidebar");
        if (window.innerWidth < 768) {
          historySidebar.classList.remove("active");
        }
      });

      // Insert after "New Chat" button or at the beginning
      const newChatBtn = historyList.querySelector(".new-chat");
      if (newChatBtn && newChatBtn.nextSibling) {
        historyList.insertBefore(historyItem, newChatBtn.nextSibling);
      } else {
        historyList.appendChild(historyItem);
      }
    });

    console.log("Updated history sidebar with", history.length, "items");
  }

  function loadChatIntoView(historyItem) {
    const messagesContainer = document.getElementById("chatbot-messages");
    if (!messagesContainer) return;

    // Clear current messages
    messagesContainer.innerHTML = "";

    // Add history messages
    addMessage("user", historyItem.user_message);
    addMessage("bot", historyItem.bot_response);

    showNotification("Loaded conversation from history", "info");
  }

  async function clearChatHistory() {
    const user = window.authManager?.getUser();
    if (!user?.uid) return false;

    try {
      // Note: You need to implement a clear history endpoint on your server
      // For now, we'll just clear locally
      return true;
    } catch (error) {
      console.error("Failed to clear history:", error);
      return false;
    }
  }

  async function saveChatHistory(userMessage, botResponse, tokensUsed) {
    const user = window.authManager?.getUser();
    if (!user?.uid) {
      console.log("No user logged in, skipping history save");
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/chat/history`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.uid,
          userMessage,
          botResponse,
          tokensUsed: tokensUsed || 0,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      console.log("Chat history saved");

      // Refresh history sidebar if it's open
      const historySidebar = document.getElementById("history-sidebar");
      if (historySidebar.classList.contains("active")) {
        await loadAndDisplayHistory();
      }
    } catch (error) {
      console.error("Failed to save history:", error);
    }
  }

  // ============ CHAT SYSTEM (Updated) ============
  function setupChat() {
    const chatInput = document.getElementById("chatbot-input");
    const sendBtn = document.getElementById("send-btn");

    if (!chatInput || !sendBtn) {
      console.log("Chat elements not ready yet");
      setTimeout(setupChat, 500);
      return;
    }

    // Send message function
    async function sendMessage() {
      const message = chatInput.value.trim();
      if (!message) return;

      // Check if user is authenticated
      if (!window.authManager?.isAuthenticated()) {
        alert("Please login first");
        return;
      }

      // Check message limit
      if (!window.authManager.canSendMessage()) {
        alert("You have reached your message limit for this plan");
        return;
      }

      // Add user message
      addMessage("user", message);
      chatInput.value = "";

      // Show typing indicator
      const typingId = showTyping();

      try {
        const user = window.authManager.getUser();
        const response = await fetch(`${API_URL}/api/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message,
            userId: user?.uid,
          }),
        });

        const data = await response.json();
        removeTyping(typingId);

        if (data.error) {
          addMessage("bot", `Error: ${data.message || data.error}`);
        } else {
          addMessage("bot", data.response);

          // Save to history
          await saveChatHistory(message, data.response, data.tokensUsed);

          // Increment message count
          await window.authManager.incrementMessageCount();
          updateTokenDisplay();
        }
      } catch (error) {
        removeTyping(typingId);
        addMessage("bot", `Connection error: ${error.message}`);
        console.error("Chat error:", error);
      }
    }

    // Event listeners
    sendBtn.addEventListener("click", sendMessage);
    chatInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });

    // Add "New Chat" button functionality
    const newChatBtn = document.querySelector(".new-chat");
    if (newChatBtn) {
      newChatBtn.addEventListener("click", () => {
        const messagesContainer = document.getElementById("chatbot-messages");
        if (messagesContainer) {
          messagesContainer.innerHTML = "";
          addMessage("bot", "Hello! I'm Tungs AI. How can I help you today?");
          showNotification("Started new conversation", "info");
        }
      });
    }

    console.log("💬 Chat system ready");
  }

  // ============ AUTH UI SETUP ============
  function setupAuthUI() {
    // ... [Keep your existing auth setup code] ...
  }

  // ============ PAGE MANAGEMENT ============
  function showChatInterface() {
    console.log("🔄 Switching to chat interface...");

    const landing = document.querySelector(".landing-container");
    const chat = document.getElementById("chatbot-wrapper");

    if (landing) {
      landing.style.display = "none";
      console.log("✅ Hidden landing page");
    }

    if (chat) {
      chat.style.display = "block";
      chat.classList.remove("hidden");
      console.log("✅ Showed chat interface");
    }
  }

  function showLandingPage() {
    console.log("🔄 Switching to landing page...");

    const landing = document.querySelector(".landing-container");
    const chat = document.getElementById("chatbot-wrapper");

    if (landing) {
      landing.style.display = "block";
      console.log("✅ Showed landing page");
    }

    if (chat) {
      chat.style.display = "none";
      console.log("✅ Hidden chat interface");
    }
  }

  function updateUserUI(user) {
    // Update email display
    document
      .querySelectorAll("#user-email, #sidebar-user-email")
      .forEach((el) => {
        if (el) el.textContent = user.email;
      });

    // Update plan badge if exists
    const planBadge = document.querySelector(".plan-badge");
    if (planBadge) {
      planBadge.textContent = `${user.plan} Plan`;
      planBadge.className = `plan-badge plan-${user.plan}`;
    }
  }

  function updateTokenDisplay() {
    const user = window.authManager?.getUser();
    if (!user) return;

    const tokenCount = document.getElementById("token-count");
    const currentTokens = document.getElementById("current-tokens");

    if (tokenCount) {
      const used = user.messagesUsed || 0;
      const limit = window.authManager.getPlanLimit(user.plan);
      tokenCount.textContent = `${used}/${limit} tokens`;
    }

    if (currentTokens) {
      const used = user.messagesUsed || 0;
      const limit = window.authManager.getPlanLimit(user.plan);
      currentTokens.textContent = limit - used;
    }
  }

  // ============ CHAT UI HELPERS ============
  function addMessage(sender, text) {
    const messagesContainer = document.getElementById("chatbot-messages");
    if (!messagesContainer) return;

    // Add welcome message if empty
    if (messagesContainer.children.length === 0 && sender === "user") {
      addMessage("bot", "Hello! I'm Tungs AI. How can I help you today?");
    }

    const messageDiv = document.createElement("div");
    messageDiv.className = `message ${sender}`;

    const time = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    messageDiv.innerHTML = `
      <div class="message-text">${escapeHtml(text)}</div>
      <div class="message-time">${time}</div>
    `;

    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  function showTyping() {
    const messagesContainer = document.getElementById("chatbot-messages");
    if (!messagesContainer) return null;

    const typingDiv = document.createElement("div");
    typingDiv.className = "typing-indicator";
    typingDiv.id = "typing-" + Date.now();
    typingDiv.innerHTML = `
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
    `;

    messagesContainer.appendChild(typingDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    return typingDiv.id;
  }

  function removeTyping(id) {
    const typing = document.getElementById(id);
    if (typing) typing.remove();
  }

  function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  function showNotification(message, type = "info") {
    // Simple notification
    console.log(`${type}: ${message}`);
    // Optional: Implement a toast notification system
  }

  // ============ START APP ============
  document.addEventListener("DOMContentLoaded", init);

  // Make functions available globally if needed
  window.TungsAI = {
    loadAndDisplayHistory,
    saveChatHistory,
    loadChatIntoView,
    updateTokenDisplay,
  };
})();
