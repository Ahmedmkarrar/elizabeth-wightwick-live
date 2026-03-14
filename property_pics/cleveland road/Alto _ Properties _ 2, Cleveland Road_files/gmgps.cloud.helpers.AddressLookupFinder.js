gmgps.cloud.helpers.AddressLookupFinder = class AddressLookupFinder {
    /**
     * @constructor
     */
    constructor() {
        /** @private @type {gmgps.cloud.services.AddressLookupSearchApi} */
        this.addressLookupApi = new gmgps.cloud.services.AddressLookupSearchApi();
    }

    /**
     * Finds addresses by postcode using the modern AddressLookup API.
     * This method maintains the legacy callback signature for compatibility with PostcodePicker.
     * * @param {string} query - The postcode to search for
     * @param {function(Array<Object>): void} onAddressFound - Callback function to receive the results
     * @public
     */
    async find(query, onAddressFound) {
        // Use async/await to call the Promise-based service layer
        try {
            const addresses = await this.addressLookupApi.searchByPostcode(query);

            const transformedAddresses = this.transformAddresses(addresses);
            onAddressFound(transformedAddresses);

        } catch (error) {
            // Log error and call the external callback with an empty array to prevent breakage
            console.error('AddressLookupFinder: Address lookup failed:', error);
            onAddressFound([]);
        }
    }

    /**
     * Transform AddressLookupSearchApi response to match PAF format (nested Address object).
     * @param {Array<Object>} addresses - Array of addresses from AddressLookupSearchApi
     * @returns {Array<Object>} Transformed addresses in PAF format
     * @private
     */
    transformAddresses(addresses) {
        const transformedAddresses = [];

        if (!addresses || !Array.isArray(addresses)) {
            return transformedAddresses;
        }

        addresses.forEach((address) => {
            const addressData = address.address || {};

            // Map API response to the required nested Address object format for PAF compatibility
            const fullAddressData = {
                SubDwelling: addressData.subDwelling || '',
                NameNo: addressData.nameNo || '',
                Street: addressData.street || '',
                Locality: addressData.locality || '',
                Town: addressData.town || '',
                County: '', // Not provided in API response - retained for compatibility
                Postcode: addressData.postcode || '',
                CountryCode: addressData.countryCode || 'GBR',
                CountryId: null, // Not provided in API response
                Uprn: address.uprn || ''
            };

            const transformedAddress = {
                Address: fullAddressData,
                Line1: this.buildAddressLine1(addressData),
                Line2: this.buildAddressLine2(addressData)
            };

            transformedAddresses.push(transformedAddress);
        });

        return transformedAddresses;
    }

    /**
     * Build the first line of the address for display (e.g., [NameNo], [SubDwelling], [Street])
     * @param {Object} address - Address object from API response address property
     * @returns {string} Formatted address line
     * @private
     */
    buildAddressLine1(address) {
        const parts = [];

        if (address.nameNo) {
            parts.push(address.nameNo);
        }
        if (address.subDwelling) {
            parts.push(address.subDwelling);
        }
        if (address.street) {
            parts.push(address.street);
        }

        return parts.join(', ');
    }

    /**
     * Build the second line of the address for display (e.g., [Locality], [Town], [Postcode])
     * @param {Object} address - Address object from API response address property
     * @returns {string} Formatted address line
     * @private
     */
    buildAddressLine2(address) {
        const parts = [];

        if (address.locality) {
            parts.push(address.locality);
        }
        if (address.town) {
            parts.push(address.town);
        }
        if (address.postcode) {
            parts.push(address.postcode);
        }

        return parts.join(', ');
    }
};