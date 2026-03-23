const { Client, GatewayIntentBits } = require('discord.js');

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

const TOKEN = process.env.DISCORD_TOKEN;
const CHANNEL_ID = process.env.CHANNEL_ID;

// Расписание по московскому времени
const schedule = [
  // Пати: ПН-ЧТ — 18:00
  { name: 'Пати', days: [1, 2, 3, 4], hour: 18, minute: 0 },

  // Пати: ПТ-ВС — 13:00
  { name: 'Пати', days: [5, 6, 0], hour: 13, minute: 0 },

  // Среда
  { name: 'Арена', days: [3], hour: 18, minute: 30 },
  { name: 'Breaking Army', days: [3], hour: 19, minute: 0 },

  // Суббота
  { name: 'Арена', days: [6], hour: 13, minute: 30 },
  { name: 'Breaking Army', days: [6], hour: 14, minute: 0 }
];

// Москва = UTC+3
function getMoscowNow() {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  return new Date(utc + 3 * 60 * 60 * 1000);
}

// Получаем дату события в UTC, если расписание указано по МСК
function getEventDateUTC(dayOfWeek, hour, minute) {
  const nowMsk = getMoscowNow();
  const currentDay = nowMsk.getDay();

  let diff = dayOfWeek - currentDay;
  if (diff < 0) diff += 7;

  const eventMsk = new Date(nowMsk);
  eventMsk.setDate(nowMsk.getDate() + diff);
  eventMsk.setHours(hour, minute, 0, 0);

  // Если событие уже прошло сегодня, переносим на следующую неделю
  if (diff === 0 && eventMsk <= nowMsk) {
    eventMsk.setDate(eventMsk.getDate() + 7);
  }

  // Перевод из МСК в UTC
  return new Date(eventMsk.getTime() - 3 * 60 * 60 * 1000);
}

function getUpcomingEvents() {
  const events = [];

  for (const event of schedule) {
    for (const day of event.days) {
      const eventDateUTC = getEventDateUTC(day, event.hour, event.minute);

      events.push({
        name: event.name,
        date: eventDateUTC,
        hour: event.hour,
        minute: event.minute
      });
    }
  }

  return events.sort((a, b) => a.date - b.date);
}

function formatMskTime(hour, minute) {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')} МСК`;
}

// Чтобы не отправлять одно и то же сообщение много раз
const sentNotifications = new Set();

async function checkEvents() {
  try {
    const channel = await client.channels.fetch(CHANNEL_ID);
    if (!channel) {
      console.log('Канал не найден. Проверь CHANNEL_ID');
      return;
    }

    const now = new Date();
    const upcomingEvents = getUpcomingEvents();

    for (const event of upcomingEvents) {
      const diffMs = event.date.getTime() - now.getTime();
      const minutesLeft = Math.floor(diffMs / 60000);
      const unix = Math.floor(event.date.getTime() / 1000);

      const mskTime = formatMskTime(event.hour, event.minute);
      const localDiscordTime = `<t:${unix}:t>`;

      const key30 = `${event.name}-${unix}-30`;
      const key0 = `${event.name}-${unix}-0`;

      // Уведомление за 30 минут
      if (minutesLeft === 30 && !sentNotifications.has(key30)) {
        await channel.send(
          `@everyone Через 30 минут начнётся **${event.name}**!\n` +
          `Время: **${mskTime}** (${localDiscordTime})`
        );
        sentNotifications.add(key30);
        console.log(`Отправлено уведомление за 30 минут: ${event.name}`);
      }

      // Уведомление в момент начала
      if (minutesLeft === 0 && !sentNotifications.has(key0)) {
        await channel.send(
          `@everyone Начинается **${event.name}**!\n` +
          `Время: **${mskTime}** (${localDiscordTime})`
        );
        sentNotifications.add(key0);
        console.log(`Отправлено уведомление о начале: ${event.name}`);
      }
    }

    // Иногда очищаем память от старых ключей
    if (sentNotifications.size > 1000) {
      sentNotifications.clear();
      console.log('Список отправленных уведомлений очищен');
    }
  } catch (error) {
    console.error('Ошибка в checkEvents:', error);
  }
}

client.once('ready', () => {
  console.log(`Бот запущен как ${client.user.tag}`);
  checkEvents();
  setInterval(checkEvents, 30000);
});

client.login(TOKEN);
