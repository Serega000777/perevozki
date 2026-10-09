import { Markup, Telegraf } from 'telegraf';

const token = process.env.BOT_TOKEN;
const webAppUrl = process.env.WEBAPP_URL;
if (!token || !webAppUrl) {
  console.error('BOT_TOKEN и WEBAPP_URL обязательны для запуска бота');
  process.exit(1);
}
if (new URL(webAppUrl).protocol !== 'https:') console.warn('Telegram открывает Mini App только по HTTPS — проверьте WEBAPP_URL');

const bot = new Telegraf(token);
bot.start((ctx) => ctx.reply('Перевозки — учёт техники, ходок и расходов', Markup.inlineKeyboard([Markup.button.webApp('Открыть Перевозки', webAppUrl)])));

await bot.telegram.setMyCommands([{ command: 'start', description: 'Открыть Перевозки' }]);
await bot.telegram.setChatMenuButton({ menuButton: { type: 'web_app', text: 'Открыть', web_app: { url: webAppUrl } } });
for (const signal of ['SIGINT', 'SIGTERM'] as const) process.once(signal, () => bot.stop(signal));
await bot.launch(() => console.log('Telegram bot started'));
