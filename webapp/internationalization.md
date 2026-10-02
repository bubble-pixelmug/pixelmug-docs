# WebApp 国际化

WebApp 可以根据用户在冒泡 App 中选择的语言显示不同文案。冒泡 App 会通过原生桥提供当前 WebView 的语言环境，页面从 `globalThis.JeeWeb.Language` 读取语言，再自行选择文案和格式化方式。

WebApp SDK 不会自动翻译页面内容，也不会替应用管理语言包。开发者需要决定支持哪些语言、如何匹配语言代码，以及找不到文案时回退到哪种语言。

## 读取语言环境

下面的示例检测语言环境，支持简体中文和英文，其他情况统一回退到英文：

```js
function detectLocale() {
  return globalThis.JeeWeb?.Language === 'zh-CN'
    ? 'zh-CN'
    : 'en-US';
}

const locale = detectLocale();
```

冒泡 App 的原生桥字段是 `JeeWeb.Language`，注意大小写。WebApp 应在页面启动时读取它。

## 管理页面文案

简单应用可以使用语言对象保存文案：

```js
const messages = {
  'zh-CN': {
    title: '像素涂鸦',
    send: '发送到 PixelMug',
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

项目较大时，可以把相同的 `locale` 交给 Vue I18n 等国际化库。无论采用哪种方式，页面都应提供默认语言，避免语言代码或文案缺失时显示空内容。

Bot 和 WebApp 分别判断各自的语言环境：Bot 根据消息上下文选择回复文案，WebApp 根据 `JeeWeb.Language` 选择页面文案。Bot 的多语言处理见 [Bot 国际化](/bot/internationalization)。
