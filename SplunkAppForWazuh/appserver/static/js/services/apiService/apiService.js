define(['../module'], function (module) {
  'use strict'

  module.service('$apiService', function ($http, $currentApiIndexService) {
    /**
     * Generated and returns the browser base URL + Splunk Port
     */
    const getBaseUrl = () => {
      const url = window.location.href
      const arr = url.split("/")
      return arr[0] + "//" + arr[2]
    }

    /**
     * Generated and returns the browser base URL + Splunk Port
     */
    const getWellFormedUri = (endpoint, includedApi) => {
      if (!includedApi) {
        const jsonCurrentAPI = $currentApiIndexService.getAPI()
        return getBaseUrl() + `/custom/SplunkAppForWazuh/${endpoint}?ip=${jsonCurrentAPI.url}&port=${jsonCurrentAPI.portapi}&user=${jsonCurrentAPI.userapi}&pass=${jsonCurrentAPI.passapi}`
      } else {
        return getBaseUrl() + '/custom/SplunkAppForWazuh/' + endpoint
      }
    }

    /**
     * Performs a GET request
     * @param {String} endpoint 
     * @param {Object} opts 
     * @param {Boolean} includedApi 
     */
    const get = async (endpoint, opts, includedApi) => {
      try {
        let result = ''
        if (opts)
          result = await $http.get(getWellFormedUri(endpoint, includedApi), { params: opts })
        else
          result = await $http.get(getWellFormedUri(endpoint, includedApi), false)
        if (result && typeof result !== 'object') {
          result = JSON.parse(result)
          if (result.data.error) {
            throw new Error('Error from backend: ' + result.data.error)
          }
        } else if (result.data.error) {
          throw new Error('Error from backend: ' + result.data.error)
        }
        return result
      } catch (err) {
        return Promise.reject(err)
      }
    }

    /**
     * Performs a GET request to Wazuh API
     * @param {String} endpoint 
     * @param {Object} opts 
     * @param {Boolean} includedApi 
     */
    const request = async (endpoint, opts, includedApi) => {
      try {
        let result = ''
        if (opts) {
          opts.endpoint = endpoint
          result = await $http.get(getWellFormedUri('/api/request', includedApi), { params: opts })
        }
        else {
          result = await $http.get(getWellFormedUri('/api/request', includedApi), { params: {endpoint:endpoint} })
        }
        if (result && typeof result !== 'object') {
          result = JSON.parse(result)
          if (result.data.error) {
            throw new Error('Error from backend: ' + result.data.error)
          }
        } else if (result.data.error) {
          throw new Error('Error from backend: ' + result.data.error)
        }
        return result
      } catch (err) {
        return Promise.reject(err)
      }
    }

    /**
     * POST method
     * @param {String} url 
     * @param {Object} payload 
     */
    const post = async (endpoint, payload) => {
      try {
        return await $http.post(getWellFormedUri(endpoint, includedApi), payload)
      } catch (err) {
        return Promise.reject(err)
      }
    }

    const service = {
      post: post,
      get: get,
      getBaseUrl: getBaseUrl,
      getWellFormedUri: getWellFormedUri,
      request:request
    }
    return service
  })
})