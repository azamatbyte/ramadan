require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const { generateTimeImage, cleanupTempFile } = require('./imageGenerator');
const { PrayerTimes, Coordinates, CalculationMethod, Madhab } = require('adhan');

const USERS_FILE = path.join(__dirname, 'users.json');
const GROUPS_FILE = path.join(__dirname, 'groups.json');
const TEMP_DIR = path.join(os.tmpdir(), 'ramadan-bot');

// Tashkent timezone
const TASHKENT_TZ = 'Asia/Tashkent';

// Ramadan 2026 dates and times for Tashkent (Feb 19 - Mar 20)
const RAMADAN_TIMES = {
  1: { date: "2026-02-19", sahar: "05:54", iftar: "18:05" },
  2: { date: "2026-02-20", sahar: "05:53", iftar: "18:07" },
  3: { date: "2026-02-21", sahar: "05:51", iftar: "18:08" },
  4: { date: "2026-02-22", sahar: "05:50", iftar: "18:09" },
  5: { date: "2026-02-23", sahar: "05:49", iftar: "18:10" },
  6: { date: "2026-02-24", sahar: "05:47", iftar: "18:11" },
  7: { date: "2026-02-25", sahar: "05:46", iftar: "18:13" },
  8: { date: "2026-02-26", sahar: "05:44", iftar: "18:14" },
  9: { date: "2026-02-27", sahar: "05:43", iftar: "18:15" },
  10: { date: "2026-02-28", sahar: "05:41", iftar: "18:16" },
  11: { date: "2026-03-01", sahar: "05:40", iftar: "18:17" },
  12: { date: "2026-03-02", sahar: "05:38", iftar: "18:19" },
  13: { date: "2026-03-03", sahar: "05:37", iftar: "18:20" },
  14: { date: "2026-03-04", sahar: "05:35", iftar: "18:21" },
  15: { date: "2026-03-05", sahar: "05:34", iftar: "18:22" },
  16: { date: "2026-03-06", sahar: "05:32", iftar: "18:23" },
  17: { date: "2026-03-07", sahar: "05:31", iftar: "18:24" },
  18: { date: "2026-03-08", sahar: "05:29", iftar: "18:25" },
  19: { date: "2026-03-09", sahar: "05:27", iftar: "18:27" },
  20: { date: "2026-03-10", sahar: "05:26", iftar: "18:28" },
  21: { date: "2026-03-11", sahar: "05:24", iftar: "18:29" },
  22: { date: "2026-03-12", sahar: "05:22", iftar: "18:30" },
  23: { date: "2026-03-13", sahar: "05:21", iftar: "18:31" },
  24: { date: "2026-03-14", sahar: "05:19", iftar: "18:32" },
  25: { date: "2026-03-15", sahar: "05:17", iftar: "18:33" },
  26: { date: "2026-03-16", sahar: "05:15", iftar: "18:34" },
  27: { date: "2026-03-17", sahar: "05:14", iftar: "18:35" },
  28: { date: "2026-03-18", sahar: "05:12", iftar: "18:37" },
  29: { date: "2026-03-19", sahar: "05:10", iftar: "18:38" },
  30: { date: "2026-03-20", sahar: "05:08", iftar: "18:39" },
};

// Region adjustments (sahar_minutes, iftar_minutes) relative to Tashkent
const REGIONS = {
  toshkent: { name_uz: "Toshkent", name_ru: "Ташкент", adjust: [0, 0] },
  angren: { name_uz: "Angren", name_ru: "Ангрен", adjust: [-3, -4] },
  parkent: { name_uz: "Parkent", name_ru: "Паркент", adjust: [-2, -2] },
  andijon: { name_uz: "Andijon", name_ru: "Андижан", adjust: [-12, -13] },
  xonobod: { name_uz: "Xonobod", name_ru: "Ханабад", adjust: [-14, -15] },
  shahrixon: { name_uz: "Shahrixon", name_ru: "Шахрихан", adjust: [-10, -12] },
  xojaobod: { name_uz: "Xo'jaobod", name_ru: "Ходжаобод", adjust: [-12, -14] },
  namangan: { name_uz: "Namangan", name_ru: "Наманган", adjust: [-9, -10] },
  pop: { name_uz: "Pop", name_ru: "Пап", adjust: [-6, -7] },
  chortoq: { name_uz: "Chortoq", name_ru: "Чартак", adjust: [-10, -11] },
  kosonsoy: { name_uz: "Kosonsoy", name_ru: "Касансай", adjust: [-9, -9] },
  fargona: { name_uz: "Farg'ona", name_ru: "Фергана", adjust: [-7, -9] },
  rishton: { name_uz: "Rishton", name_ru: "Риштан", adjust: [-6, -9] },
  qoqon: { name_uz: "Qo'qon", name_ru: "Коканд", adjust: [-5, -7] },
  margilon: { name_uz: "Marg'ilon", name_ru: "Маргилан", adjust: [-9, -11] },
  bekobod: { name_uz: "Bekobod", name_ru: "Бекабад", adjust: [2, 1] },
  buxoro: { name_uz: "Buxoro", name_ru: "Бухара", adjust: [24, 22] },
  gazli: { name_uz: "Gazli", name_ru: "Газли", adjust: [25, 24] },
  gijduvon: { name_uz: "G'ijduvon", name_ru: "Гиждуван", adjust: [19, 18] },
  qorakol: { name_uz: "Qorako'l", name_ru: "Каракуль", adjust: [27, 26] },
  guliston: { name_uz: "Guliston", name_ru: "Гулистан", adjust: [3, 2] },
  sardoba: { name_uz: "Sardoba", name_ru: "Сардаба", adjust: [3, 2] },
  jizzax: { name_uz: "Jizzax", name_ru: "Джизак", adjust: [8, 7] },
  zomin: { name_uz: "Zomin", name_ru: "Заамин", adjust: [6, 4] },
  forish: { name_uz: "Forish", name_ru: "Фариш", adjust: [9, 8] },
  gallaorol: { name_uz: "G'allaorol", name_ru: "Галляарал", adjust: [10, 8] },
  navoiy: { name_uz: "Navoiy", name_ru: "Навои", adjust: [20, 21] },
  zarafshon: { name_uz: "Zarafshon", name_ru: "Зарафшан", adjust: [20, 18] },
  konimex: { name_uz: "Konimex", name_ru: "Конимех", adjust: [19, 18] },
  nurota: { name_uz: "Nurota", name_ru: "Нурата", adjust: [15, 14] },
  uchquduq: { name_uz: "Uchquduq", name_ru: "Учкудук", adjust: [10, 9] },
  nukus: { name_uz: "Nukus", name_ru: "Нукус", adjust: [38, 39] },
  moynoq: { name_uz: "Mo'ynoq", name_ru: "Муйнак", adjust: [37, 40] },
  taxtakopir: { name_uz: "Taxtako'pir", name_ru: "Тахтакупыр", adjust: [31, 33] },
  qongirot: { name_uz: "Qo'ng'irot", name_ru: "Кунград", adjust: [40, 42] },
  samarqand: { name_uz: "Samarqand", name_ru: "Самарканд", adjust: [15, 13] },
  ishtixon: { name_uz: "Ishtixon", name_ru: "Иштыхан", adjust: [13, 11] },
  mirbozor: { name_uz: "Mirbozor", name_ru: "Мирбозор", adjust: [16, 14] },
  kattaqorgon: { name_uz: "Kattaqo'rg'on", name_ru: "Каттакурган", adjust: [14, 12] },
  urgut: { name_uz: "Urgut", name_ru: "Ургут", adjust: [11, 9] },
  termiz: { name_uz: "Termiz", name_ru: "Термез", adjust: [14, 9] },
  boysun: { name_uz: "Boysun", name_ru: "Байсун", adjust: [13, 9] },
  shorchi: { name_uz: "Sho'rchi", name_ru: "Шурчи", adjust: [11, 7] },
  qarshi: { name_uz: "Qarshi", name_ru: "Карши", adjust: [18, 15] },
  dehqonobod: { name_uz: "Dehqonobod", name_ru: "Дехканабад", adjust: [15, 12] },
  koson: { name_uz: "Koson", name_ru: "Касан", adjust: [17, 15] },
  muborak: { name_uz: "Muborak", name_ru: "Мубарек", adjust: [19, 17] },
  shahrisabz: { name_uz: "Shahrisabz", name_ru: "Шахрисабз", adjust: [14, 11] },
  guzor: { name_uz: "G'uzor", name_ru: "Гузар", adjust: [17, 14] },
};

const MESSAGES = {
  uz: {
    welcome: "Assalomu alaykum! Ramadan botiga xush kelibsiz.\nTilni tanlang:",
    select_region: "Hududingizni tanlang:",
    setup_complete: "✅ Sozlamalar saqlandi!",
    sahar_reminder: "⏰ Saharlik uchun 10 daqiqa qoldi!\nSaharlik vaqti: {time}",
    iftar_reminder: "⏰ Iftorlik uchun 10 daqiqa qoldi!\nIftorlik vaqti: {time}",
    today_times: "📅 Bugungi vaqtlar ({date}):\n🌅 Saharlik: {sahar}\n🌙 Iftorlik: {iftar}",
    checktime_iftar: "🌙 Hozir ro'za vaqti. Iftorlik uchun {hours} soat {minutes} daqiqa qoldi.\nIftorlik vaqti: {time}",
    checktime_sahar: "🌅 Hozir iftorlik vaqti yoki ro'za vaqti tugadi. Keyingi saharlik uchun {hours} soat {minutes} daqiqa.\nSaharlik vaqti: {time}",
    not_ramadan: "❌ Bugun Ramazon oyida emas.",
    dua_title: "🤲 Duolar:",
    sahar_dua: "🌅 Saharlik duosi:\nНавайту ан асувма совма шахри рамазона минал фажри илал магриби, холисан лиллахи тааалаа, Аллоху акбар.",
    iftar_dua: "🌙 Iftorlik duosi:\nАллохумма лака сумту ва бика аманту ва аъалайка таваккалту ва бала ризкука афтарту, фагфирли, йа Ғоффару, ма коддамту вама аххорту.",
    namaz_ask_location: "📍 Namaz vaqtlari uchun joylashuvni yuboring.\n\nNamuna: 41.2995, 69.2401 (Toshkent)\n\nYoki shunchaki shahar nomini yozing: Toshkent, Samarqand, Andijon",
    namaz_ask_location_ru: "📍 Отправьте местоположение для времен намаза.\n\nПример: 41.2995, 69.2401 (Ташкент)\n\nИли просто напишите название города: Ташкент, Самарканд, Андижан",
    namaz_times_title: "📿 Namoz vaqtlari (bugun):",
    namaz_times_title_ru: "📿 Времена намаза (сегодня):",
    fajr: "🌅 Bomdod (Fajr)",
    dhuhr: "☀️ Peshin (Dhuhr)",
    asr: "🌤 Asr",
    maghrib: "🌇 Shom (Maghrib)",
    isha: "🌙 Xufton (Isha)",
    namaz_reminder: "🕌 Namoz vaqti!\n{prayer_name}: {time}",
    namaz_reminder_ru: "🕌 Время намаза!\n{prayer_name}: {time}"
  },
  ru: {
    welcome: "Ассаляму алейкум! Добро пожаловать в бот Рамадана.\nВыберите язык:",
    select_region: "Выберите ваш регион:",
    setup_complete: "✅ Настройки сохранены!",
    sahar_reminder: "⏰ До сухура осталось 10 минут!\nВремя сухура: {time}",
    iftar_reminder: "⏰ До ифтара осталось 10 минут!\nВремя ифтара: {time}",
    today_times: "📅 Время на сегодня ({date}):\n🌅 Сухур: {sahar}\n🌙 Ифтар: {iftar}",
    checktime_iftar: "🌙 Сейчас время поста. До ифтара осталось {hours} часов {minutes} минут.\nВремя ифтара: {time}",
    checktime_sahar: "🌅 Сейчас время ифтара или пост закончился. До следующего сухура {hours} часов {minutes} минут.\nВремя сухура: {time}",
    not_ramadan: "❌ Сегодня не Рамадан.",
    dua_title: "🤲 Дуа:",
    sahar_dua: "🌅 Дуа перед сухуром:\nНавайту ан асувма совма шахри рамазона минал фажри илал магриби, холисан лиллахи тааалаа, Аллоху акбар.",
    iftar_dua: "🌙 Дуа при ифтаре:\nАллохумма лака сумту ва бика аманту ва аъалайка таваккалту ва бала ризкука афтарту, фагфирли, йа Ғоффару, ма коддамту вама аххорту.",
    namaz_ask_location: "📍 Namaz vaqtlari uchun joylashuvni yuboring.\n\nNamuna: 41.2995, 69.2401 (Toshkent)\n\nYoki shunchaki shahar nomini yozing: Toshkent, Samarqand, Andijon",
    namaz_ask_location_ru: "📍 Отправьте местоположение для времен намаза.\n\nПример: 41.2995, 69.2401 (Ташкент)\n\nИли просто напишите название города: Ташкент, Самарканд, Андижан",
    namaz_times_title: "📿 Namoz vaqtlari (bugun):",
    namaz_times_title_ru: "📿 Времена намаза (сегодня):",
    fajr: "🌅 Фаджр (Fajr)",
    dhuhr: "☀️ Зухр (Dhuhr)",
    asr: "🌤 Аср (Asr)",
    maghrib: "🌇 Магриб (Maghrib)",
    isha: "🌙 Иша (Isha)",
    namaz_reminder: "🕌 Namoz vaqti!\n{prayer_name}: {time}",
    namaz_reminder_ru: "🕌 Время намаза!\n{prayer_name}: {time}"
  }
};

const NAMAZ_MESSAGES = {
  uz: {
    namaz_times_title: "📿 Namoz vaqtlari (bugun):",
    fajr: "🌅 Bomdod (Fajr)",
    dhuhr: "☀️ Peshin (Dhuhr)",
    asr: "🌤 Asr",
    maghrib: "🌇 Shom (Maghrib)",
    isha: "🌙 Xufton (Isha)",
    namaz_reminder: "🕌 Namoz vaqti!\n{prayer_name}: {time}"
  },
  ru: {
    namaz_times_title: "📿 Времена намаза (сегодня):",
    fajr: "🌅 Фаджр (Fajr)",
    dhuhr: "☀️ Зухр (Dhuhr)",
    asr: "🌤 Аср (Asr)",
    maghrib: "🌇 Магриб (Maghrib)",
    isha: "🌙 Иша (Isha)",
    namaz_reminder: "🕌 Время намаза!\n{prayer_name}: {time}"
  }
};

let users = {};
let groups = {};

// Load users from file
async function loadUsers() {
  try {
    const data = await fs.readFile(USERS_FILE, 'utf8');
    users = JSON.parse(data);
  } catch (error) {
    users = {};
  }
}

// Save users to file
async function saveUsers() {
  await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
}

// Load groups from file
async function loadGroups() {
  try {
    const data = await fs.readFile(GROUPS_FILE, 'utf8');
    groups = JSON.parse(data);
  } catch (error) {
    groups = {};
  }
}

// Save groups to file
async function saveGroups() {
  await fs.writeFile(GROUPS_FILE, JSON.stringify(groups, null, 2), 'utf8');
}

// Get current date in Tashkent timezone
function getTashkentDate() {
  return new Date().toLocaleDateString('en-CA', { timeZone: TASHKENT_TZ });
}

// Get current time in Tashkent timezone
function getTashkentTime() {
  return new Date().toLocaleTimeString('en-GB', { timeZone: TASHKENT_TZ, hour12: false });
}

// Get Ramadan day number from date string
function getRamadanDay(dateStr) {
  for (const [day, info] of Object.entries(RAMADAN_TIMES)) {
    if (info.date === dateStr) {
      return parseInt(day);
    }
  }
  return null;
}

// Adjust time by given minutes
function adjustTime(timeStr, minutes) {
  const [hour, minute] = timeStr.split(':').map(Number);
  const totalMinutes = hour * 60 + minute + minutes;
  const newHour = Math.floor(totalMinutes / 60);
  const newMinute = totalMinutes % 60;
  return `${String(newHour).padStart(2, '0')}:${String(newMinute).padStart(2, '0')}`;
}

// Check if chat is a group
function isGroupChat(chatId) {
  return chatId.toString().startsWith('-');
}

// Get settings for chat (user or group)
async function getChatSettings(chatId, userId) {
  const chatIdStr = chatId.toString();
  
  if (isGroupChat(chatId)) {
    // Group chat - use group settings
    if (!groups[chatIdStr]) {
      groups[chatIdStr] = {
        region: 'toshkent',
        lang: 'uz',
        chat_id: chatId
      };
      await saveGroups();
    }
    return { ...groups[chatIdStr], isGroup: true };
  } else {
    // Private chat - use user settings
    if (!users[userId]) {
      users[userId] = {};
    }
    return { ...users[userId], isGroup: false };
  }
}

// Save settings for chat
async function saveChatSettings(chatId, settings) {
  const chatIdStr = chatId.toString();
  
  if (isGroupChat(chatId)) {
    groups[chatIdStr] = settings;
    await saveGroups();
  } else {
    users[chatIdStr] = settings;
    await saveUsers();
  }
}

// Calculate namaz (prayer) times for given coordinates
function calculateNamazTimes(latitude, longitude, date = new Date()) {
  try {
    const coordinates = new Coordinates(latitude, longitude);
    
    // Use Muslim World League method which is more accurate for Uzbekistan
    const params = CalculationMethod.MuslimWorldLeague();
    params.madhab = Madhab.Hanafi;
    
    // Adjust Fajr angle to 18 degrees for more accurate morning prayer time
    params.fajrAngle = 18;
    
    const prayerTimes = new PrayerTimes(coordinates, date, params);
    
    // Format times in Tashkent timezone (UTC+5)
    const formatTime = (date) => {
      return date.toLocaleTimeString('en-GB', { 
        hour12: false, 
        hour: '2-digit', 
        minute: '2-digit',
        timeZone: 'Asia/Tashkent'
      });
    };
    
    return {
      fajr: formatTime(prayerTimes.fajr),
      dhuhr: formatTime(prayerTimes.dhuhr),
      asr: formatTime(prayerTimes.asr),
      maghrib: formatTime(prayerTimes.maghrib),
      isha: formatTime(prayerTimes.isha)
    };
  } catch (error) {
    console.error('Error calculating namaz times:', error.message);
    return null;
  }
}

// Parse location input (coordinates or city name)
function parseLocation(input) {
  // Check if it's coordinates (e.g., "41.2995, 69.2401" or "41.2995 69.2401")
  const coordPattern = /^(-?\d+\.?\d*)[,\s]+(-?\d+\.?\d*)$/;
  const match = input.match(coordPattern);
  
  if (match) {
    return {
      latitude: parseFloat(match[1]),
      longitude: parseFloat(match[2]),
      name: null
    };
  }
  
  // If not coordinates, treat as city name
  return {
    latitude: null,
    longitude: null,
    name: input.trim()
  };
}

// Get coordinates for major Uzbekistan cities
function getCityCoordinates(cityName) {
  const cities = {
    'toshkent': { lat: 41.2995, lon: 69.2401, name: 'Toshkent' },
    'tashkent': { lat: 41.2995, lon: 69.2401, name: 'Toshkent' },
    'samarkand': { lat: 39.6542, lon: 66.9597, name: 'Samarqand' },
    'samarqand': { lat: 39.6542, lon: 66.9597, name: 'Samarqand' },
    'bukhara': { lat: 39.7681, lon: 64.4556, name: 'Buxoro' },
    'buxoro': { lat: 39.7681, lon: 64.4556, name: 'Buxoro' },
    'andijan': { lat: 40.7821, lon: 72.3442, name: 'Andijon' },
    'andijon': { lat: 40.7821, lon: 72.3442, name: 'Andijon' },
    'namangan': { lat: 40.9983, lon: 71.6726, name: 'Namangan' },
    'fergana': { lat: 40.3842, lon: 71.7843, name: "Farg'ona" },
    'fargona': { lat: 40.3842, lon: 71.7843, name: "Farg'ona" },
    'nukus': { lat: 42.4602, lon: 59.6060, name: 'Nukus' },
    'khiva': { lat: 41.3843, lon: 60.3633, name: 'Xiva' },
    'xiva': { lat: 41.3843, lon: 60.3633, name: 'Xiva' },
    'termiz': { lat: 37.2242, lon: 67.2783, name: 'Termiz' },
    'karshi': { lat: 38.8606, lon: 65.7849, name: 'Qarshi' },
    'qarshi': { lat: 38.8606, lon: 65.7849, name: 'Qarshi' },
    'jizzakh': { lat: 40.1156, lon: 67.8422, name: 'Jizzax' },
    'jizzax': { lat: 40.1156, lon: 67.8422, name: 'Jizzax' },
    'navoi': { lat: 40.1031, lon: 65.3683, name: 'Navoiy' },
    'navoiy': { lat: 40.1031, lon: 65.3683, name: 'Navoiy' },
    'gulistan': { lat: 40.4897, lon: 68.7842, name: 'Guliston' },
    'urganch': { lat: 41.5500, lon: 60.6333, name: 'Urganch' }
  };
  
  const normalizedCity = cityName.toLowerCase().trim();
  return cities[normalizedCity] || null;
}

// Format namaz times message
function formatNamazTimes(times, lang = 'uz') {
  const prayers = {
    uz: {
      fajr: MESSAGES.uz.fajr,
      dhuhr: MESSAGES.uz.dhuhr,
      asr: MESSAGES.uz.asr,
      maghrib: MESSAGES.uz.maghrib,
      isha: MESSAGES.uz.isha
    },
    ru: {
      fajr: MESSAGES.ru.fajr,
      dhuhr: MESSAGES.ru.dhuhr,
      asr: MESSAGES.ru.asr,
      maghrib: MESSAGES.ru.maghrib,
      isha: MESSAGES.ru.isha
    }
  };
  
  const p = prayers[lang] || prayers.uz;
  const title = lang === 'ru' ? MESSAGES.ru.namaz_times_title : MESSAGES.uz.namaz_times_title;
  
  return `${title}\n\n` +
         `${p.fajr}: ${times.fajr}\n` +
         `${p.dhuhr}: ${times.dhuhr}\n` +
         `${p.asr}: ${times.asr}\n` +
         `${p.maghrib}: ${times.maghrib}\n` +
         `${p.isha}: ${times.isha}`;
}

// Get sahar and iftar times for a specific region
function getTimesForRegion(regionKey, ramadanDay) {
  const baseTimes = RAMADAN_TIMES[ramadanDay];
  const region = REGIONS[regionKey];
  const [saharAdj, iftarAdj] = region.adjust;
  
  const saharTime = adjustTime(baseTimes.sahar, saharAdj);
  const iftarTime = adjustTime(baseTimes.iftar, iftarAdj);
  
  return { sahar: saharTime, iftar: iftarTime };
}

// Calculate minutes between two times
function getMinutesBetween(time1, time2) {
  const [h1, m1] = time1.split(':').map(Number);
  const [h2, m2] = time2.split(':').map(Number);
  return (h2 * 60 + m2) - (h1 * 60 + m1);
}

// Format time remaining
function formatTimeRemaining(minutes) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return { hours, minutes: mins };
}

// Initialize bot
const token = process.env.BOT_TOKEN;
if (!token) {
  console.error('Please set BOT_TOKEN in .env file');
  process.exit(1);
}

const bot = new TelegramBot(token, { 
  polling: {
    interval: 300,
    autoStart: true,
    params: {
      timeout: 10
    }
  }
});

// Error handling for polling errors
bot.on('polling_error', (error) => {
  console.error('Polling error:', error.code || error.message);
});

// Error handling for general errors
bot.on('error', (error) => {
  console.error('Bot error:', error.message);
});

// Start command
bot.onText(/\/start/, async (msg) => {
  try {
    const chatId = msg.chat.id;
    
    const keyboard = {
      inline_keyboard: [
        [{ text: "🇺🇿 O'zbek", callback_data: 'lang_uz' }],
        [{ text: "🇷🇺 Кириллица", callback_data: 'lang_ru' }],
      ]
    };
    
    await bot.sendMessage(
      chatId,
      "Assalomu alaykum! / Ассаляму алейкум!\nTilni tanlang / Выберите язык:",
      { reply_markup: keyboard }
    );
  } catch (error) {
    console.error('Error in start command:', error.message);
  }
});

// Handle callback queries
bot.on('callback_query', async (query) => {
  try {
    const chatId = query.message.chat.id;
    const userId = query.from.id.toString();
    const data = query.data;
    
    // Answer callback query immediately with error handling
    try {
      await bot.answerCallbackQuery(query.id);
    } catch (err) {
      console.log('Callback query expired or invalid, continuing...');
    }
    
    if (data.startsWith('lang_')) {
      const lang = data.split('_')[1];
      
      if (isGroupChat(chatId)) {
        // In groups, set language for the group
        if (!groups[chatId]) {
          groups[chatId] = {};
        }
        groups[chatId].lang = lang;
        groups[chatId].chat_id = chatId;
        await saveGroups();
        
        // Show region selection for group
        await showRegions(chatId, lang, query.message.message_id);
      } else {
        // Private chat - user settings
        if (!users[userId]) {
          users[userId] = {};
        }
        users[userId].lang = lang;
        users[userId].chat_id = chatId;
        await saveUsers();
        
        // Show region selection
        await showRegions(chatId, lang, query.message.message_id);
      }
    } else if (data.startsWith('region_')) {
      const region = data.split('_')[1];
      
      if (isGroupChat(chatId)) {
        // In groups, set region for the group
        if (!groups[chatId]) {
          groups[chatId] = {};
        }
        groups[chatId].region = region;
        groups[chatId].chat_id = chatId;
        await saveGroups();
        
        const lang = groups[chatId].lang || 'uz';
        const message = MESSAGES[lang].setup_complete;
        
        await bot.editMessageText(message, {
          chat_id: chatId,
          message_id: query.message.message_id
        });
        
        // Show today's times for group
        await showTodayTimes(chatId, userId);
      } else {
        // Private chat - user settings
        users[userId].region = region;
        await saveUsers();
        
        const lang = users[userId].lang || 'uz';
        const message = MESSAGES[lang].setup_complete;
        
        await bot.editMessageText(message, {
          chat_id: chatId,
          message_id: query.message.message_id
        });
        
        // Show today's times
        await showTodayTimes(chatId, userId);
      }
    }
  } catch (error) {
    console.error('Error in callback query handler:', error.message);
  }
});

// Show region selection
async function showRegions(chatId, lang, messageId) {
  try {
    const keyboard = { inline_keyboard: [] };
    let row = [];
    
    Object.entries(REGIONS).forEach(([key, region]) => {
      const name = lang === 'ru' ? region.name_ru : region.name_uz;
      row.push({ text: name, callback_data: `region_${key}` });
      
      if (row.length === 2) {
        keyboard.inline_keyboard.push(row);
        row = [];
      }
    });
    
    if (row.length > 0) {
      keyboard.inline_keyboard.push(row);
    }
    
    const message = MESSAGES[lang].select_region;
    
    await bot.editMessageText(message, {
      chat_id: chatId,
      message_id: messageId,
      reply_markup: keyboard
    });
  } catch (error) {
    console.error('Error showing regions:', error.message);
  }
}

// Show today's times
async function showTodayTimes(chatId, userId) {
  try {
    const settings = await getChatSettings(chatId, userId);
    const lang = settings.lang || 'uz';
    const region = settings.region || 'toshkent';
    
    const today = getTashkentDate();
    const ramadanDay = getRamadanDay(today);
    
    if (ramadanDay) {
      const times = getTimesForRegion(region, ramadanDay);
      const dateDisplay = RAMADAN_TIMES[ramadanDay].date;
      
      // Generate temp file paths
      const saharImagePath = path.join(TEMP_DIR, `sahar_${chatId}_${today}.png`);
      const iftarImagePath = path.join(TEMP_DIR, `iftar_${chatId}_${today}.png`);
      
      // Ensure temp directory exists
      await fs.mkdir(TEMP_DIR, { recursive: true });
      
      // Generate images with times
      await generateTimeImage('sahar', times.sahar, saharImagePath);
      await generateTimeImage('iftar', times.iftar, iftarImagePath);
      
      // Send message with date
      const message = MESSAGES[lang].today_times
        .replace('{date}', dateDisplay)
        .replace('{sahar}', times.sahar)
        .replace('{iftar}', times.iftar);
      await bot.sendMessage(chatId, message);
      
      // Send sahar image
      await bot.sendPhoto(chatId, saharImagePath, {
        caption: lang === 'uz' ? '🌅 Saharlik vaqti' : '🌅 Время сухура'
      });
      
      // Send iftar image
      await bot.sendPhoto(chatId, iftarImagePath, {
        caption: lang === 'uz' ? '🌙 Iftorlik vaqti' : '🌙 Время ифтара'
      });
      
      // Clean up temp files immediately
      await cleanupTempFile(saharImagePath);
      await cleanupTempFile(iftarImagePath);
    }
  } catch (error) {
    console.error('Error showing today times:', error.message);
  }
}

// Today command
bot.onText(/\/today/, async (msg) => {
  try {
    const userId = msg.from.id.toString();
    await showTodayTimes(msg.chat.id, userId);
  } catch (error) {
    console.error('Error in today command:', error.message);
  }
});

// Region command
bot.onText(/\/region/, async (msg) => {
  try {
    const chatId = msg.chat.id;
    const userId = msg.from.id.toString();
    
    // Get settings (works for both groups and private chats)
    const settings = await getChatSettings(chatId, userId);
    
    // For private chats, still require /start first
    if (!settings.isGroup && !settings.lang) {
      await bot.sendMessage(
        chatId,
        "Iltimos, avval /start ni bosing / Пожалуйста, сначала нажмите /start"
      );
      return;
    }
    
    const lang = settings.lang || 'uz';
    
    const keyboard = { inline_keyboard: [] };
    let row = [];
    
    Object.entries(REGIONS).forEach(([key, region]) => {
      const name = lang === 'ru' ? region.name_ru : region.name_uz;
      row.push({ text: name, callback_data: `region_${key}` });
      
      if (row.length === 2) {
        keyboard.inline_keyboard.push(row);
        row = [];
      }
    });
    
    if (row.length > 0) {
      keyboard.inline_keyboard.push(row);
    }
    
    const message = MESSAGES[lang].select_region;
    await bot.sendMessage(msg.chat.id, message, { reply_markup: keyboard });
  } catch (error) {
    console.error('Error in region command:', error.message);
  }
});

// Checktime command
bot.onText(/\/checktime/, async (msg) => {
  try {
    const chatId = msg.chat.id;
    const userId = msg.from.id.toString();
    
    // Get settings (works for both groups and private chats)
    const settings = await getChatSettings(chatId, userId);
    
    // For private chats, still require region to be set
    if (!settings.isGroup && !settings.region) {
      await bot.sendMessage(
        chatId,
        "Iltimos, avval /start ni bosing / Пожалуйста, сначала нажмите /start"
      );
      return;
    }
    
    const lang = settings.lang || 'uz';
    const region = settings.region || 'toshkent';
    
    const today = getTashkentDate();
    const ramadanDay = getRamadanDay(today);
    
    if (!ramadanDay) {
      await bot.sendMessage(msg.chat.id, MESSAGES[lang].not_ramadan);
      return;
    }
    
    const times = getTimesForRegion(region, ramadanDay);
    const currentTime = getTashkentTime().substring(0, 5); // HH:MM format
    
    const currentMinutes = parseInt(currentTime.split(':')[0]) * 60 + parseInt(currentTime.split(':')[1]);
    const saharMinutes = parseInt(times.sahar.split(':')[0]) * 60 + parseInt(times.sahar.split(':')[1]);
    const iftarMinutes = parseInt(times.iftar.split(':')[0]) * 60 + parseInt(times.iftar.split(':')[1]);
    
    // Check if between sahar and iftar (fasting time)
    if (currentMinutes >= saharMinutes && currentMinutes < iftarMinutes) {
      // Currently fasting, show time until iftar
      const remainingMinutes = iftarMinutes - currentMinutes;
      const { hours, minutes } = formatTimeRemaining(remainingMinutes);
      
      const message = MESSAGES[lang].checktime_iftar
        .replace('{hours}', hours)
        .replace('{minutes}', minutes)
        .replace('{time}', times.iftar);
      
      await bot.sendMessage(chatId, message);
      
      // Generate and send iftar image
      const iftarImagePath = path.join(TEMP_DIR, `iftar_checktime_${chatId}_${today}.png`);
      await fs.mkdir(TEMP_DIR, { recursive: true });
      await generateTimeImage('iftar', times.iftar, iftarImagePath);
      
      await bot.sendPhoto(chatId, iftarImagePath, {
        caption: lang === 'uz' ? '🌙 Iftorlik vaqti' : '🌙 Время ифтара'
      });
      
      await cleanupTempFile(iftarImagePath);
    } else {
      // Not fasting time, show time until next sahar
      let remainingMinutes;
      let saharTimeToShow = times.sahar;
      
      if (currentMinutes >= iftarMinutes) {
        // After iftar, calculate until tomorrow's sahar
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowDate = tomorrow.toISOString().split('T')[0];
        const tomorrowDay = getRamadanDay(tomorrowDate);
        
        if (tomorrowDay) {
          const tomorrowTimes = getTimesForRegion(region, tomorrowDay);
          const tomorrowSaharMinutes = parseInt(tomorrowTimes.sahar.split(':')[0]) * 60 + parseInt(tomorrowTimes.sahar.split(':')[1]);
          remainingMinutes = (24 * 60 - currentMinutes) + tomorrowSaharMinutes;
          saharTimeToShow = tomorrowTimes.sahar;
        } else {
          remainingMinutes = 0;
        }
      } else {
        // Before sahar
        remainingMinutes = saharMinutes - currentMinutes;
      }
      
      const { hours, minutes } = formatTimeRemaining(remainingMinutes);
      
      const message = MESSAGES[lang].checktime_sahar
        .replace('{hours}', hours)
        .replace('{minutes}', minutes)
        .replace('{time}', saharTimeToShow);
      
      await bot.sendMessage(chatId, message);
      
      // Generate and send sahar image
      const saharImagePath = path.join(TEMP_DIR, `sahar_checktime_${chatId}_${today}.png`);
      await fs.mkdir(TEMP_DIR, { recursive: true });
      await generateTimeImage('sahar', saharTimeToShow, saharImagePath);
      
      await bot.sendPhoto(chatId, saharImagePath, {
        caption: lang === 'uz' ? '🌅 Saharlik vaqti' : '🌅 Время сухура'
      });
      
      await cleanupTempFile(saharImagePath);
    }
  } catch (error) {
    console.error('Error in checktime command:', error.message);
  }
});

// Dua command
bot.onText(/\/dua/, async (msg) => {
  try {
    const chatId = msg.chat.id;
    const userId = msg.from.id.toString();
    
    // Get settings (works for both groups and private chats)
    const settings = await getChatSettings(chatId, userId);
    
    // For private chats, still require setup first
    if (!settings.isGroup && !settings.lang) {
      await bot.sendMessage(
        chatId,
        "Iltimos, avval /start ni bosing / Пожалуйста, сначала нажмите /start"
      );
      return;
    }
    
    const lang = settings.lang || 'uz';
    
    const message = `${MESSAGES[lang].dua_title}\n\n${MESSAGES[lang].sahar_dua}\n\n${MESSAGES[lang].iftar_dua}`;
    
    await bot.sendMessage(chatId, message);
  } catch (error) {
    console.error('Error in dua command:', error.message);
  }
});

// Namaz command - setup location
bot.onText(/\/namaz/, async (msg) => {
  try {
    const chatId = msg.chat.id;
    const userId = msg.from.id.toString();
    
    const settings = await getChatSettings(chatId, userId);
    const lang = settings.lang || 'uz';
    
    // Store that we're waiting for location input
    if (isGroupChat(chatId)) {
      if (!groups[chatId]) groups[chatId] = {};
      groups[chatId].waiting_for_namaz_location = true;
      await saveGroups();
    } else {
      if (!users[userId]) users[userId] = {};
      users[userId].waiting_for_namaz_location = true;
      await saveUsers();
    }
    
    const message = lang === 'uz' ? MESSAGES.uz.namaz_ask_location : MESSAGES.uz.namaz_ask_location_ru;
    await bot.sendMessage(chatId, message);
  } catch (error) {
    console.error('Error in namaz command:', error.message);
  }
});

// Handle location messages (Telegram native location)
bot.on('location', async (msg) => {
  try {
    const chatId = msg.chat.id;
    const userId = msg.from.id.toString();
    
    // Check if we're waiting for location input
    let waitingForLocation = false;
    if (isGroupChat(chatId)) {
      waitingForLocation = groups[chatId]?.waiting_for_namaz_location;
    } else {
      waitingForLocation = users[userId]?.waiting_for_namaz_location;
    }
    
    if (!waitingForLocation) return;
    
    const settings = await getChatSettings(chatId, userId);
    const lang = settings.lang || 'uz';
    
    // Get coordinates from Telegram location
    const latitude = msg.location.latitude;
    const longitude = msg.location.longitude;
    
    // Save coordinates
    if (isGroupChat(chatId)) {
      groups[chatId].namaz_lat = latitude;
      groups[chatId].namaz_lon = longitude;
      groups[chatId].namaz_location_name = 'Current Location';
      groups[chatId].waiting_for_namaz_location = false;
      await saveGroups();
    } else {
      users[userId].namaz_lat = latitude;
      users[userId].namaz_lon = longitude;
      users[userId].namaz_location_name = 'Current Location';
      users[userId].waiting_for_namaz_location = false;
      await saveUsers();
    }
    
    // Confirm and show today's times
    const confirmMsg = lang === 'uz'
      ? `✅ Joylashuv saqlandi: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}\n\nBugungi namoz vaqtlari:`
      : `✅ Местоположение сохранено: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}\n\nВремена намаза на сегодня:`;
    
    await bot.sendMessage(chatId, confirmMsg);
    
    // Show today's namaz times
    const times = calculateNamazTimes(latitude, longitude);
    if (times) {
      const timesMessage = formatNamazTimes(times, lang);
      await bot.sendMessage(chatId, timesMessage);
    }
  } catch (error) {
    console.error('Error handling location:', error.message);
  }
});

// Handle namaz location input (text)
bot.on('message', async (msg) => {
  try {
    const chatId = msg.chat.id;
    const userId = msg.from.id.toString();
    
    // Check if we're waiting for location input
    let waitingForLocation = false;
    if (isGroupChat(chatId)) {
      waitingForLocation = groups[chatId]?.waiting_for_namaz_location;
    } else {
      waitingForLocation = users[userId]?.waiting_for_namaz_location;
    }
    
    if (!waitingForLocation || !msg.text || msg.text.startsWith('/')) return;
    
    const settings = await getChatSettings(chatId, userId);
    const lang = settings.lang || 'uz';
    
    // Parse location input
    const location = parseLocation(msg.text);
    let coordinates;
    
    if (location.latitude && location.longitude) {
      // Direct coordinates provided
      coordinates = { lat: location.latitude, lon: location.longitude, name: 'Custom Location' };
    } else {
      // Try to find city
      coordinates = getCityCoordinates(location.name);
    }
    
    if (!coordinates) {
      await bot.sendMessage(chatId, 
        lang === 'uz' 
          ? '❌ Joylashuv topilmadi. Iltimos, koordinatalar yoki shahar nomini qayta yuboring.'
          : '❌ Местоположение не найдено. Пожалуйста, отправьте координаты или название города еще раз.'
      );
      return;
    }
    
    // Save coordinates
    if (isGroupChat(chatId)) {
      groups[chatId].namaz_lat = coordinates.lat;
      groups[chatId].namaz_lon = coordinates.lon;
      groups[chatId].namaz_location_name = coordinates.name;
      groups[chatId].waiting_for_namaz_location = false;
      await saveGroups();
    } else {
      users[userId].namaz_lat = coordinates.lat;
      users[userId].namaz_lon = coordinates.lon;
      users[userId].namaz_location_name = coordinates.name;
      users[userId].waiting_for_namaz_location = false;
      await saveUsers();
    }
    
    // Confirm and show today's times
    const confirmMsg = lang === 'uz'
      ? `✅ Joylashuv saqlandi: ${coordinates.name}\n\nBugungi namoz vaqtlari:`
      : `✅ Местоположение сохранено: ${coordinates.name}\n\nВремена намаза на сегодня:`;
    
    await bot.sendMessage(chatId, confirmMsg);
    
    // Show today's namaz times
    const times = calculateNamazTimes(coordinates.lat, coordinates.lon);
    if (times) {
      const timesMessage = formatNamazTimes(times, lang);
      await bot.sendMessage(chatId, timesMessage);
    }
  } catch (error) {
    console.error('Error handling namaz location:', error.message);
  }
});

// Namaz times command - show today's prayer times
bot.onText(/\/namaz_times/, async (msg) => {
  try {
    const chatId = msg.chat.id;
    const userId = msg.from.id.toString();
    
    const settings = await getChatSettings(chatId, userId);
    const lang = settings.lang || 'uz';
    
    // Get coordinates
    let lat, lon;
    if (isGroupChat(chatId)) {
      lat = groups[chatId]?.namaz_lat;
      lon = groups[chatId]?.namaz_lon;
    } else {
      lat = users[userId]?.namaz_lat;
      lon = users[userId]?.namaz_lon;
    }
    
    // If no coordinates set, use default (Toshkent)
    if (!lat || !lon) {
      lat = 41.2995;
      lon = 69.2401;
      await bot.sendMessage(chatId, 
        lang === 'uz'
          ? '⚠️ Joylashuv o\'rnatilmagan. Standart joylashuv (Toshkent) ishlatilmoqda.\n/namaz buyrug\'i orqali joylashuvni o\'rnating.'
          : '⚠️ Местоположение не установлено. Используется стандартное местоположение (Ташкент).\nУстановите местоположение с помощью команды /namaz.'
      );
    }
    
    // Calculate and send times
    const times = calculateNamazTimes(lat, lon);
    if (times) {
      const timesMessage = formatNamazTimes(times, lang);
      await bot.sendMessage(chatId, timesMessage);
    } else {
      await bot.sendMessage(chatId, 
        lang === 'uz' ? '❌ Namoz vaqtlarini hisoblashda xatolik yuz berdi.' : '❌ Ошибка при расчете времен намаза.'
      );
    }
  } catch (error) {
    console.error('Error in namaz_times command:', error.message);
  }
});

// Check and send reminders
async function checkAndSendReminders() {
  try {
    const today = getTashkentDate();
    const currentTime = getTashkentTime().substring(0, 5);
    
    const ramadanDay = getRamadanDay(today);
    if (!ramadanDay) return;
    
    // Process individual users
    for (const [userId, user] of Object.entries(users)) {
      if (!user.region) continue;
      
      const lang = user.lang || 'uz';
      const times = getTimesForRegion(user.region, ramadanDay);
      
      // Calculate reminder times (10 minutes before)
      const [saharHour, saharMin] = times.sahar.split(':').map(Number);
      const [iftarHour, iftarMin] = times.iftar.split(':').map(Number);
      
      let saharReminderHour = saharHour;
      let saharReminderMin = saharMin - 10;
      if (saharReminderMin < 0) {
        saharReminderMin += 60;
        saharReminderHour -= 1;
      }
      const saharReminder = `${String(saharReminderHour).padStart(2, '0')}:${String(saharReminderMin).padStart(2, '0')}`;
      
      let iftarReminderHour = iftarHour;
      let iftarReminderMin = iftarMin - 10;
      if (iftarReminderMin < 0) {
        iftarReminderMin += 60;
        iftarReminderHour -= 1;
      }
      const iftarReminder = `${String(iftarReminderHour).padStart(2, '0')}:${String(iftarReminderMin).padStart(2, '0')}`;
      
      // Check if it's time to send reminder
      if (currentTime === saharReminder && user.last_sahar !== today) {
        const saharImagePath = path.join(TEMP_DIR, `sahar_reminder_${userId}_${today}.png`);
        await fs.mkdir(TEMP_DIR, { recursive: true });
        await generateTimeImage('sahar', times.sahar, saharImagePath);
        
        const caption = MESSAGES[lang].sahar_reminder.replace('{time}', times.sahar);
        await bot.sendPhoto(user.chat_id, saharImagePath, { caption });
        
        await cleanupTempFile(saharImagePath);
        users[userId].last_sahar = today;
        await saveUsers();
      }
      
      if (currentTime === iftarReminder && user.last_iftar !== today) {
        const iftarImagePath = path.join(TEMP_DIR, `iftar_reminder_${userId}_${today}.png`);
        await fs.mkdir(TEMP_DIR, { recursive: true });
        await generateTimeImage('iftar', times.iftar, iftarImagePath);
        
        const caption = MESSAGES[lang].iftar_reminder.replace('{time}', times.iftar);
        await bot.sendPhoto(user.chat_id, iftarImagePath, { caption });
        
        await cleanupTempFile(iftarImagePath);
        users[userId].last_iftar = today;
        await saveUsers();
      }
    }
    
    // Process groups
    for (const [groupId, group] of Object.entries(groups)) {
      if (!group.region) continue;
      
      const lang = group.lang || 'uz';
      const times = getTimesForRegion(group.region, ramadanDay);
      
      // Calculate reminder times (10 minutes before)
      const [saharHour, saharMin] = times.sahar.split(':').map(Number);
      const [iftarHour, iftarMin] = times.iftar.split(':').map(Number);
      
      let saharReminderHour = saharHour;
      let saharReminderMin = saharMin - 10;
      if (saharReminderMin < 0) {
        saharReminderMin += 60;
        saharReminderHour -= 1;
      }
      const saharReminder = `${String(saharReminderHour).padStart(2, '0')}:${String(saharReminderMin).padStart(2, '0')}`;
      
      let iftarReminderHour = iftarHour;
      let iftarReminderMin = iftarMin - 10;
      if (iftarReminderMin < 0) {
        iftarReminderMin += 60;
        iftarReminderHour -= 1;
      }
      const iftarReminder = `${String(iftarReminderHour).padStart(2, '0')}:${String(iftarReminderMin).padStart(2, '0')}`;
      
      // Check if it's time to send reminder
      if (currentTime === saharReminder && group.last_sahar !== today) {
        const saharImagePath = path.join(TEMP_DIR, `sahar_reminder_${groupId}_${today}.png`);
        await fs.mkdir(TEMP_DIR, { recursive: true });
        await generateTimeImage('sahar', times.sahar, saharImagePath);
        
        const caption = MESSAGES[lang].sahar_reminder.replace('{time}', times.sahar);
        await bot.sendPhoto(group.chat_id, saharImagePath, { caption });
        
        await cleanupTempFile(saharImagePath);
        groups[groupId].last_sahar = today;
        await saveGroups();
      }
      
      if (currentTime === iftarReminder && group.last_iftar !== today) {
        const iftarImagePath = path.join(TEMP_DIR, `iftar_reminder_${groupId}_${today}.png`);
        await fs.mkdir(TEMP_DIR, { recursive: true });
        await generateTimeImage('iftar', times.iftar, iftarImagePath);
        
        const caption = MESSAGES[lang].iftar_reminder.replace('{time}', times.iftar);
        await bot.sendPhoto(group.chat_id, iftarImagePath, { caption });
        
        await cleanupTempFile(iftarImagePath);
        groups[groupId].last_iftar = today;
        await saveGroups();
      }
      
      // Check namaz reminders for groups
      await checkNamazReminders(group, groupId, today, currentTime, true);
    }
    
    // Process namaz reminders for users
    for (const [userId, user] of Object.entries(users)) {
      await checkNamazReminders(user, userId, today, currentTime, false);
    }
  } catch (error) {
    console.error('Error in reminder check:', error.message);
  }
}

// Check and send namaz reminders
async function checkNamazReminders(entity, entityId, today, currentTime, isGroup) {
  try {
    // Check if namaz coordinates are set
    if (!entity.namaz_lat || !entity.namaz_lon) return;
    
    const lang = entity.lang || 'uz';
    const times = calculateNamazTimes(entity.namaz_lat, entity.namaz_lon);
    if (!times) return;
    
    const chatId = isGroup ? entity.chat_id : entityId;
    
    // Define prayers to check
    const prayers = [
      { name: 'fajr', time: times.fajr, label: lang === 'uz' ? MESSAGES.uz.fajr : '🌅 Фаджр' },
      { name: 'dhuhr', time: times.dhuhr, label: lang === 'uz' ? MESSAGES.uz.dhuhr : '☀️ Зухр' },
      { name: 'asr', time: times.asr, label: lang === 'uz' ? MESSAGES.uz.asr : '🌤 Аср' },
      { name: 'maghrib', time: times.maghrib, label: lang === 'uz' ? MESSAGES.uz.maghrib : '🌇 Магриб' },
      { name: 'isha', time: times.isha, label: lang === 'uz' ? MESSAGES.uz.isha : '🌙 Иша' }
    ];
    
    // Check each prayer time
    for (const prayer of prayers) {
      const lastPrayerKey = `last_namaz_${prayer.name}`;
      
      if (currentTime === prayer.time && entity[lastPrayerKey] !== today) {
        const message = (lang === 'uz' ? MESSAGES.uz.namaz_reminder : MESSAGES.uz.namaz_reminder_ru)
          .replace('{prayer_name}', prayer.label)
          .replace('{time}', prayer.time);
        
        await bot.sendMessage(chatId, message);
        
        // Update last sent
        entity[lastPrayerKey] = today;
        if (isGroup) {
          await saveGroups();
        } else {
          await saveUsers();
        }
      }
    }
  } catch (error) {
    console.error('Error in namaz reminder check:', error.message);
  }
}

// Start the bot
async function main() {
  try {
    await loadUsers();
    await loadGroups();
    console.log('Bot started!');
    console.log('Press Ctrl+C to stop');
    
    // Check reminders every minute
    setInterval(checkAndSendReminders, 60000);
  } catch (error) {
    console.error('Error starting bot:', error.message);
    process.exit(1);
  }
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('\nBot stopped by user');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\nBot stopped');
  process.exit(0);
});

main().catch((error) => {
  console.error('Fatal error:', error.message);
  process.exit(1);
});
