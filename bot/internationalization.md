# 国际化

用户在冒泡 App 中选择的语言会通过服务端更新提供给 Bot SDK，SDK 将语言信息保留在上下文中。Bot 可以据此返回对应语言的消息，并为命令菜单提供多语言说明。SDK 不负责翻译消息正文；应用需要自行维护各语言文案、选择匹配语言，并设置默认的回退语言。

## 取得当前语言

语言通常来自 `ctx.chat.language` 或 `ctx.from.language`。可以先使用对话语言，再使用发送者语言，最后回退到应用的默认语言：

```js
function localeFromContext(ctx) {
  const language = String(
    ctx.chat?.language || ctx.from?.language || '',
  ).toLowerCase();

  if (language.startsWith('zh')) return 'zh-CN';
  if (language.startsWith('ja')) return 'ja';
  return 'en-US';
}
```

`ctx.chat` 和 `ctx.from` 来自当前消息更新。业务代码不能假定它始终存在，因此需要明确设置回退语言。

上面的顺序适合让整个对话使用同一种语言。群聊需要按发送者分别回复时，可以优先读取 `ctx.from.language`，再回退到 `ctx.chat.language`。

## 管理消息文案

把业务代码使用的稳定键与各语言文案分开：

```js
const messages = {
  'zh-CN': {
    hello: '你好，很高兴认识你！',
  },
  ja: {
    hello: 'こんにちは、お会いできてうれしいです！',
  },
  'en-US': {
    hello: 'Hello, nice to meet you!',
  },
};

function text(locale, key) {
  return messages[locale]?.[key] || messages['en-US'][key] || key;
}

bot.on('message:text', async (ctx) => {
  const locale = localeFromContext(ctx);
  await ctx.sendText(text(locale, 'hello'));
});
```

`sendText()`、`sendKeyboard()` 和 `sendBindDevice()` 只发送传入的内容。按钮标题、关联引导和错误提示也应通过同一套文案选择逻辑取得。

## 翻译命令菜单说明

`setCommands()` 中的 `command` 是实际发送给 Bot 的命令名，各语言保持一致；`description` 是默认说明，`descTranslations` 提供本地化说明：

```js
await bot.setCommands([
  {
    command: 'hello',
    description: 'Say hello',
    descTranslations: {
      'zh-CN': '打个招呼',
      ja: '挨拶する',
      en: 'Say hello',
    },
  },
]);
```

根据 SDK 当前实现，`descTranslations` 支持 `zh-CN`、`ja` 和 `en`。可以直接传对象，SDK 会在提交命令菜单前整理为服务端需要的格式。命令说明的翻译不会替代消息处理器；用户选择命令后，Bot 仍会收到 `/hello` 文本，并由业务代码决定如何回复。

完整示例位于 `examples/bot-i18n`。