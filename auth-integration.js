// auth-integration.js - Connect your HTML to Firebase Auth

class AuthIntegration {
  constructor() {
    this.authManager = window.authManager;
    this.init();
  }

  init() {
    // Wait for auth manager to be ready
    if (!this.authManager) {
      console.warn("Auth manager not loaded yet, retrying...");
      setTimeout(() => this.init(), 500);
      return;
    }

    // Setup event listeners
    this.setupEventListeners();

    // Initial UI update
    this.updateAuthUI();

    // Listen for auth changes
    window.addEventListener("authStateChanged", (event) => {
      this.updateAuthUI();
    });
  }

  setupEventListeners() {
    // Google Sign-In Button
    const googleBtn = document.getElementById("google-signin-btn");
    if (googleBtn) {
      googleBtn.addEventListener("click", () => this.handleGoogleSignIn());
    }

    // Logout Button
    const logoutBtn = document.getElementById("logout-btn");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", () => this.handleLogout());
    }

    // If buttons don't exist yet, create them
    if (!googleBtn && !logoutBtn) {
      this.createAuthButtons();
    }
  }

  async handleGoogleSignIn() {
    try {
      const googleBtn = document.getElementById("google-signin-btn");

      // Show loading state
      if (googleBtn) {
        const originalHTML = googleBtn.innerHTML;
        googleBtn.innerHTML = "<span>Signing in...</span>";
        googleBtn.disabled = true;

        setTimeout(() => {
          if (googleBtn) {
            googleBtn.innerHTML = originalHTML;
            googleBtn.disabled = false;
          }
        }, 5000);
      }

      const result = await this.authManager.signInWithGoogle();

      if (result.success) {
        this.showNotification("✅ Successfully signed in!", "success");
        console.log("Google Sign-In successful:", result.user);
      } else {
        this.showNotification(`❌ ${result.error}`, "error");
      }
    } catch (error) {
      console.error("Google Sign-In error:", error);
      this.showNotification("❌ Failed to sign in", "error");
    }
  }

  async handleLogout() {
    try {
      const result = await this.authManager.logout();
      if (result.success) {
        this.showNotification("👋 Signed out successfully", "success");
      }
    } catch (error) {
      console.error("Logout error:", error);
      this.showNotification("❌ Failed to sign out", "error");
    }
  }

  updateAuthUI() {
    const isAuthenticated = this.authManager.isAuthenticated();
    const user = this.authManager.getUser();

    const signedOutDiv = document.getElementById("signed-out");
    const signedInDiv = document.getElementById("signed-in");
    const userName = document.getElementById("user-name");
    const userAvatar = document.getElementById("user-avatar");
    const userPlan = document.getElementById("user-plan");

    if (isAuthenticated && user) {
      // Show signed-in UI
      if (signedOutDiv) signedOutDiv.style.display = "none";
      if (signedInDiv) signedInDiv.style.display = "block";

      // Update user info
      if (userName) {
        userName.textContent = user.name || user.email;
      }

      if (userAvatar) {
        userAvatar.src = user.photoURL || this.getDefaultAvatar(user);
        userAvatar.alt = user.name || "User avatar";
      }

      if (userPlan) {
        const plan = user.plan || "free";
        userPlan.textContent = `${plan.charAt(0).toUpperCase() + plan.slice(1)} Plan`;
      }
    } else {
      // Show signed-out UI
      if (signedOutDiv) signedOutDiv.style.display = "block";
      if (signedInDiv) signedInDiv.style.display = "none";
    }

    // Update any premium features
    this.updatePremiumFeatures(isAuthenticated, user);
  }

  updatePremiumFeatures(isAuthenticated, user) {
    // Example: Show/hide premium features
    const premiumElements = document.querySelectorAll("[data-requires-auth]");
    premiumElements.forEach((element) => {
      element.style.display = isAuthenticated ? "block" : "none";
    });

    // Update plan-specific features
    const plan = user?.plan || "free";
    const premiumOnly = document.querySelectorAll('[data-plan="premium"]');
    const standardOnly = document.querySelectorAll('[data-plan="standard"]');

    if (plan === "premium") {
      premiumOnly.forEach((el) => (el.style.display = "block"));
      standardOnly.forEach((el) => (el.style.display = "block"));
    } else if (plan === "standard") {
      premiumOnly.forEach((el) => (el.style.display = "none"));
      standardOnly.forEach((el) => (el.style.display = "block"));
    } else {
      premiumOnly.forEach((el) => (el.style.display = "none"));
      standardOnly.forEach((el) => (el.style.display = "none"));
    }
  }

  createAuthButtons() {
    // Create auth buttons if they don't exist
    const container = document.getElementById("auth-container");
    if (!container) return;

    container.innerHTML = `
      <div id="signed-out" class="auth-state">
        <button id="google-signin-btn" class="btn-google">
          <svg width="18" height="18" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
            <path fill="#4285F4" d="M46.44 24.6c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
          </svg>
          Sign in with Google
        </button>
      </div>
      
      <div id="signed-in" class="auth-state" style="display: none;">
        <div class="user-profile">
          <img id="user-avatar" src="" alt="User avatar" class="user-avatar">
          <div class="user-info">
            <span id="user-name" class="user-name"></span>
            <span id="user-plan" class="user-plan">Free Plan</span>
          </div>
          <button id="logout-btn" class="btn-logout">Logout</button>
        </div>
      </div>
    `;

    // Re-attach event listeners
    setTimeout(() => this.setupEventListeners(), 100);
  }

  getDefaultAvatar(user) {
    const name = user.name || user.email || "User";
    const colors = ["#2E7D32", "#1565C0", "#6A1B9A", "#C62828", "#FF8F00"];
    const color = colors[name.length % colors.length];
    const initials = name.substring(0, 2).toUpperCase();

    return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=${color.substring(1)}&color=fff&size=150`;
  }

  showNotification(message, type = "info") {
    // Remove existing notification
    const existing = document.querySelector(".auth-notification");
    if (existing) existing.remove();

    // Create notification
    const notification = document.createElement("div");
    notification.className = `auth-notification auth-notification-${type}`;
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 24px;
      border-radius: 8px;
      color: white;
      font-weight: 500;
      z-index: 10000;
      animation: slideInRight 0.3s ease;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    `;

    if (type === "success") {
      notification.style.background =
        "linear-gradient(135deg, #4caf50, #2e7d32)";
    } else if (type === "error") {
      notification.style.background =
        "linear-gradient(135deg, #f44336, #c62828)";
    } else {
      notification.style.background =
        "linear-gradient(135deg, #2196f3, #1565c0)";
    }

    document.body.appendChild(notification);

    // Auto-remove after 3 seconds
    setTimeout(() => {
      notification.style.animation = "slideOutRight 0.3s ease";
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }
}

// Add CSS animations for notifications
const notificationStyles = document.createElement("style");
notificationStyles.textContent = `
  @keyframes slideInRight {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  
  @keyframes slideOutRight {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(100%);
      opacity: 0;
    }
  }
`;
document.head.appendChild(notificationStyles);

// Initialize when page loads
document.addEventListener("DOMContentLoaded", () => {
  // Wait for auth manager to be available
  const checkAuthManager = setInterval(() => {
    if (window.authManager) {
      clearInterval(checkAuthManager);
      window.authIntegration = new AuthIntegration();
    }
  }, 100);
});

// Instead of targeting the old button:
// document.getElementById('google-signin-btn').addEventListener('click', ...);

// Target both new buttons:
document
  .getElementById("google-signin-btn")
  ?.addEventListener("click", handleGoogleAuth);
document
  .getElementById("google-signup-btn")
  ?.addEventListener("click", handleGoogleAuth);
