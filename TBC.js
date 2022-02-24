/* eslint-disable max-len */
/* eslint-disable object-curly-spacing */
const fetch = require('node-fetch');

const BASE_URL = 'https://api.tbcbank.ge'

/**
 * Class that will handle Payment APIs. TBC for now
 */
class TBC {
    /**
     * Initiates the class
     */
    constructor(authorization = { apikey, client_Id, client_secret }) {
        this.authorization = authorization;
        this.access_token = null;
        this.token_type = null;
    }

    /**
     * Gets access token from TBC api and stores it to be used for next payments
     * Reference: https://developers.tbcbank.ge/reference/checkout-get-access-token-api
     * @return {boolean} auth result
     */
    async getAccessToken() {
        const options = {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'apikey': this.authorization.apikey,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                'client_Id': this.authorization.client_Id,
                'client_secret': this.authorization.client_secret,
            }),
        };
        const result = await fetch(`${BASE_URL}/v1/tpay/access-token`, options);
        const json = (await (await result).json());
        this.access_token = json.access_token;
        this.token_type = json.token_type;
        if (this.access_token && this.token_type) return true;
        return false;
    }

    /**
     * Creates web payment and gives back link for user.
     * Reference: https://developers.tbcbank.ge/reference/checkout-create-web-payment-api
     * @param {number} amount GEL
     * @param {string} returnurl after successful transaction tbc will redirect to this URL
     * @param {string} callbackUrl when payment status changes to final status, POST request 
     * containing PaymentId in the body will be sent to given URL. In case of successful receipt 
     * of the request, the merchant must return the status code 200 and check the payment status
     * through GET /payments/{payment-id} endpoint. Body example {"PaymentId":"6azzo13uw5u2116332"} 
     * callbackUrl must be added on the merchant dashboard at ecom.tbcpayments.ge. If callbackUrl 
     * parameter is not provided, system automatically takes the basic callbackUrl value from 
     * the merchant dashboard. Please, verify that POST request is allowed at your callbackUrl 
     * from the following IP addresses: 193.104.20.44 193.104.20.45 185.52.80.44 185.52.80.45
     * @return {object} result
     */
    async createWebPayment(amount, returnurl, callbackUrl) {
        const options = {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'apikey': this.authorization.apikey,
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.access_token}`,
            },
            body: JSON.stringify({
                amount: {
                    total: amount,
                    currency: 'GEL',
                },
                returnurl: returnurl,
                callbackUrl: callbackUrl,
                expirationMinutes: 10,
                language: 'EN',
                saveCard: true,
            }),
        };
        const result = await fetch(`${BASE_URL}/v1/tpay/payments`, options);
        const json = (await (await result).json());
        return json;
    }

    /**
     * Refunds payment with ID
     * Reference: https://developers.tbcbank.ge/reference/checkout-cancel-checkout-payment-api
     * @param {string} payId payment id
     */
    async cancelWebPayment(payId) {
        const options = {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'apikey': this.authorization.apikey,
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.access_token}`,
            },
        };
        const result = await fetch(`${BASE_URL}/v1/tpay/payments/${payId}/cancel`, options);
        const json = (await (await result).json());
        return json;
    }

    /**
     * retrieve details details of payment with ID
     * Reference: https://developers.tbcbank.ge/reference/checkout-get-checkout-payment-details-api
     * @param {string} payId id of the payment
     */
    async getCheckoutPaymentDetails(payId) {
        const options = {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'apikey': this.authorization.apikey,
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.access_token}`,
            },
        };
        const result = await fetch(`${BASE_URL}/v1/tpay/payments/${payId}`, options);
        const json = (await (await result).json());
        return json;
    }

    /**
     * performs payment with saved card. using stored auth token
     * Reference: https://developers.tbcbank.ge/reference/execute-recurring-payment-1
     * @param {string} recId users card Id provided by tbc
     * @param {string | number} amount amount of GEL
     * @param {boolean} refundOnSuccess refund automatically when transaction goes through, cancellation must be enabled by TBC
     */
    async executeRecurringPayment(recId, amount, refundOnSuccess = false) {
        const options = {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'apikey': this.authorization.apikey,
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.access_token}`,
            },
            body: JSON.stringify({
                'money': {
                    'amount': parseFloat(amount).toFixed(2),
                    'currency': 'GEL',
                },
                'recId': recId,
            }),
        };
        const result = await fetch(`${BASE_URL}/v1/tpay/payments/execution`, options);
        const json = (await (await result).json());
        // refund if successful
        if (refundOnSuccess && json.status === 'Succeeded') {
            this.cancelWebPayment(json.payId);
        }
        return json;
    }
}

exports.TBC = TBC;
