'use strict';

/**
 * Centralized JWT Token Service for Alto applications
 * Provides a unified way to retrieve JWT tokens across all services
 * 
 * IMPORTANT: This script must be loaded BEFORE any other scripts that use altoTokenService
 * (e.g., AddressLookupSearchApi, propertydetails.js, etc.)
 */
gmgps.cloud.services.TokenService = class TokenService {

    constructor() {
        this.devTokenKey = 'altoDevToken';
        this.devTokenDataKey = 'altoDevTokenData';
        this.expirationCheckInterval = null;
    }

    /**
     * Gets a JWT token for API authentication
     * Checks for dev token in localStorage first, then falls back to production endpoint
     * @param {Object} options - Configuration options
     * @param {string} [options.correlationId] - Correlation ID for tracking
     * @returns {Promise<string>} Promise that resolves with the access token
     */
    async getToken(options = {}) {
        const { correlationId } = options;
        
        const devToken = this._getDevToken();
        if (devToken) {
            console.warn('⚠️ TokenService: Using localStorage dev token. Clear with: altoTokenService.clearDevToken()');
            return devToken;
        }
        
        return new Promise((resolve, reject) => {
            const headers = {
                'Alto-Embed': 'true',
                'Alto-Version': alto.version
            };

            if (correlationId) {
                headers['Alto-Correlationid'] = correlationId;
            }

            $.ajax({
                url: '/token',
                type: 'GET',
                headers: headers,
                dataType: 'json',
                contentType: 'application/json',
                success: (response) => {
                    if (response && response.access_token) {
                        resolve(response.access_token);
                    } else {
                        reject('No access token received');
                    }
                },
                error: (xhr, status, error) => {
                    reject('Failed to get token: ' + error);
                }
            });
        });
    }

    _getDevToken() {
        return localStorage.getItem(this.devTokenKey);
    }

    _getDevTokenData() {
        const data = localStorage.getItem(this.devTokenDataKey);
        return data ? JSON.parse(data) : null;
    }

    _setDevTokenData(tokenData) {
        localStorage.setItem(this.devTokenDataKey, JSON.stringify(tokenData));
    }

    _clearDevTokenData() {
        localStorage.removeItem(this.devTokenDataKey);
    }

    _startExpirationMonitoring() {
        this._stopExpirationMonitoring(); // Clear any existing interval
        
        const tokenData = this._getDevTokenData();
        if (!tokenData || !tokenData.expires_in) return;

        const expirationTime = Date.now() + (tokenData.expires_in * 1000);
        
        this.expirationCheckInterval = setInterval(() => {
            const now = Date.now();
            const timeUntilExpiry = expirationTime - now;
            
            if (timeUntilExpiry <= 0) {
                console.warn('⚠️ Alto dev token has EXPIRED! Please refresh your token.');
                this._stopExpirationMonitoring();
            } else if (timeUntilExpiry <= 300000) { // 5 minutes warning
                const minutesLeft = Math.floor(timeUntilExpiry / 60000);
                console.warn(`⚠️ Alto dev token expires in ${minutesLeft} minutes!`);
            }
        }, 60000); // Check every minute
    }

    _stopExpirationMonitoring() {
        if (this.expirationCheckInterval) {
            clearInterval(this.expirationCheckInterval);
            this.expirationCheckInterval = null;
        }
    }

    setDevToken(tokenData) {
        if (!tokenData || typeof tokenData !== 'object') {
            console.error('❌ Invalid token data. Must be an object.');
            console.log('Expected format: { "access_token": "...", "expires_in": 85229, "token_type": "Bearer" }');
            return;
        }
        
        if (!tokenData.access_token) {
            console.error('❌ Invalid token object. Must contain "access_token" property.');
            console.log('Expected format: { "access_token": "...", "expires_in": 85229, "token_type": "Bearer" }');
            return;
        }
        
        localStorage.setItem(this.devTokenKey, tokenData.access_token);
        this._setDevTokenData(tokenData);
        
        console.log('✅ Alto dev token set with full token data.');
        console.log(`🔑 Token type: ${tokenData.token_type || 'Bearer'}`);
        
        if (tokenData.expires_in) {
            const hoursLeft = Math.floor(tokenData.expires_in / 3600);
            const minutesLeft = Math.floor((tokenData.expires_in % 3600) / 60);
            console.log(`⏰ Token expires in: ${hoursLeft}h ${minutesLeft}m`);
            this._startExpirationMonitoring();
        }
        
        console.log('⚠️ Remember to clear it when done: altoTokenService.clearDevToken()');
    }

    clearDevToken() {
        localStorage.removeItem(this.devTokenKey);
        this._clearDevTokenData();
        this._stopExpirationMonitoring();
        console.log('✅ Alto dev token cleared.');
    }

    getDevToken() {
        const token = this._getDevToken();
        const tokenData = this._getDevTokenData();
        
        if (token) {
            console.log('🔑 Dev token is set: ' + token.substring(0, 20) + '...');
            
            if (tokenData && tokenData.expires_in) {
                const expirationTime = Date.now() + (tokenData.expires_in * 1000);
                const timeUntilExpiry = expirationTime - Date.now();
                
                if (timeUntilExpiry <= 0) {
                    console.warn('⚠️ Token has EXPIRED!');
                } else {
                    const hoursLeft = Math.floor(timeUntilExpiry / 3600000);
                    const minutesLeft = Math.floor((timeUntilExpiry % 3600000) / 60000);
                    console.log(`⏰ Token expires in: ${hoursLeft}h ${minutesLeft}m`);
                }
            }
            
            return token;
        } else {
            console.log('ℹ️ No dev token set. Using production token endpoint.');
            return null;
        }
    }
};

// Create singleton instance
window.altoTokenService = new gmgps.cloud.services.TokenService();

// Developer Tools Helper Functions - Accessible via browser console
window.setAltoToken = (tokenData) => {
    altoTokenService.setDevToken(tokenData);
};

window.clearAltoToken = () => {
    altoTokenService.clearDevToken();
};

window.getAltoToken = () => {
    return altoTokenService.getDevToken();
};
