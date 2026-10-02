import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitepress';
const deviceModules = [
  ['runtime', 'MPY 运行基础'],
  ['network', 'Network'], ['micropyxel', 'MicroPyxel'], ['audio', 'Audio Service'], ['prompt-sound', '提示音播放器'],
  ['g-sensor', 'G-sensor'], ['button', 'Touch'], ['dust', 'Dust'],
];
const zhTheme = {
    nav: [{ text: '快速了解', link: '/overview/' }, { text: '开始开发', link: '/getting-started/' }, { text: 'Studio', link: '/studio/' }, { text: '更新记录', link: '/changelog/' }],
    sidebar: [
      { text: '开发指南', items: [
        { text: '文档首页', link: '/' }, { text: '快速了解', link: '/overview/' },
        { text: '立刻体验', link: '/getting-started/', collapsed: false, items: [
          { text: '01 · 通过对话与 PixelMug 交互', link: '/getting-started/01-chat' },
          { text: '02 · 通过 WebApp 与 PixelMug 交互', link: '/getting-started/02-pixel-text' },
          { text: '03 · 在 PixelMug 上安装和运行 MPY', link: '/getting-started/03-ble-play' },
          { text: '04 · 体验更多 MPY 应用', link: '/getting-started/04-more-mpy' },
        ] },
        { text: '核心概念', link: '/concepts/' }, { text: 'Studio 使用说明', link: '/studio/' },
      ] },
      { text: 'SDK 与接口', items: [
        { text: 'Bot SDK', link: '/bot/', collapsed: false, items: [
          { text: '应用框架与入门', collapsed: false, items: [
            { text: '运行框架', link: '/bot/runtime' },
            { text: '第一个 Bot', link: '/bot/quick-start' },
          ] },
          { text: '对话交互', collapsed: true, items: [
            { text: '上下文与事件', link: '/bot/events' },
            { text: '发送和回复消息', link: '/bot/messages' },
            { text: '消息内按钮', link: '/bot/inline-keyboard' },
            { text: '媒体与文件', link: '/bot/media' },
            { text: '命令与群聊', link: '/bot/commands-and-groups' },
            { text: '国际化', link: '/bot/internationalization' },
          ] },
          { text: '关联与调用设备', collapsed: true, items: [
            { text: '设备声明与关联', link: '/bot/devices' },
            { text: '使用设备 RPC SDK', link: '/bot/device-sdk' },
            { text: '设备调用与结果', link: '/bot/device-rpc' },
            { text: '设备通知与多设备路由', link: '/bot/device-events' },
          ] },
          { text: '接口索引', link: '/bot/reference' },
        ] },
        { text: 'WebApp SDK', link: '/webapp/', collapsed: false, items: [
          { text: '概览', link: '/webapp/' },
          { text: '快速开始', link: '/webapp/quick-start' },
          { text: 'WebApp 与 Bot 通信', link: '/webapp/bot-channel' },
          { text: 'Bot 向 WebApp 推送数据', link: '/webapp/push' },
          { text: '页面会话与生命周期', link: '/webapp/lifecycle' },
          { text: '国际化', link: '/webapp/internationalization' },
          { text: '获取关联设备', link: '/webapp/devices' },
          { text: '调用设备 RPC', link: '/webapp/device-rpc' },
          { text: '获取设备上报事件', link: '/webapp/device-events' },
          { text: '观察设备调用', link: '/webapp/observe-device-calls' },
          { text: '打开条件', link: '/webapp/access-policy' },
          { text: '错误处理与使用限制', link: '/webapp/errors-and-limits' },
          { text: '接口索引', link: '/webapp/reference' },
        ] },
        { text: '设备端接口', link: '/device/', collapsed: false, items: deviceModules.map(([path,text]) => ({
          text, link: `/device/${path}/`,
          ...(path === 'micropyxel' ? { collapsed: true, items: [
            { text: '运行与事件', link: '/device/micropyxel/runtime' },
            { text: '绘图与颜色', link: '/device/micropyxel/graphics' },
            { text: '图片与字体', link: '/device/micropyxel/images' },
            { text: 'Tilemap 图块地图', link: '/device/micropyxel/tilemap' },
            { text: '声音播放', link: '/device/micropyxel/audio' },
            { text: '声音资源', link: '/device/micropyxel/sound' },
            { text: 'MML 乐谱', link: '/device/micropyxel/mml' },
            { text: '资源与数学接口', link: '/device/micropyxel/resources' },
          ] } : path === 'network' ? { collapsed: true, items: [
            { text: 'HTTP 与 HTTPS', link: '/device/network/http' },
            { text: 'WebSocket', link: '/device/network/websocket' },
            { text: 'TLS 与证书', link: '/device/network/tls' },
            { text: 'Socket', link: '/device/network/socket' },
            { text: '连接生命周期', link: '/device/network/lifecycle' },
          ] } : path === 'audio' ? { collapsed: true, items: [
            { text: '初始化与事件', link: '/device/audio/controller' },
            { text: '播放音频', link: '/device/audio/playback' },
            { text: '录音', link: '/device/audio/recording' },
            { text: '频谱分析', link: '/device/audio/spectrum' },

          ] } : path === 'g-sensor' ? { collapsed: true, items: [
            { text: '读取运动数据', link: '/device/g-sensor/readings' },
            { text: '运动事件', link: '/device/g-sensor/events' },
          ] } : {}),
        })) },        
        { text: 'BLE', link: '/ble/', collapsed: false, items: [
          { text: '连接冒泡 App', link: '/ble/app/', collapsed: false, items: [
            { text: '总体框架与最小示例', link: '/ble/app/' },
            { text: 'WebApp BLE 接口', link: '/ble/app/webapp/', collapsed: true, items: [
              { text: '创建客户端和连接管理', link: '/ble/app/webapp/' },
              { text: '命令与响应', link: '/ble/app/webapp/commands' },
              { text: '状态与事件', link: '/ble/app/webapp/state-events' },
              { text: '配置接口', link: '/ble/app/webapp/config' },
              { text: '高速数据通道接口', link: '/ble/app/webapp/simple' },
            ] },
            { text: 'MPY BLE 接口', link: '/ble/app/mpy/', collapsed: true, items: [
              { text: '创建服务端与生命周期', link: '/ble/app/mpy/' },
              { text: '命令与响应', link: '/ble/app/mpy/commands' },
              { text: '状态与事件', link: '/ble/app/mpy/state-events' },
              { text: '配置接口', link: '/ble/app/mpy/config' },
              { text: '高速数据通道接口', link: '/ble/app/mpy/simple' },              
            ] },
          ] },
          { text: '连接自定义 BLE 中心设备', link: '/ble/custom-client' },
        ] },        
      ] },
      { text: '帮助与更新', items: [
        { text: '示例来源索引', link: '/concepts/source-examples' },
        { text: '文档框架与补全顺序', link: '/concepts/documentation-map' },
        { text: '常见问题', link: '/troubleshooting/' }, { text: '更新记录', link: '/changelog/' },
      ] },
    ],
    search: { provider: 'local', options: { locales: { root: { translations: {
      button: { buttonText: '搜索文档', buttonAriaLabel: '搜索文档' },
      modal: { noResultsText: '没有找到相关内容', resetButtonTitle: '清空搜索', footer: { selectText: '选择', navigateText: '切换', closeText: '关闭' } },
    } } } } },
    outline: { label: '本页目录', level: [2,3] },
    docFooter: { prev: '上一页', next: '下一页' },
    sidebarMenuLabel: '文档目录', returnToTopLabel: '回到顶部', darkModeSwitchLabel: '切换主题',
};

const docsRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const enGroupLabels = new Map([
  ['开发指南', 'Developer guide'],
  ['SDK 与接口', 'SDKs and APIs'],
  ['应用框架与入门', 'Framework and getting started'],
  ['对话交互', 'Chat interaction'],
  ['关联与调用设备', 'Linking and controlling devices'],
  ['帮助与更新', 'Help and updates'],
]);

function englishPageTitle(link, fallback) {
  const relative = link === '/'
    ? 'index.md'
    : link.endsWith('/')
      ? `${link.slice(1)}index.md`
      : `${link.slice(1)}.md`;
  try {
    const markdown = readFileSync(resolve(docsRoot, 'en', relative), 'utf8');
    return markdown.match(/^#\s+(.+)$/m)?.[1]?.replace(/\s+\{#[^}]+\}\s*$/, '') || fallback;
  } catch {
    return fallback;
  }
}

function englishItems(items) {
  return items.map((item) => {
    const link = item.link
      ? item.link === '/' ? '/en/' : `/en${item.link}`
      : undefined;
    return {
      ...item,
      text: item.link
        ? englishPageTitle(item.link, item.text)
        : enGroupLabels.get(item.text) || item.text,
      ...(link ? { link } : {}),
      ...(item.items ? { items: englishItems(item.items) } : {}),
    };
  });
}

const enTheme = {
  nav: englishItems(zhTheme.nav),
  sidebar: englishItems(zhTheme.sidebar),
  search: { provider: 'local' },
  outline: { label: 'On this page', level: [2, 3] },
  docFooter: { prev: 'Previous page', next: 'Next page' },
  sidebarMenuLabel: 'Documentation menu',
  returnToTopLabel: 'Return to top',
  darkModeSwitchLabel: 'Switch theme',
};

export default defineConfig({
  srcExclude: ['README.md'],
  locales: {
    root: {
      label: '简体中文',
      lang: 'zh-CN',
      title: 'PixelMug 开发文档',
      description: '冒泡智能体、Bot、WebApp 与 PixelMug 设备开发文档',
      themeConfig: zhTheme,
    },
    en: {
      label: 'English',
      lang: 'en-US',
      link: '/en/',
      title: 'PixelMug Developer Documentation',
      description: 'Developer documentation for Bubble agents, Bots, WebApps, and PixelMug devices',
      themeConfig: enTheme,
    },
  },
  vite: {
    server: { headers: { 'Content-Security-Policy': "frame-ancestors 'self' http://127.0.0.1:* http://localhost:*" } },
    preview: { headers: { 'Content-Security-Policy': "frame-ancestors 'self' http://127.0.0.1:* http://localhost:*" } },
  },
});