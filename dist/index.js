"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const grammy_1 = require("grammy");
const parse_1 = require("./parse");
const prisma_1 = __importDefault(require("./prisma"));
dotenv_1.default.config();
if (process.env.API_TOKEN === undefined) {
    throw new Error('API_TOKEN is not defined');
}
const bot = new grammy_1.Bot(process.env.API_TOKEN);
bot.command('start', async (ctx) => {
    await ctx.reply(`
        <b>Привет! 👋 Я бот для отслеживания цен на приложения в App Store.</b>\n
<em>Чтобы начать, просто отправьте команду /start. Для добавления приложения используйте команду /add *ссылка*.</em>\n
<em>Пример: /add https://apps.apple.com/kz/app/minecraft/id479516143</em>
        `, {
        parse_mode: 'HTML',
        link_preview_options: {
            is_disabled: true
        }
    });
});
bot.command('add', async (ctx) => {
    const url = ctx.message.text.split(' ')[1];
    const tg_id = ctx.message.from.id.toString();
    if (!url) {
        await ctx.reply('Пустая ссылка!');
        return;
    }
    let appLink = await prisma_1.default.appLink.findFirst({ where: { url: url } });
    if (!appLink) {
        const data = await (0, parse_1.parsePrice)(url);
        if (data) {
            appLink = await prisma_1.default.appLink.create({
                data: {
                    url: url,
                    title: data.title,
                    price: data.price
                }
            });
        }
        else {
            await ctx.reply("Не удалось получить данные с указанной ссылки.");
            return;
        }
    }
    let user = await prisma_1.default.user.findFirst({ where: { tg_url: tg_id } });
    if (!user) {
        user = await prisma_1.default.user.create({ data: { tg_url: tg_id } });
    }
    const sub = await prisma_1.default.subscription.findFirst({
        where: {
            userId: user.id,
            appLinkId: appLink.id
        }
    });
    if (sub) {
        await ctx.reply('Приложение уже отслеживается!');
        return;
    }
    await prisma_1.default.subscription.create({ data: { userId: user.id, appLinkId: appLink.id } });
    ctx.reply(`Ссылка добавлена и отслеживается! \nПриложение: ${appLink.title} \nТекущая цена: ${appLink.price}`);
});
const checkPrices = async () => {
    const appLinks = await prisma_1.default.appLink.findMany({
        include: {
            Subscription: {
                include: {
                    user: true
                }
            }
        }
    });
    for (const link of appLinks) {
        const data = await (0, parse_1.parsePrice)(link.url);
        if (!data)
            return;
        if (parsePriceFormat(data.price) !== parsePriceFormat(link.price)) {
            await prisma_1.default.appLink.update({
                where: { id: link.id },
                data: {
                    price: data.price
                }
            });
            for (const sub of link.Subscription) {
                console.log(`Цена изменилась на приложение ${link.title}!\n${link.url}\nСтарая цена: ${link.price}\nНовая цена: ${data.price}\nСсылка: ${link.url}`);
                await bot.api.sendMessage(sub.user.tg_url, `Цена изменилась на приложение ${link.title}!\n${link.url}\nСтарая цена: ${link.price}\nНовая цена: ${data.price}\nСсылка: ${link.url}`);
            }
        }
    }
};
function parsePriceFormat(price) {
    return parseFloat(price.slice(0, -1));
}
// schedule('*/5 * * * *', () => {
//     checkPrices()
// })
setTimeout(() => {
    console.log("hi");
    checkPrices();
}, 10000);
bot.start();
