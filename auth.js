// auth.js - Complete Unified Authentication System (No Demo)
(function () {
  "use strict";

  const API_URL = "http://localhost:3001";

  class AuthManager {
    constructor() {
      this.currentUser = null;
      this.isFirebaseLoaded = false;
      this.auth = null;
      this.googleProvider = null;
      
      console.log("🎯 AuthManager initializing...");
      this.init();
    }

    async init() {
      // Load user from localStorage first
      this.loadFromStorage();

      // Initialize Firebase immediately
      await this.initFirebase();
      
      // Setup event listeners for UI
      this.setupEventListeners();
      
      // Check initial state
      if (this.currentUser) {
        this.showChatInterface();
        this.updateUI();
      }
      
      console.log("✅ AuthManager ready");
    }

    async initFirebase() {
      try {
        // Dynamically import Firebase
        const { initializeApp } =
          await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js");
        const {
          getAuth,
          signInWithEmailAndPassword,
          createUserWithEmailAndPassword,
          signInWithPopup,
          GoogleAuthProvider,
          signOut,
          onAuthStateChanged,
          updateProfile,
        } =
          await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js");

        // Your Firebase configuration
        const firebaseConfig = {
          apiKey: "AIzaSyCaEr10IUsw_RBjGY_LODpFKWH0pjV8gho",
          authDomain: "chatflow-df777.firebaseapp.com",
          projectId: "chatflow-df777",
          storageBucket: "chatflow-df777.firebasestorage.app",
          messagingSenderId: "1065402960315",
          appId: "1:1065402960315:web:48a4b91c6269d7d4be5c9e",
          measurementId: "G-P2XD0B23DH"
        };

        // Initialize Firebase
        const app = initializeApp(firebaseConfig);
        this.auth = getAuth(app);
        this.googleProvider = new GoogleAuthProvider();
        this.isFirebaseLoaded = true;

        // Listen for Firebase auth changes
        onAuthStateChanged(this.auth, async (firebaseUser) => {
          if (firebaseUser) {
            await this.handleFirebaseUser(firebaseUser);
          } else {
            console.log("Firebase user signed out");
          }
        });

        console.log("✅ Firebase initialized");
      } catch (error) {
        console.warn("Firebase initialization failed:", error.message);
        this.isFirebaseLoaded = false;
      }
    }

    setupEventListeners() {
      // Wait for DOM to be ready
      document.addEventListener('DOMContentLoaded', () => {
        // Google button
        const googleBtn = document.getElementById('google-auth-btn');
        if (googleBtn) {
          googleBtn.addEventListener('click', () => this.handleGoogleLogin());
        }

        // Logout button
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
          logoutBtn.addEventListener('click', () => this.logout());
        }

        // Auth modal buttons
        const loginBtn = document.getElementById('open-login');
        const startFreeBtn = document.getElementById('start-free');
        const selectFreeBtn = document.getElementById('select-free');
        
        [loginBtn, startFreeBtn, selectFreeBtn].forEach(btn => {
          if (btn) {
            btn.addEventListener('click', () => this.showAuthModal());
          }
        });

        // Close auth modal
        const closeAuthBtn = document.getElementById('close-auth');
        if (closeAuthBtn) {
          closeAuthBtn.addEventListener('click', () => this.hideAuthModal());
        }

        // Form submissions
        const loginForm = document.getElementById('login-form');
        const registerForm = document.getElementById('register-form');
        
        if (loginForm) {
          loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLoginForm();
          });
        }
        
        if (registerForm) {
          registerForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleRegisterForm();
          });
        }

        // Tab switching
        document.querySelectorAll('.auth-tab').forEach(tab => {
          tab.addEventListener('click', () => {
            const tabName = tab.dataset.tab;
            this.switchAuthTab(tabName);
          });
        });

        // Auto-focus email field when modal opens
        document.addEventListener('click', (e) => {
          if (e.target.matches('#open-login, #start-free, #select-free')) {
            setTimeout(() => {
              const emailInput = document.querySelector('#login-email');
              if (emailInput) emailInput.focus();
            }, 100);
          }
        });
      });
    }

    // ============ UI METHODS ============
    showAuthModal() {
      const authModal = document.getElementById('auth-modal');
      if (authModal) {
        authModal.classList.remove('hidden');
        this.switchAuthTab('login');
      }
    }

    hideAuthModal() {
      const authModal = document.getElementById('auth-modal');
      if (authModal) {
        authModal.classList.add('hidden');
      }
    }

    switchAuthTab(tabName) {
      // Update tabs
      document.querySelectorAll('.auth-tab').forEach(tab => {
        tab.classList.remove('active');
        if (tab.dataset.tab === tabName) {
          tab.classList.add('active');
        }
      });
      
      // Update forms
      document.querySelectorAll('.auth-form').forEach(form => {
        form.classList.remove('active');
        if (form.id === `${tabName}-form`) {
          form.classList.add('active');
        }
      });
    }

    showChatInterface() {
      console.log("🔄 Showing chat interface...");
      
      const landing = document.querySelector('.landing-container');
      const chat = document.getElementById('chatbot-wrapper');
      
      if (landing) {
        landing.style.display = 'none';
        landing.classList.add('hide-landing');
      }
      
      if (chat) {
        chat.style.display = 'block';
        chat.classList.remove('hidden');
        chat.classList.add('show-chat');
      }
      
      // Update UI with user info
      this.updateUI();
    }

    showLoginPage() {
      console.log("🔄 Showing login page...");
      
      const landing = document.querySelector('.landing-container');
      const chat = document.getElementById('chatbot-wrapper');
      
      if (landing) {
        landing.style.display = 'block';
        landing.classList.remove('hide-landing');
      }
      
      if (chat) {
        chat.style.display = 'none';
        chat.classList.add('hidden');
        chat.classList.remove('show-chat');
      }
    }

    updateUI() {
      if (!this.currentUser) return;
      
      // Update email displays
      document.querySelectorAll('#user-email, #sidebar-user-email').forEach(el => {
        if (el) el.textContent = this.currentUser.email;
      });
      
      // Update plan badge
      const planBadge = document.querySelector('.plan-badge');
      if (planBadge) {
        planBadge.textContent = `${this.currentUser.plan || 'free'} Plan`;
        planBadge.className = `plan-badge plan-${this.currentUser.plan || 'free'}`;
      }
      
      // Update token count
      const tokenCount = document.getElementById('token-count');
      const currentTokens = document.getElementById('current-tokens');
      
      if (tokenCount) {
        const used = this.currentUser.messages_used || 0;
        const limit = this.currentUser.max_messages || 20;
        tokenCount.textContent = `${used}/${limit} tokens`;
      }
      
      if (currentTokens) {
        const used = this.currentUser.messages_used || 0;
        const limit = this.currentUser.max_messages || 20;
        currentTokens.textContent = limit - used;
      }
    }

    // ============ FORM HANDLERS ============
    async handleLoginForm() {
      const loginForm = document.getElementById('login-form');
      if (!loginForm) return;
      
      const email = loginForm.querySelector('#login-email')?.value.trim();
      const password = loginForm.querySelector('#login-password')?.value;
      
      if (!email) {
        this.showNotification('Please enter email', 'error');
        return;
      }
      
      // Show loading state
      const submitBtn = loginForm.querySelector('button[type="submit"]');
      const originalText = submitBtn?.textContent;
      if (submitBtn) {
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';
        submitBtn.disabled = true;
      }
      
      try {
        // If password is provided, try Firebase login
        if (password && this.isFirebaseLoaded) {
          const result = await this.firebaseEmailLogin(email, password);
          if (result.success) {
            this.hideAuthModal();
            this.showNotification('Login successful!', 'success');
            return;
          } else {
            this.showNotification(result.error || 'Firebase login failed', 'error');
            return;
          }
        }
        
        // Fallback to local auth (email only)
        const result = await this.localLogin(email);
        if (result.success) {
          this.hideAuthModal();
          this.showNotification('Welcome back!', 'success');
        } else {
          this.showNotification(result.error || 'Login failed', 'error');
        }
      } finally {
        // Restore button state
        if (submitBtn) {
          submitBtn.textContent = originalText;
          submitBtn.disabled = false;
        }
      }
    }

    async handleRegisterForm() {
      const registerForm = document.getElementById('register-form');
      if (!registerForm) return;
      
      const email = registerForm.querySelector('#register-email')?.value.trim();
      const password = registerForm.querySelector('#register-password')?.value;
      const confirmPassword = registerForm.querySelector('#confirm-password')?.value;
      const termsCheckbox = registerForm.querySelector('#terms');
      
      if (!email) {
        this.showNotification('Please enter email', 'error');
        return;
      }
      
      if (!termsCheckbox?.checked) {
        this.showNotification('Please accept the Terms of Service', 'error');
        return;
      }
      
      if (password && password !== confirmPassword) {
        this.showNotification('Passwords do not match', 'error');
        return;
      }
      
      if (password && password.length < 8) {
        this.showNotification('Password must be at least 8 characters', 'error');
        return;
      }
      
      // Show loading state
      const submitBtn = registerForm.querySelector('button[type="submit"]');
      const originalText = submitBtn?.textContent;
      if (submitBtn) {
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating account...';
        submitBtn.disabled = true;
      }
      
      try {
        const name = email.split('@')[0] || 'User';
        
        // If password is provided, try Firebase registration
        if (password && this.isFirebaseLoaded) {
          const result = await this.firebaseRegister(name, email, password);
          if (result.success) {
            this.hideAuthModal();
            this.showNotification('Account created successfully!', 'success');
            return;
          } else {
            this.showNotification(result.error || 'Registration failed', 'error');
            return;
          }
        }
        
        // Fallback to local registration (email only)
        const result = await this.localRegister(name, email);
        if (result.success) {
          this.hideAuthModal();
          this.showNotification('Account created!', 'success');
        } else {
          this.showNotification(result.error || 'Registration failed', 'error');
        }
      } finally {
        // Restore button state
        if (submitBtn) {
          submitBtn.textContent = originalText;
          submitBtn.disabled = false;
        }
      }
    }

    async handleGoogleLogin() {
      if (!this.isFirebaseLoaded) {
        this.showNotification('Google login is not available', 'error');
        return;
      }
      
      try {
        const { signInWithPopup } = 
          await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js");
        
        // Show loading state
        const googleBtn = document.getElementById('google-auth-btn');
        const originalHTML = googleBtn?.innerHTML;
        if (googleBtn) {
          googleBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Connecting...';
          googleBtn.disabled = true;
        }
        
        const result = await signInWithPopup(this.auth, this.googleProvider);
        console.log("✅ Google login successful:", result.user.email);
        this.hideAuthModal();
        
      } catch (error) {
        console.error("Google login error:", error);
        
        // Restore button state
        const googleBtn = document.getElementById('google-auth-btn');
        if (googleBtn) {
          googleBtn.innerHTML = originalHTML;
          googleBtn.disabled = false;
        }
        
        if (error.code === 'auth/popup-blocked') {
          this.showNotification('Popup blocked by browser. Please allow popups for this site.', 'error');
        } else if (error.code === 'auth/popup-closed-by-user') {
          this.showNotification('Login cancelled', 'info');
        } else {
          this.showNotification('Google login failed. Please try email login.', 'error');
        }
      }
    }

    // ============ AUTH METHODS ============
    async firebaseEmailLogin(email, password) {
      try {
        const { signInWithEmailAndPassword } = 
          await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js");
        
        const userCredential = await signInWithEmailAndPassword(this.auth, email, password);
        return { success: true, user: userCredential.user };
      } catch (error) {
        console.error("Firebase login error:", error);
        return { success: false, error: this.getErrorMessage(error.code) };
      }
    }

    async firebaseRegister(name, email, password) {
      try {
        const { createUserWithEmailAndPassword, updateProfile } = 
          await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js");
        
        const userCredential = await createUserWithEmailAndPassword(this.auth, email, password);
        
        // Update profile with name
        await updateProfile(userCredential.user, { displayName: name });
        
        return { success: true, user: userCredential.user };
      } catch (error) {
        console.error("Firebase register error:", error);
        return { success: false, error: this.getErrorMessage(error.code) };
      }
    }

    async localLogin(email) {
      try {
        console.log("🔐 Local login:", email);
        
        const response = await fetch(`${API_URL}/api/auth`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email })
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        if (data.success && data.user) {
          this.currentUser = data.user;
          this.saveToStorage();
          this.showChatInterface();
          return { success: true, user: this.currentUser };
        } else {
          throw new Error(data.error || 'Login failed');
        }
      } catch (error) {
        console.error("Local login error:", error);
        return { success: false, error: error.message };
      }
    }

    async localRegister(name, email) {
      try {
        console.log("📝 Local register:", email);
        
        const response = await fetch(`${API_URL}/api/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            email,
            name: name || email.split('@')[0]
          })
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        if (data.success && data.user) {
          this.currentUser = data.user;
          this.saveToStorage();
          this.showChatInterface();
          return { success: true, user: this.currentUser };
        } else {
          throw new Error(data.error || 'Registration failed');
        }
      } catch (error) {
        console.error("Local register error:", error);
        return { success: false, error: error.message };
      }
    }

    async handleFirebaseUser(firebaseUser) {
      try {
        // Sync with backend
        const syncResponse = await fetch(`${API_URL}/api/user/sync`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            name: firebaseUser.displayName || firebaseUser.email.split('@')[0]
          })
        });

        const syncData = await syncResponse.json();
        
        if (syncData.success) {
          this.currentUser = syncData.user;
          this.saveToStorage();
          this.showChatInterface();
          console.log("✅ Firebase user synced:", this.currentUser.email);
        } else {
          throw new Error('Sync failed');
        }
      } catch (error) {
        console.error("Firebase sync error:", error);
        // Fallback: create user locally
        this.currentUser = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          name: firebaseUser.displayName || firebaseUser.email.split('@')[0],
          plan: 'free',
          messages_used: 0,
          max_messages: 20
        };
        this.saveToStorage();
        this.showChatInterface();
        this.showNotification('Logged in with Google!', 'success');
      }
    }

    async logout() {
      try {
        // Logout from Firebase if available
        if (this.auth) {
          const { signOut } = 
            await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js");
          await signOut(this.auth);
        }
        
        // Clear local state
        this.currentUser = null;
        localStorage.removeItem('tungsai_user');
        this.showLoginPage();
        
        this.showNotification('Logged out successfully', 'success');
        console.log("✅ User logged out");
        return { success: true };
      } catch (error) {
        console.error("Logout error:", error);
        return { success: false, error: error.message };
      }
    }

    // ============ USER STATE MANAGEMENT ============
    isAuthenticated() {
      return !!this.currentUser;
    }

    getUser() {
      return this.currentUser;
    }

    getUserId() {
      return this.currentUser?.uid || this.currentUser?.id;
    }

    canSendMessage() {
      if (!this.currentUser) return false;
      const used = this.currentUser.messages_used || 0;
      const limit = this.currentUser.max_messages || 20;
      return used < limit;
    }

    async incrementMessageCount() {
      if (this.currentUser) {
        this.currentUser.messages_used = (this.currentUser.messages_used || 0) + 1;
        this.saveToStorage();
        this.updateUI();
      }
    }

    // ============ STORAGE ============
    saveToStorage() {
      if (this.currentUser) {
        localStorage.setItem('tungsai_user', JSON.stringify(this.currentUser));
      }
    }

    loadFromStorage() {
      const savedUser = localStorage.getItem('tungsai_user');
      if (savedUser) {
        try {
          this.currentUser = JSON.parse(savedUser);
          console.log("📂 Loaded user from storage:", this.currentUser?.email);
        } catch (error) {
          console.error("Error parsing saved user:", error);
        }
      }
    }

    // ============ NOTIFICATION SYSTEM ============
    showNotification(message, type = 'info') {
      console.log(`${type}: ${message}`);
      
      // Remove existing notification
      const existing = document.querySelector('.auth-notification');
      if (existing) existing.remove();
      
      // Create notification
      const notification = document.createElement('div');
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
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
        font-size: 14px;
      `;
      
      if (type === 'success') {
        notification.style.background = 'linear-gradient(135deg, #4caf50, #2e7d32)';
      } else if (type === 'error') {
        notification.style.background = 'linear-gradient(135deg, #f44336, #c62828)';
      } else if (type === 'info') {
        notification.style.background = 'linear-gradient(135deg, #2196f3, #1565c0)';
      } else if (type === 'warning') {
        notification.style.background = 'linear-gradient(135deg, #ff9800, #ef6c00)';
      }
      
      document.body.appendChild(notification);
      
      // Auto-remove after 3 seconds
      setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => notification.remove(), 300);
      }, 3000);
    }

    // ============ ERROR HANDLING ============
    getErrorMessage(errorCode) {
      const errorMessages = {
        'auth/invalid-email': 'Invalid email address',
        'auth/user-disabled': 'This account has been disabled',
        'auth/user-not-found': 'No account found with this email',
        'auth/wrong-password': 'Incorrect password',
        'auth/email-already-in-use': 'Email already in use',
        'auth/weak-password': 'Password should be at least 6 characters',
        'auth/operation-not-allowed': 'Email/password accounts are not enabled',
        'auth/popup-blocked': 'Popup was blocked by your browser. Please allow popups.',
        'auth/popup-closed-by-user': 'Sign-in popup was closed',
        'auth/network-request-failed': 'Network error occurred. Please check your connection.',
        'auth/too-many-requests': 'Too many attempts. Please try again later.',
        'auth/user-token-expired': 'Session expired. Please login again.'
      };
      
      return errorMessages[errorCode] || 'An error occurred. Please try again.';
    }
  }

  // Create global instance
  window.authManager = new AuthManager();

  // Add CSS animations for notifications
  const notificationStyles = document.createElement('style');
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

  console.log("🎯 AuthManager loaded successfully - No demo login");
})();
