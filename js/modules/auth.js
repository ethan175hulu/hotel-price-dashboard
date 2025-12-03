/**
 * 认证模块 - 简单的前端用户验证
 */

import { USERS, LOGIN_EXPIRY_MS } from '../config/constants.js';

const STORAGE_KEYS = {
    LOGGED_IN: 'loggedIn',
    USERNAME: 'username',
    LOGIN_TIME: 'loginTime'
};

/**
 * 用户登录
 * @param {string} username 
 * @param {string} password 
 * @returns {boolean}
 */
export function login(username, password) {
    if (USERS[username] === password) {
        localStorage.setItem(STORAGE_KEYS.LOGGED_IN, 'true');
        localStorage.setItem(STORAGE_KEYS.USERNAME, username);
        localStorage.setItem(STORAGE_KEYS.LOGIN_TIME, Date.now().toString());
        return true;
    }
    return false;
}

/**
 * 用户登出
 */
export function logout() {
    localStorage.removeItem(STORAGE_KEYS.LOGGED_IN);
    localStorage.removeItem(STORAGE_KEYS.USERNAME);
    localStorage.removeItem(STORAGE_KEYS.LOGIN_TIME);
    window.location.href = 'index.html';
}

/**
 * 检查登录状态
 * @returns {boolean}
 */
export function checkAuth() {
    const loggedIn = localStorage.getItem(STORAGE_KEYS.LOGGED_IN);
    const loginTime = parseInt(localStorage.getItem(STORAGE_KEYS.LOGIN_TIME) || '0');
    
    // 检查是否登录且未过期（7天）
    if (loggedIn === 'true' && (Date.now() - loginTime) < LOGIN_EXPIRY_MS) {
        return true;
    }
    
    // 清理过期数据（不跳转）
    clearAuthData();
    return false;
}

/**
 * 清理认证数据（不跳转）
 */
function clearAuthData() {
    localStorage.removeItem(STORAGE_KEYS.LOGGED_IN);
    localStorage.removeItem(STORAGE_KEYS.USERNAME);
    localStorage.removeItem(STORAGE_KEYS.LOGIN_TIME);
}

/**
 * 获取当前用户名
 * @returns {string|null}
 */
export function getCurrentUser() {
    if (checkAuth()) {
        return localStorage.getItem(STORAGE_KEYS.USERNAME);
    }
    return null;
}

/**
 * 强制跳转到登录页（用于dashboard页面保护）
 */
export function requireAuth() {
    if (!checkAuth()) {
        window.location.href = 'index.html';
        return false;
    }
    return true;
}
