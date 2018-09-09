'use strict';

var aws = require('aws-sdk');
var ses = new aws.SES({
  region: 'eu-west-1'
});

process.env.PATH = `${process.env.PATH }:/var/task/lib`;

const POSTCODE_CHECKER = 'https://www.virginmedia.com/postcode-checker/';
const SERVICE_AVAILABLE_URL = 'https://store.virginmedia.com/serviceability/active';
const SERVICE_UNAVAILABLE_URL = 'https://www.virginmedia.com/postcode-checker/results';

async function takeScreenshot(driver, filename) {
  const ss = await driver.takeScreenshot();
  require('fs').writeFileSync(filename, ss, 'base64');
}

function sendEmail(message, to) {
  return new Promise((resolve, reject) => {
    var eParams = {
      Destination: {
        ToAddresses: [to]
      },
      Message: {
        Body: {
          Text: {
            Data: message
          }
        },
        Subject: {
          Data: "Virgin Media Postcode Checker"
        }
      },
      Source: to
    };

    console.log('===SENDING EMAIL===');
    var email = ses.sendEmail(eParams, function (err, data) {
      if (err) reject(err);
      else {
        console.log("===EMAIL SENT===");
        resolve();

      }
    });
  })
}

async function check(event, context, callback) {
  var webdriver = require('selenium-webdriver');
  var chrome = require('selenium-webdriver/chrome');
  var builder = new webdriver.Builder().forBrowser('chrome');
  var chromeOptions = new chrome.Options();
  const defaultChromeFlags = [
    '--headless',
    '--disable-gpu',
    '--window-size=1280x1696', // Letter size
    '--no-sandbox',
    '--user-data-dir=/tmp/user-data',
    '--hide-scrollbars',
    '--enable-logging',
    '--log-level=0',
    '--v=99',
    '--single-process',
    '--data-path=/tmp/data-path',
    '--ignore-certificate-errors',
    '--homedir=/tmp',
    '--disk-cache-dir=/tmp/cache-dir'
  ];

  chromeOptions.addArguments(defaultChromeFlags);
  builder.setChromeOptions(chromeOptions);

  var driver = builder.build();

  await driver.get(POSTCODE_CHECKER);
  await driver.findElement(webdriver.By.id('postcode-field')).sendKeys(event.postcode, webdriver.Key.RETURN);
  await driver.wait(webdriver.until.elementIsVisible(driver.findElement(webdriver.By.css('.address-results'))), 5000);

  let addressList = await driver.findElements(webdriver.By.css(".address-list > li"))

  for (let addressIndex = 0; addressIndex < addressList.length; addressIndex++) {
    const address = addressList[addressIndex];
    const addressText = await address.getText();

    console.log(addressText);

    if (addressText.includes(event.fullAddress)) {
      console.log("Found " + addressIndex);

      await address.click();
      break;
    }

    if (addressIndex === addressList.length - 1) {
      throw new Error("Address not found")
    }
  }

  await driver.findElement(webdriver.By.id('next')).click();
  await driver.sleep(5000);

  const url = await driver.getCurrentUrl();

  await driver.quit();

  let message = undefined;

  if (url.startsWith(SERVICE_AVAILABLE_URL)) {
    message = 'Services are available! :)';
  } else if (url.startsWith(SERVICE_UNAVAILABLE_URL)) {
    message = 'Services are not available! :(';
  }

  if (!message) {
    callback("Unable to determine");
  } else {
    await sendEmail(message, event.email)
    callback(null, message);
  }
};

exports.check = check;