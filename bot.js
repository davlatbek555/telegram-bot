const TelegramBot = require('node-telegram-bot-api');

// Bot tokeni
const API_TOKEN = '7331217072:AAHu8sn4k44QSGD595Wy5sBszC9HZJ7beBw'; // O'zingizning tokeningizni qo'ying
const ADMIN_IDS = [5431809069]; // Adminlarning ID ro'yxati
let REQUIRED_CHANNELS = ["@uzsave_kino", "@uzsavegaming", "@uzsave_seriallar"]; // Majburiy obuna bo'lish kanallari

// Botni yaratish
const bot = new TelegramBot(API_TOKEN, { polling: true });

// Obuna holatini tekshirishni qayta yozish
async function joinChat(userId) {
    let notJoinedChannels = [];
    for (let channel of REQUIRED_CHANNELS) {
        try {
            const response = await bot.getChatMember(channel, userId);
            const status = response.status;
            if (!["member", "administrator", "creator"].includes(status)) {
                notJoinedChannels.push(channel);
            }
        } catch (error) {
            console.warn(`Xato: ${channel} - ${error.message}`);
            notJoinedChannels.push(channel); // Agar kanalga kirish xatosi yuz bersa, uni obuna bo'lmagan deb hisoblash
        }
    }
    return notJoinedChannels;
}


// Inline tugmalarni yaratish
function createInlineButtons(notJoinedChannels) {
    let buttons = notJoinedChannels.map(channel => {
        return [
            {
                text: `➕ Obuna bo'lish`,
                url: `https://t.me/${channel.slice(1)}`
            }
        ];
    });

    buttons.push([{
        text: "✅ Tasdiqlash",
        callback_data: "subdone"
    }]);

    return {
        reply_markup: {
            inline_keyboard: buttons
        }
    };
}

// /start komandasini qo'shish
bot.onText(/\/start/, async (msg) => {
    const userId = msg.from.id;

    // Obuna holatini tekshirish
    const notJoinedChannels = await joinChat(userId);

    // Foydalanuvchi obuna bo'lmagan bo'lsa
    if (notJoinedChannels.length > 0) {
        const inlineButtons = createInlineButtons(notJoinedChannels);
        return;
    }

    // Foydalanuvchi obuna bo'lgan bo'lsa
    return bot.sendMessage(userId, "👋 Assalomu alaykum! Kino kodini kiriting va kerakli kinoni toping!");
});

// Kino kodi uchun
bot.on('message', async (msg) => {
    const userId = msg.from.id;
    const text = msg.text;

    // Foydalanuvchi kanalga obuna bo'lmagan bo'lsa
    const notJoinedChannels = await joinChat(userId);
    if (notJoinedChannels.length > 0) {
        const inlineButtons = createInlineButtons(notJoinedChannels);
        bot.sendMessage(userId, "Iltimos, quyidagi kanallarga obuna bo'ling:", inlineButtons);
        return; // Obuna bo'lmagan foydalanuvchiga xabar yubormaslik
    }

    // Kino kodi faqat raqam bo'lishi kerak
    if (/^\d+$/.test(text)) {
        const videoUrl = `https://t.me/agarsizshukanalnitopsangiz/${text}`;
        try {
            await bot.sendVideo(userId, videoUrl, { caption: `🎬 Kino kodi: ${text}\n🤖 Bizning bot: @UzSaveKino` });
        } catch (error) {
            bot.sendMessage(userId, "❌ Kino topilmadi yoki xato yuz berdi.");
        }
    } else if (/^[a-zA-Z]+$/.test(text)) {  // Agar harf bo'lsa
        bot.sendMessage(userId, "❌ Kino kodi noto'g'ri formatda. Iltimos, faqat raqam kiriting.");
    }
});

// Callback query uchun yangilangan handler
bot.on('callback_query', async (query) => {
    const userId = query.from.id;
    const messageId = query.message.message_id;

    if (query.data === "subdone") {
        const notJoinedChannels = await joinChat(userId);

        // Agar foydalanuvchi hali ham obuna bo'lmagan bo'lsa
        if (notJoinedChannels.length > 0) {
            await bot.deleteMessage(userId, messageId);
            bot.sendMessage(
                userId,
                "❌ Siz hali ham obuna bo'lmagansiz. Quyidagi kanallarga obuna bo'ling:",
                createInlineButtons(notJoinedChannels)
            );
        } else {
            // Obuna bo'lgan bo'lsa, eski xabarni o'chirib yangi xabar yuborish
            await bot.deleteMessage(userId, messageId);
            bot.sendMessage(userId, "✅ Obuna tasdiqlandi. Endi botdan foydalanishingiz mumkin!");
        }
    }
});

// Adminlar uchun /admin buyruq
bot.onText(/\/admin/, async (msg) => {
    const userId = msg.from.id;
    if (!ADMIN_IDS.includes(userId)) {
        bot.sendMessage(userId, "❌ Siz administrator emassiz!");
        return;
    }

    let channelsList = REQUIRED_CHANNELS.join("\n");
    bot.sendMessage(userId, `Admin paneli:\n\nMajburiy obuna bo'lish kanallari:\n${channelsList}\n\n/switch_channel - Kanal qo'shish/olib tashlash\n/broadcast [xabar] - Hammasiga xabar yuborish`);
});

// Majburiy kanalni qo'shish yoki olib tashlash
bot.onText(/\/switch_channel/, (msg) => {
    const userId = msg.from.id;
    if (!ADMIN_IDS.includes(userId)) {
        bot.sendMessage(userId, "❌ Siz administrator emassiz!");
        return;
    }

    bot.sendMessage(userId, "Kanalni qo'shish yoki olib tashlash uchun quyidagi tugmani bosing:", {
        reply_markup: {
            inline_keyboard: [
                [
                    { text: "➕ Kanal qo'shish", callback_data: "add_channel" },
                    { text: "❌ Kanalni olib tashlash", callback_data: "remove_channel" }
                ]
            ]
        }
    });
});

// Kanalni qo'shish va olib tashlash
bot.on('callback_query', (query) => {
    const userId = query.from.id;
    if (!ADMIN_IDS.includes(userId)) return;

    const action = query.data;

    if (action === 'add_channel') {
        bot.sendMessage(userId, "Obuna bo'ladigan kanalingizni kiriting (masalan, @kanal_nom):");
        bot.once('message', (msg) => {
            const newChannel = msg.text.trim();
            if (REQUIRED_CHANNELS.includes(newChannel)) {
                bot.sendMessage(userId, "Bu kanal allaqachon mavjud!");
            } else {
                REQUIRED_CHANNELS.push(newChannel);
                bot.sendMessage(userId, `Kanal qo'shildi: ${newChannel}`);
                // Yangi qo'shilgan kanalni tekshirishga qo'shamiz
                bot.sendMessage(userId, `Obuna bo'lish uchun quyidagi kanallarga obuna bo'ling: ${REQUIRED_CHANNELS.join(', ')}`);
            }
        });
    } else if (action === 'remove_channel') {
        bot.sendMessage(userId, "Obunani olib tashlaydigan kanalingizni kiriting (masalan, @kanal_nom):");
        bot.once('message', (msg) => {
            const removeChannel = msg.text.trim();
            const index = REQUIRED_CHANNELS.indexOf(removeChannel);
            if (index !== -1) {
                REQUIRED_CHANNELS.splice(index, 1);
                bot.sendMessage(userId, `Kanal olib tashlandi: ${removeChannel}`);
            } else {
                bot.sendMessage(userId, "Bu kanal ro'yxatda yo'q!");
            }
        });
    }
});