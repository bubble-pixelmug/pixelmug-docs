# WebApp Internationalization

WebApp can display different scripts according to the language selected by the user in Bubble App. Bubble App will provide the current WebView language environment via the original bridge, and the page will read the language from `globalThis.JeeWeb.Language`, and then choose the text and format.

WebApp SDK does not automatically translate page contents or apply management language packages for applications. Developer needs to decide which language to support, how to match the language code, and which language to return when a file cannot be found.

## Read Language Environment

The following examples are used to test the language environment to support the Chinese and English languages, while the rest is sent back to English:

```js
function detectLocale() {
  return globalThis.JeeWeb?.Language === 'zh-CN'
    ? 'zh-CN'
    : 'en-US';
}

const locale = detectLocale();
```

The original bridge field for Bubble App is `JeeWeb.Language`, case-sensitive. WebApp should read it when the page starts.

## Manage PageBook

Simple application allows you to save a text by using a language object:

```js
const messages = {
  'zh-CN': {
    title: 'Pixel graffiti',
    send: 'Send to PixelMug',
  },
  'en-US': {
    title: 'Pixel Drawing',
    send: 'Send to PixelMug',
  },
};

const locale =
  globalThis.JeeWeb?.Language === 'zh-CN'
    ? 'zh-CN'
    : 'en-US';

function t(key) {
  return messages[locale]?.[key]
    || messages['en-US'][key]
    || key;
}

document.documentElement.lang = locale;
document.title = t('title');
document.querySelector('#send').textContent = t('send');
```

When the item is larger, you can give the same `locale` to an international repository such as Vue I18n. In either way, the page should provide the default language and avoid empty content when the language code or file is missing.

Bot and WebApp judge their respective language settings: Bot selects the response text from the context of the message, WebApp selects the page file from `JeeWeb.Language`. Bot is available for multilingual processing at [Bot Internationalization](/en/bot/internationalization).
