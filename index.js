const { Client, GatewayIntentBits } = require('discord.js');

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

const TOKEN = process.env.DISCORD_TOKEN;
const CHANNEL_ID = process.env.CHANNEL_ID;

function getNextTimestamp(dayOfWeek, hour, minute) {
  const now = new Date();

  const currentUtcDay = now.getUTCDay();
  const currentMoscowDay = (currentUtcDay + 0) % 7;

  const moscowNow = new Date(now.getTime() + 3 * 60 * 60 * 1000);
  const todayMoscowDay = moscowNow.getUTCDay();

  let diff = dayOfWeek - todayMoscowDay;
  if (diff < 0) diff += 7;

  const eventMoscow = new Date(moscowNow);
  eventMoscow.setUTCDate(moscowNow.getUTCDate() + diff);
  eventMoscow.setUTCHours(hour, minute, 0, 0);

  if (diff === 0 && eventMoscow <= moscowNow) {
    eventMoscow.setUTCDate(eventMoscow.getUTCDate() + 7);
  }

  const eventUtc = new Date(eventMoscow.getTime() - 3 * 60 * 60 * 1000);
  return Math.floor(eventUtc.getTime() / 1000);
}

async function sendSchedule() {
  const channel = await client.channels.fetch(CHANNEL_ID);
  if (!channel) {
    console.log('Канал не найден');
    return;
  }

  const message =
`**Расписание**

**Пати**
ПН-ЧТ — 18:00 МСК (<t:${getNextTimestamp(1, 18, 0)}:t>)
ПТ-ВС — 13:00 МСК (<t:${getNextTimestamp(5, 13, 0)}:t>)

**Среда**
Арена — 18:30 МСК (<t:${getNextTimestamp(3, 18, 30)}:t>)
Breaking Army — 19:00 МСК (<t:${getNextTimestamp(3, 19, 0)}:t>)

**Суббота**
Арена — 13:30 МСК (<t:${getNextTimestamp(6, 13, 30)}:t>)
Breaking Army — 14:00 МСК (<t:${getNextTimestamp(6, 14, 0)}:t>)`;

  await channel.send(message);
  console.log('Расписание отправлено');
}

client.once('ready', async () => {
  console.log(`Бот запущен как ${client.user.tag}`);
  await sendSchedule();
});

client.login(TOKEN);
