-- ============ CHATBOT SAAS DATABASE SCHEMA ============

-- 1. Create the database if it doesn't exist
CREATE DATABASE IF NOT EXISTS chatbot_saas;
USE chatbot_saas;

-- 2. Create users table
CREATE TABLE IF NOT EXISTS users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    plan ENUM('free', 'standard', 'premium') DEFAULT 'free',
    subscription_date DATETIME,
    devices_count INT DEFAULT 1,
    max_devices INT DEFAULT 1,
    tokens_used_month INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_plan (plan)
);

-- 3. Create devices table
CREATE TABLE IF NOT EXISTS devices (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT,
    device_id VARCHAR(255) UNIQUE NOT NULL,
    device_name VARCHAR(255),
    last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_device (user_id, device_id),
    INDEX idx_last_active (last_active)
);

-- 4. Create payments table
CREATE TABLE IF NOT EXISTS payments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT,
    plan ENUM('standard', 'premium') NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    status ENUM('pending', 'completed', 'failed', 'refunded') DEFAULT 'pending',
    payment_method VARCHAR(50),
    transaction_id VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_payments (user_id, created_at),
    INDEX idx_status (status)
);

-- 5. Create usage tracking table
CREATE TABLE IF NOT EXISTS usage_tracking (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT,
    tokens_used INT DEFAULT 0,
    month_year VARCHAR(7),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_month (user_id, month_year)
);

-- 6. Create vouchers table (for manual payments)
CREATE TABLE IF NOT EXISTS vouchers (
    id INT PRIMARY KEY AUTO_INCREMENT,
    voucher_code VARCHAR(100) UNIQUE NOT NULL,
    plan VARCHAR(50) NOT NULL,
    price_usd DECIMAL(10,2) NOT NULL,
    status ENUM('active', 'used', 'expired') DEFAULT 'active',
    user_id INT NULL,
    used_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_voucher_code (voucher_code),
    INDEX idx_status (status),
    INDEX idx_expires (expires_at)
);

-- 7. Create chat_safety_logs table (for monitoring)
CREATE TABLE IF NOT EXISTS chat_safety_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT,
    input_text TEXT,
    response_text TEXT,
    safety_flags JSON,
    tokens_used INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_user_safety (user_id, created_at)
);

-- 8. Create chat_history table (optional - for saving conversations)
CREATE TABLE IF NOT EXISTS chat_history (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT,
    session_id VARCHAR(100),
    title VARCHAR(255),
    message_count INT DEFAULT 0,
    last_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_sessions (user_id, session_id),
    INDEX idx_user_history (user_id, updated_at)
);

-- 9. Create chat_messages table (optional - for detailed message storage)
CREATE TABLE IF NOT EXISTS chat_messages (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT,
    session_id VARCHAR(100),
    role ENUM('user', 'assistant', 'system'),
    content TEXT,
    tokens_used INT DEFAULT 0,
    safety_checked BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_session (user_id, session_id, created_at),
    INDEX idx_session_messages (session_id, created_at)
);

-- 10. Create audit_log table (for security monitoring)
CREATE TABLE IF NOT EXISTS audit_log (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NULL,
    action VARCHAR(100) NOT NULL,
    details TEXT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_action_time (action, created_at),
    INDEX idx_user_actions (user_id, created_at)
);

-- ============ VERIFICATION ============

-- Show all tables
SHOW TABLES;

-- Show table counts
SELECT 
    'users' as table_name, 
    COUNT(*) as record_count 
FROM users
UNION ALL
SELECT 
    'devices', 
    COUNT(*) 
FROM devices
UNION ALL
SELECT 
    'payments', 
    COUNT(*) 
FROM payments
UNION ALL
SELECT 
    'usage_tracking', 
    COUNT(*) 
FROM usage_tracking
UNION ALL
SELECT 
    'vouchers', 
    COUNT(*) 
FROM vouchers
UNION ALL
SELECT 
    'chat_safety_logs', 
    COUNT(*) 
FROM chat_safety_logs
UNION ALL
SELECT 
    'chat_history', 
    COUNT(*) 
FROM chat_history
UNION ALL
SELECT 
    'chat_messages', 
    COUNT(*) 
FROM chat_messages
UNION ALL
SELECT 
    'audit_log', 
    COUNT(*) 
FROM audit_log;

UPDATE users SET devices_count = 0 WHERE email = 'your-email@example.com';
DELETE FROM devices WHERE user_id = (SELECT id FROM users WHERE email = 'your-email@example.com');