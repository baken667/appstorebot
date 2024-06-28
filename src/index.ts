import dotenv from 'dotenv'
import { Bot, Context } from 'grammy'
import { parsePrice } from './parse'
import { schedule } from 'node-cron'
import prisma from './prisma'

dotenv.config()

if (process.env.API_TOKEN === undefined) {
    throw new Error('API_TOKEN is not defined')
}

const bot = new Bot(process.env.API_TOKEN)

bot.command('start', async (ctx: Context) => {
    await ctx.reply(`
        <b>Привет! 👋 Я бот для отслеживания цен на приложения в App Store.</b>\n
<em>Чтобы начать, просто отправьте команду /start. Для добавления приложения используйте команду /add *ссылка*.</em>\n
<em>Пример: /add https://apps.apple.com/kz/app/minecraft/id479516143</em>
        `, {
        parse_mode: 'HTML',
        link_preview_options: {
            is_disabled: true
        }
    })
})

bot.command('add', async (ctx: Context) => {
    const url = ctx.message!.text!.split(' ')[1]
    const tg_id = ctx.message!.from!.id.toString()

    if (!url) {
        await ctx.reply('Пустая ссылка!')
        return;
    }

    let appLink = await prisma.appLink.findFirst({ where: { url: url } })

    if (!appLink) {
        const data = await parsePrice(url)

        if (data) {
            appLink = await prisma.appLink.create({
                data: {
                    url: url,
                    title: data.title,
                    price: data.price
                }
            })
        } else {
            await ctx.reply("Не удалось получить данные с указанной ссылки.")
            return;
        }
    }

    let user = await prisma.user.findFirst({ where: { tg_url: tg_id } })

    if (!user) {
        user = await prisma.user.create({ data: { tg_url: tg_id } })
    }

    const sub = await prisma.subscription.findFirst({
        where: {
            userId: user.id,
            appLinkId: appLink.id
        }
    })

    if (sub) {
        await ctx.reply('Приложение уже отслеживается!')
        return;
    }

    await prisma.subscription.create({ data: { userId: user.id, appLinkId: appLink.id } })

    ctx.reply(`Ссылка добавлена и отслеживается! \nПриложение: ${appLink.title} \nТекущая цена: ${appLink.price}`)
})

const checkPrices = async () => {
    const appLinks = await prisma.appLink.findMany({
        include: {
            Subscription: {
                include: {
                    user: true
                }
            }
        }
    })

    for (const link of appLinks) {
        console.log(link.price)
        const data = await parsePrice(link.url)

        console.log(data)

        if (!data) return;

        console.log(data.price, 'data')
        console.log(parseFloat(data.price), 'price')

        if (parseFloat(data.price) !== parseFloat(link.price)) {

            console.log('updated:', data.price)
            await prisma.appLink.update({
                where: { id: link.id },
                data: {
                    price: data.price
                }
            })

            for (const sub of link.Subscription) {
                console.log(`Цена изменилась на приложение ${link.title}!\n${link.url}\nСтарая цена: ${link.price}\nНовая цена: ${data.price}\nСсылка: ${link.url}`)
                await bot.api.sendMessage(sub.user.tg_url, `Цена изменилась на приложение ${link.title}!\n${link.url}\nСтарая цена: ${link.price}\nНовая цена: ${data.price}\nСсылка: ${link.url}`)
            }
        }
    }
}

schedule('0 * * * *', () => {
    checkPrices()
})

bot.start()