'use strict';

gmgps.cloud.services.AddressLookupSearchApi = class AddressLookupSearchApi {

    /**
     * Searches for addresses using the AddressLookup Search API with JWT authentication.
     * @param {string} query - The search query (partial address being looked for)
     * @returns {Promise<Array<Object>>} Promise that resolves with address lookup results
     * @public
     */
    async search(query) {
        const trimmedQuery = query && query.trim();

        if (!trimmedQuery) {
            return Promise.reject('Query cannot be empty');
        }

        if (trimmedQuery.length < 3) {
            return Promise.reject('Query must be at least 3 characters long');
        }
        
        // Check cache first
        const cached = gmgps.cloud.services.AddressLookupSearchApi.cache.get(trimmedQuery);
        if (cached !== null) {
            console.log('AddressLookupSearchApi: Using cached results for query:', trimmedQuery);
            return cached;
        }
        
        const token = await altoTokenService.getToken();
        const result = await this._makeAddressLookupCall(trimmedQuery, token);
        
        // Cache the results
        gmgps.cloud.services.AddressLookupSearchApi.cache.set(trimmedQuery, result);

        return result;
    }

    /**
     * Searches for addresses by postcode using the AddressLookup Search-by-Postcode API with JWT authentication.
     * @param {string} postcode - The postcode to search for
     * @returns {Promise<Array<Object>>} Promise that resolves with address lookup results
     * @public
     */
    async searchByPostcode(postcode) {
        const trimmedPostcode = postcode && postcode.trim();

        if (!trimmedPostcode) {
            return Promise.reject('Postcode cannot be empty');
        }
        
        // Check cache first
        const cached = gmgps.cloud.services.AddressLookupSearchApi.cache.get(trimmedPostcode);
        if (cached !== null) {
            console.log('AddressLookupSearchApi: Using cached results for postcode:', trimmedPostcode);
            return cached;
        }
        
        const token = await altoTokenService.getToken();
        const result = await this._makeAddressLookupByPostcodeCall(trimmedPostcode, token);
        
        // Cache the results
        gmgps.cloud.services.AddressLookupSearchApi.cache.set(trimmedPostcode, result);

        return result;
    }


    /**
     * Makes the actual address lookup API call with JWT authentication.
     * @param {string} query - The search query
     * @param {string} token - The JWT access token
     * @returns {Promise<Array<Object>>} Promise that resolves with the search results
     * @private
     */
    _makeAddressLookupCall(query, token) {
        const webApiBaseUrl = alto.config && alto.config.webApiBaseUrl;

        if (!webApiBaseUrl) {
            return Promise.reject('Web API base URL not found');
        }

        return new Promise((resolve, reject) => {
            $.ajax({
                url: `${webApiBaseUrl}/addresslookup/search?query=${encodeURIComponent(query)}`,
                type: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Alto-Version': alto.version
                },
                dataType: 'json',
                contentType: 'application/json',
                success: (result) => {
                    const addresses = Array.isArray(result) ? result : [];
                    resolve(addresses);
                },
                error: (xhr, status, error) => {
                    let errorMessage = 'Address lookup failed: ' + error;
                    if (xhr.responseJSON && xhr.responseJSON.message) {
                        errorMessage += ' - ' + xhr.responseJSON.message;
                    }
                    reject(errorMessage);
                }
            });
        });
    }

    /**
     * Makes the actual address lookup by postcode API call with JWT authentication.
     * @param {string} postcode - The postcode to search for
     * @param {string} token - The JWT access token
     * @returns {Promise<Array<Object>>} Promise that resolves with the search results
     * @private
     */
    _makeAddressLookupByPostcodeCall(postcode, token) {
        const webApiBaseUrl = alto.config && alto.config.webApiBaseUrl;

        if (!webApiBaseUrl) {
            return Promise.reject('Web API base URL not found');
        }

        return new Promise((resolve, reject) => {
            $.ajax({
                url: `${webApiBaseUrl}/addresslookup/search-by-postcode?postcode=${encodeURIComponent(postcode)}`,
                type: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Alto-Version': alto.version
                },
                dataType: 'json',
                contentType: 'application/json',
                success: (result) => {
                    const addresses = Array.isArray(result) ? result : [];
                    resolve(addresses);
                },
                error: (xhr, status, error) => {
                    let errorMessage = 'Address lookup by postcode failed: ' + error;
                    if (xhr.responseJSON && xhr.responseJSON.message) {
                        errorMessage += ' - ' + xhr.responseJSON.message;
                    }
                    reject(errorMessage);
                }
            });
        });
    }

};

const ONE_DAY_MS = 86400000; // 24 hours in milliseconds = 24 * 60 * 60 * 1000
const TTL_IN_DAYS = 30; // Cache TTL in days

// Static localStorage cache for address lookup results
gmgps.cloud.services.AddressLookupSearchApi.cache = {
    keyPrefix: 'alto_address_api_',
    ttl: ONE_DAY_MS * TTL_IN_DAYS,
    maxEntries: 100,
    
    /**
     * Store addresses in localStorage with TTL
     * @param {string} query - The search query or postcode
     * @param {Array} addresses - The address results to cache
     */
    set(query, addresses) {
        const normalizedQuery = query.trim().toLowerCase();
        const key = this.keyPrefix + normalizedQuery;
        const item = {
            value: addresses,
            expiry: Date.now() + this.ttl,
            lastUsed: Date.now()
        };
        
        try {
            localStorage.setItem(key, JSON.stringify(item));
            this._enforceLimit();
        } catch (e) {
            console.warn('AddressLookupSearchApi: Failed to cache addresses in localStorage', e);
        }
    },
    
    /**
     * Retrieve addresses from localStorage, checking TTL
     * @param {string} query - The search query or postcode
     * @returns {Array|null} Cached addresses or null if not found/expired
     */
    get(query) {
        const normalizedQuery = query.trim().toLowerCase();
        const key = this.keyPrefix + normalizedQuery;
        const itemStr = localStorage.getItem(key);
        
        if (!itemStr) {
            return null;
        }
        
        try {
            const item = JSON.parse(itemStr);
            
            // Check if expired
            if (Date.now() > item.expiry) {
                localStorage.removeItem(key);
                return null;
            }
            
            // Update last used time for LRU
            item.lastUsed = Date.now();
            localStorage.setItem(key, JSON.stringify(item));
            
            return item.value;
        } catch (e) {
            console.warn('AddressLookupSearchApi: Failed to parse cached addresses', e);
            localStorage.removeItem(key);
            return null;
        }
    },
    
    /**
     * Enforce maximum cache entries using LRU eviction
     * @private
     */
    _enforceLimit() {
        try {
            const allKeys = [];
            
            // Collect all our cache keys with their last used timestamps
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith(this.keyPrefix)) {
                    try {
                        const itemStr = localStorage.getItem(key);
                        if (itemStr) {
                            const item = JSON.parse(itemStr);
                            allKeys.push({ key: key, lastUsed: item.lastUsed || 0 });
                        }
                    } catch (parseError) {
                        // If we can't parse this item, remove it as it's corrupted
                        console.warn('AddressLookupSearchApi: Removing corrupted cache entry:', key, parseError);
                        localStorage.removeItem(key);
                    }
                }
            }
            
            // If over limit, remove least recently used entries
            if (allKeys.length > this.maxEntries) {
                allKeys.sort((a, b) => a.lastUsed - b.lastUsed);
                const toRemove = allKeys.slice(0, allKeys.length - this.maxEntries);
                toRemove.forEach(item => {
                    try {
                        localStorage.removeItem(item.key);
                    } catch (removeError) {
                        console.warn('AddressLookupSearchApi: Failed to remove cache entry:', item.key, removeError);
                    }
                });
            }
        } catch (e) {
            console.warn('AddressLookupSearchApi: Failed to enforce cache limit', e);
        }
    },
    
    /**
     * Clear all cached address lookups
     */
    clear() {
        try {
            const keysToRemove = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith(this.keyPrefix)) {
                    keysToRemove.push(key);
                }
            }
            keysToRemove.forEach(key => {
                try {
                    localStorage.removeItem(key);
                } catch (removeError) {
                    console.warn('AddressLookupSearchApi: Failed to remove key during clear:', key, removeError);
                }
            });
            console.log('AddressLookupSearchApi: Cache cleared, removed ' + keysToRemove.length + ' entries');
        } catch (e) {
            console.warn('AddressLookupSearchApi: Failed to clear cache', e);
        }
    },
    
    /**
     * Get all cached entries (for debugging)
     * @returns {Object} Object with postcode/query keys and their cached values
     */
    getCache() {
        const cache = {};
        try {
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith(this.keyPrefix)) {
                    const query = key.substring(this.keyPrefix.length);
                    const itemStr = localStorage.getItem(key);
                    const item = JSON.parse(itemStr);
                    
                    // Only return non-expired entries
                    if (Date.now() <= item.expiry) {
                        cache[query] = item.value;
                    }
                }
            }
        } catch (e) {
            console.warn('AddressLookupSearchApi: Failed to get cache', e);
        }
        return cache;
    },
    
    /**
     * Get cache statistics (for debugging)
     * @returns {Object} Statistics about the cache
     */
    getCacheStats() {
        const stats = {
            totalEntries: 0,
            expiredEntries: 0,
            postcodes: [],
            totalSizeBytes: 0
        };
        
        try {
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith(this.keyPrefix)) {
                    stats.totalEntries++;
                    const query = key.substring(this.keyPrefix.length);
                    const itemStr = localStorage.getItem(key);
                    const item = JSON.parse(itemStr);
                    
                    stats.totalSizeBytes += itemStr.length;
                    
                    if (Date.now() > item.expiry) {
                        stats.expiredEntries++;
                    } else {
                        stats.postcodes.push(query);
                    }
                }
            }
            
            stats.totalSizeKB = Math.round(stats.totalSizeBytes / 1024);
            stats.ttlHours = this.ttl / 3600000;
            stats.maxEntries = this.maxEntries;
            
        } catch (e) {
            console.warn('AddressLookupSearchApi: Failed to get cache stats', e);
        }
        
        return stats;
    }
};

