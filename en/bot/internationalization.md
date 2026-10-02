# Internationalization

The language selected by the user in Bubble App will be provided to Bot SDK by service-end updates, and the SDK keeps the language information in context. Bot can then return the message in the corresponding language and provide multilingual descriptions for the command menu. SDK does not translate the text; applications need to maintain their own text, select matching language and set the default exit language.

## Get Current Language

Language usually comes from `ctx.chat.language` or `ctx.from.language`. You can use the chat language first, then the sender language, and then back to the default language used:

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

`ctx.chat` and `ctx.from` are updates from the current message. The business code does not assume that it will always exist, so it needs to be clearly set back language.

The order above is appropriate for the entire chat to be in the same language. When a group of conversations requires a separate response by the sender, you can read `ctx.from.language` first and then back to `ctx.chat.language`.

## Manage localized messages

Dissociate the Stable Keys used in the business code from the language scripts:

```js
const messages = {
  'zh-CN': {
    hello: 'Hello., Nice to meet you.！',
  },
  ja: {
    hello: 'こんにちは, お会いできてうれしいです！',
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

`sendText()`, `sendKeyboard()` and `sendBindDevice()` Only the contents that you enter should be sent. Button titles, asociote guides, and error tips should also be obtained by the same text selection logic.

## Localize command menu descriptions

`setCommands()` Medium `command` It's actually sent to Bot's command, which is consistent in all languages;`description` It's the default.`descTranslations` Localized description:

```js
await bot.setCommands([
  {
    command: 'hello',
    description: 'Say hello',
    descTranslations: {
      'zh-CN': 'Say hello.',
      ja: 'I'll take it.する',
      en: 'Say hello',
    },
  },
]);
```

According to the current SDK achievement, `descTranslations` supports `zh-CN`, `ja` and `en`. The object can be passed directly and the SDK will organize the format required by the service before submitting the command menu. The translation of the command note will not replace the message handler; after the user selects the command, Bot will still receive `/hello` text and the business code will decide how to respond.

The full example is at `examples/bot-i18n`.
