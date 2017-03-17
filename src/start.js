const RpioClickDetector = require('./rpio_click_detector')
const FakeClickDetector = require('./fake_click_detector')
const TickSender = require('./tick_sender')
const TickWatcher = require('./tick_watcher')
const waitUntil = require('wait-until')
const fs = require('fs')

var config = require('config')
var deviceIdPath = config.get("deviceIdPath")
var registrationBaseUrl = config.get("registrationBaseUrl")
var tickUrl = config.get('tickUrl')
var simulate = parseInt(config.get('simulate'))
var retryConfig = config.get('retry')
var tickInputPin = config.get('tickInputPin')
var minSendInterval = parseInt(config.get('minSendInterval'))
if (minSendInterval <= 0) {
  throw new Error("minSendInterval was " + minSendInterval + ", but it should be > 0. ")
}
var tickStoragePath = config.get('tickStoragePath')
var tickCount = 0


console.log("I receive ticks on pin " + tickInputPin)
console.log("I will talk to " + tickUrl)
console.log("Here is my retry config: ")
console.log(retryConfig)

function watchForTicks(meterName) {
  console.log("I am meter " + meterName)
  showMeterNameAndTicks()

  var clickDetector
  if (RpioClickDetector.hasRpio()) {
    console.log("RPIO detected. Will listen for clicks on pin " + tickInputPin)
    clickDetector = new RpioClickDetector(tickInputPin)
  } else {
    console.log("No RPIO detected. Fake click detector is available, type 't' to manually simulate a tick.")
    clickDetector = new FakeClickDetector()
  }

  const tickSender = new TickSender(tickUrl, meterName, retryConfig, tickStoragePath)

  const tickWatcher = new TickWatcher(clickDetector, tickSender, minSendInterval, showTickOnDisplay)
//OK, we will do batching. So let's schedule the batch uploads.
  console.log("I will send any previously batched ticks now, and then send any additional ticks every " + minSendInterval + " seconds.")
  tickWatcher.start()

  if (simulate > 0) {
    console.log("I will register a simulated tick every " + simulate + " seconds.")
    setInterval(function() {
      console.log("Simulating a tick")
      tickSender.registerTick()
    }, simulate * 1000)
  }
}

function showTickOnDisplay() {
  tickCount = tickCount + 1
  showMeterNameAndTicks()
}

function getRegistrationUrl() {
  return registrationBaseUrl + "#" + getDeviceId()
}

function getDeviceId() {
  return fs.readFileSync(deviceIdPath).toString()
}

function showQrCode() {
  if (display) {
    display.qrCode(getRegistrationUrl())
  } else {
    console.log("Pretending to show QR code for " + getRegistrationUrl())
  }
}

function showRegistrationUrl() {
  if (display) {
    display.texts([
      registrationBaseUrl,
      "Device ID:",
      getDeviceId().toUpperCase()
    ])


  } else {
    console.log("Pretending to show registration URL " + getRegistrationUrl())
  }
}

function showMeterNameAndTicks() {
  if (display) {
    if (config.has("meterName")) {
      display.texts([
        "Meter",
        config.get("meterName"),
        "RUNNING :)",
        "Ticks: " + tickCount
      ])
    } else {
      display.texts([
        "Unregistered",
        "meter",
        "Ticks: " + tickCount
      ])
    }
  } else {
    console.log("Meter " + config.get("meterName")) 
  }
}


var display = null
var buttons = null

try {
  const adafruit = require('adafruit-mcp23008-ssd1306-node-driver')
  if (adafruit.hasDriver()) {
    console.log("Adafruit is available, so this device appears to have a display :)")
    display = new adafruit.DisplayDriver()
    buttons = new adafruit.ButtonDriver()
  } else {
    console.log("Adafruit is not available, so we'll fake the display using the console")
  }
} catch (err) {
  console.log("Failed to load Adafruit, so we'll fake the display using the console" + err)
}

if (buttons) {
  buttons.watchAllButtons(function(buttonId) {
    console.log("button pressed " + buttonId)
    if (buttonId == 0) {
      showQrCode()
    } else if (buttonId == 1) {
      showRegistrationUrl()
    } else {
      showMeterNameAndTicks()
    }
  })
}

if (!config.has("meterName")) {
  //Oh, meterName hasn't been set. Show barcode.
  console.log("meterName isn't set. Showing bar code and waiting for it to be set...")

  showQrCode()

  //Wait until meterName has been set.
  waitUntil()
    .interval(500)
    .times(Infinity)
    .condition(function() {
      delete require.cache[require.resolve('config')]
      config = require('config')
      return config.has("meterName")
    })
    .done(function() {
      watchForTicks(config.get('meterName'))
    })
} else {
  watchForTicks(config.get('meterName'))
}

