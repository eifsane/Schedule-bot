const { Client, GatewayIntentBits } = require('discord.js');

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

const TOKEN = process.env.DISCORD_TOKEN;
const CHANNEL_ID = process.env.CHANNEL_ID;

// Расписание по московскому времени
const schedule = [
  // Пати
  { name: 'Пати', days: [1, 2, 3, 4], hour: 18, minute: 0 }, // ПН-ЧТ
  { name: 'Пати', days: [5, 6, 0], hour: 13, minute: 0 },    // ПТ-ВС

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

// Получить дату события в UTC, если расписание задано по МСК
function getEventDateUTC(dayOfWeek, hour, minute) {
  const nowMsk = getMoscowNow();
  const currentDay = nowMsk.getDay();

  let diff = dayOfWeek - currentDay;
  if (diff < 0) diff += 7;

  const eventMsk = new Date(nowMsk);
  eventMsk.setDate(nowMsk.getDate() + diff);
  eventMsk.setHours(hour, minute, 0, 0);

  // Если событие уже прошло сегодня — переносим на следующую неделю
  if (diff === 0 && eventMsk <= nowMsk) {
    eventMsk.setDate(eventMsk.getDate() + 7);
  }

  // Переводим из МСК в UTC
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
  return ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')} МСК;
}

// Чтобы не отправлять одинаковые сообщения несколько раз
const sentNotifications = new Set();

async function checkEvents() {
  try {
    const channel = await client.channels.fetch(CHANNEL_ID);
    if (!channel) return;

    const now = new Date();
    const upcomingEvents = getUpcomingEvents();

    for (const event of upcomingEvents) {
      const diffMs = event.date.getTime() - now.getTime();
      const minutesLeft = Math.floor(diffMs / 60000);
      const unix = Math.floor(event.date.getTime() / 1000);

      const mskTime = formatMskTime(event.hour, event.minute);
      const localDiscordTime = <t:${unix}:t>;

      const eventKey30 = ${event.name}-${unix}-30;
      const eventKey0 = ${event.name}-${unix}-0;

      // За 30 минут
      if (minutesLeft === 30 && !sentNotifications.has(eventKey30)) {
        await channel.send(
          @everyone Через 30 минут начнётся **${event.name}**!\n +
          Время: **${mskTime}** (${localDiscordTime})
        );
        sentNotifications.add(eventKey30);
      }

      // В момент начала
      if (minutesLeft === 0 && !sentNotifications.has(eventKey0)) {
        await channel.send(
          @everyone Начинается **${event.name}**!\n +
          Время: **${mskTime}** (${localDiscordTime})
        );
        sentNotifications.add(eventKey0);
      }
    }

    if (sentNotifications.size > 1000) {
      sentNotifications.clear();
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