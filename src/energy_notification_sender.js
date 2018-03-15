const promiseRetry = require('promise-retry')
const requestPromise = require('request-promise-native')
/**
 * I know how to send energy notifications to the server,
 * and how to handle icky network stuff like retries.
 *
 * @param retryConfig see https://www.npmjs.com/package/promise-retry
 */
class EnergyNotificationSender {
  constructor(serverUrl, serverTimeoutSeconds, retryConfig, verboseLogging) {
    console.assert(serverUrl, "missing serverUrl")
    this.serverUrl = serverUrl

    console.assert(serverTimeoutSeconds, "missing serverTimeoutSeconds")
    this.serverTimeoutSeconds = serverTimeoutSeconds

    console.assert(retryConfig, "missing retryConfig")
    this.retryConfig = retryConfig

    this.verboseLogging = verboseLogging
  }

  /**
   * Sends all the given energy notifications in one request.
   * Returns a promise that resolves after the notifications have been successfully
   * received by the server (including retries and stuff).
   * It will reject the promise only after it has given up on retrying.
   * You can configure that with the retryConfig in the constructor.
   *
   * If the given events array is empty, no notifications are sent and the promise resolves immediately.
   */
  sendEnergyNotifications(notifications) {
    const verboseLogging = this.verboseLogging

    if (notifications.length == 0) {
      return new Promise(function(resolve, reject) {
        resolve()
      })
    }

    const startTime = new Date().getTime()
    return promiseRetry((retry, attemptNumber) => {
      if (verboseLogging || attemptNumber > 1) {
        console.log("(attempt #" + attemptNumber + ") Sending a request with " + notifications.length + " notifications...")
      }
      return this._sendEnergyNotifications(notifications)
        .then((result) => {
          if (result.statusCode >= 200 && result.statusCode <= 300) {
            //worked!
            const durationMs = new Date().getTime() - startTime
            if (verboseLogging) {
              console.log("  (attempt #" + attemptNumber + ") Successfully sent request with " + notifications.length + " notifications! Took " + durationMs + "ms")
            }
          } else {
            throw new Error("Got status code " + result.statusCode + " and message '" + result.message + "'!")
          }
        })
        .catch((error) => {
          const durationMs = new Date().getTime() - startTime
          console.log("  (attempt #" + attemptNumber + ") Failed to send request with " + notifications.length + " notifications. Took " + durationMs + "ms. Will retry." + error)
          retry()
        });
    }, this.retryConfig)
  }

  /**
   * Sends a single energy notification.
   * Returns a promise that resolves after the notification has been successfully
   * received by the server (including retries and stuff).
   * It will reject the promise only after it has given up on retrying.
   * You can configure that with the retryConfig in the constructor.
   *
   * If the notification doesn't have any events, no notification is sent and the promise resolves immediately.
   */
  sendEnergyNotification(notification) {
    if (!notification.events || notification.events.length == 0) {
      return new Promise(function(resolve, reject) {
        resolve()
      })
    }

    return promiseRetry((retry, number) => {
      if (number > 1) {
        console.log('...send attempt number', number);
      }
      return this._sendEnergyNotification(notification).catch((error) => {
        console.log("send failed! Will retry. " +  error)
        retry()
      });
    }, this.retryConfig)
  }
  
  _sendEnergyNotification(notification) {
    var options = {
      uri: this.serverUrl,
      method: 'POST',
      json: notification,
      followAllRedirects: true,
      timeout: this.serverTimeoutSeconds * 1000
    }

    return requestPromise(options)
  }

  _sendEnergyNotifications(notifications) {
    var options = {
      uri: this.serverUrl,
      method: 'POST',
      json: notifications,
      followAllRedirects: true,
      timeout: this.serverTimeoutSeconds * 1000
    }

    return requestPromise(options)
  }

}

module.exports = EnergyNotificationSender