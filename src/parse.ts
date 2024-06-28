import * as cheerio from "cheerio";

interface ParsedData {
    title: string;
    price: string;
}


const parsePrice = async (url: string): Promise<ParsedData | null> => {
    console.log(url)
    try {
        console.log('start fetch');
        const response = await fetch(url);
        const html = await response.text()
        const $ = cheerio.load(html);

        const title = $(".app-header__title").contents().filter(function () {
            return this.type === 'text'
        }).text().trim();
        const priceText = $('.app-header__list__item--price').text().trim().replace(',', '.');

        return {
            title: title,
            price: priceText
        }
    } catch (e) {
        console.error(e)
        return null
    } finally {
        console.log('end fetch');
    }
}

export { parsePrice }
