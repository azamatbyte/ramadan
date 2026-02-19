# Ramadan Telegram Bot (Node.js)

Uzbekistan Ramadan notification bot that sends reminders 10 minutes before Sahar (suhoor) and Iftar times.

## Features

- Multi-language support (Uzbek Latin & Cyrillic/Russian)
- 45+ regions with time adjustments
- Daily notifications 10 minutes before Sahar and Iftar
- Manual time checking with /today command
- Check current fasting status with /checktime command

## Regions Available

### Before Tashkent (Earlier times):
- Angren (-3/-4 min)
- Parkent (-2/-2 min)
- Andijon (-12/-13 min)
- Xonobod (-14/-15 min)
- Shahrixon (-10/-12 min)
- Xo'jaobod (-12/-14 min)
- Namangan (-9/-10 min)
- Pop (-6/-7 min)
- Chortoq (-10/-11 min)
- Kosonsoy (-9/-9 min)
- Farg'ona (-7/-9 min)
- Rishton (-6/-9 min)
- Qo'qon (-5/-7 min)
- Marg'ilon (-9/-11 min)

### After Tashkent (Later times):
- Bekobod (+2/+1 min)
- Buxoro (+24/+22 min)
- Gazli (+25/+24 min)
- G'ijduvon (+19/+18 min)
- Qorako'l (+27/+26 min)
- Guliston (+3/+2 min)
- Sardoba (+3/+2 min)
- Jizzax (+8/+7 min)
- Zomin (+6/+4 min)
- Forish (+9/+8 min)
- G'allaorol (+10/+8 min)
- Navoiy (+20/+21 min)
- Zarafshon (+20/+18 min)
- Konimex (+19/+18 min)
- Nurota (+15/+14 min)
- Uchquduq (+10/+9 min)
- Nukus (+38/+39 min)
- Mo'ynoq (+37/+40 min)
- Taxtako'pir (+31/+33 min)
- Qo'ng'irot (+40/+42 min)
- Samarqand (+15/+13 min)
- Ishtixon (+13/+11 min)
- Mirbozor (+16/+14 min)
- Kattaqo'rg'on (+14/+12 min)
- Urgut (+11/+9 min)
- Termiz (+14/+9 min)
- Boysun (+13/+9 min)
- Sho'rchi (+11/+7 min)
- Qarshi (+18/+15 min)
- Dehqonobod (+15/+12 min)
- Koson (+17/+15 min)
- Muborak (+19/+17 min)
- Shahrisabz (+14/+11 min)
- G'uzor (+17/+14 min)

## Installation

1. Clone or download the project

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file from example:
```bash
cp .env.example .env
```

4. Edit `.env` and add your bot token:
```
BOT_TOKEN=your_bot_token_here
```

5. Run the bot:
```bash
npm start
```

Or for development with auto-restart:
```bash
npm run dev
```

## Bot Commands

- `/start` - Start the bot and select language/region
- `/today` - Show today's Sahar and Iftar times
- `/region` - Change your region
- `/checktime` - Check current fasting status
  - If between Sahar and Iftar: Shows time remaining until Iftar
  - If before Sahar or after Iftar: Shows time until next Sahar
- `/dua` - Show Sahar and Iftar duas (prayers)

## How It Works

1. User starts bot with `/start`
2. Selects language (Uzbek or Cyrillic)
3. Selects region from the list
4. Bot saves preferences
5. Bot sends notifications 10 minutes before Sahar and Iftar daily
6. Times are calculated based on Tashkent base times with regional adjustments

## Ramadan 2026 Dates

Ramadan 2026: February 19 - March 20 (30 days)

## Data Source

Base times are for Tashkent region. All other regions have minute adjustments as specified.

## Files

- `bot.js` - Main bot code
- `package.json` - Node.js dependencies
- `.env.example` - Example environment variables
- `users.json` - User preferences (auto-generated)

## Requirements

- Node.js 14+ 
- npm or yarn
