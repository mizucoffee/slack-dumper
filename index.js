import "https://deno.land/x/dotenv/load.ts";
import { WebClient } from 'https://deno.land/x/slack_web_api/mod.js';
import { delay } from 'https://deno.land/x/delay@v0.2.0/mod.ts';
import { download } from "https://deno.land/x/download/mod.ts";
import { nanoid } from "https://deno.land/x/nanoid/mod.ts"

const token = Deno.args[0] || Deno.env.get("SLACK_TOKEN");

if(!token) {
  console.error("Missing token");
  Deno.exit(1);
}

const waitTime = 60000 / 50;

if(!token) {
  console.error("SLACK_TOKEN is not set");
  Deno.exit(1);
}
const web = new WebClient(token);

const channel_ids = []
const user_ids = []
const bot_ids = new Set()

try {
  await Deno.remove("output", { recursive: true });
} catch(e) {}
await Deno.mkdir("output/channels", { recursive: true });
await Deno.mkdir("output/files", { recursive: true });
await Deno.mkdir("output/users", { recursive: true });

// await dumpUsers();
// await dumpConversations();
// await dumpBotInfo();
await dumpEmojis();
// await dumpInfo();

async function dumpEmojis() {
  await delay(waitTime);
  const res = await web.emoji.list()
  for(const emoji in res.emoji) {
    await delay(10);
    if(res.emoji[emoji].startsWith("alias:")) continue;
    const filename = `emoji_${nanoid()}.${res.emoji[emoji].split(".").pop()}`;
    await download(res.emoji[emoji], { file: filename, dir: `output/files/` });
    res.emoji[emoji] = filename
  }
  await Deno.writeTextFile("./output/emojis.json", JSON.stringify(res.emoji, null, 2));
}

async function dumpInfo() {
  const res = await web.team.info();
  const team = res.team;
  team.channels = channel_ids;
  team.users = user_ids;
  await download(team.icon.image_230, { file: `${team.id}.png`, dir: `output/files/` });
  await Deno.writeTextFile("./output/team.json", JSON.stringify(team, null, 2));
}

async function dumpBotInfo() {
  for(const b of bot_ids) {
    await delay(waitTime);
    const res = await web.bots.info({ bot: b });
    const bot = res.bot
    await download(bot.icons.image_72, { file: `${bot.id}.png`, dir: `output/files/` });
    await Deno.writeTextFile(`./output/users/${bot.id}.json`, JSON.stringify(bot, null, 2));
  }
}

async function dumpUsers(cursor = null) {
  await delay(waitTime);
  const users = await web.users.list({ cursor });
  for(const user of users.members) {
    await Deno.writeTextFile(`output/users/${user.id}.json`, JSON.stringify(user, null, 2));
    user_ids.push(user.id);
    await download(user.profile.image_192, { file: `${user.id}.png`, dir: `output/files/` });
  }

  if(users.response_metadata.next_cursor) {
    await dumpUsers(users.response_metadata.next_cursor);
  }
}

async function dumpConversations(cursor = null) {
  await delay(waitTime);
  const conversations = await web.conversations.list({ types: "public_channel,private_channel", cursor });

  for(const channel of conversations.channels) {
    const messages = await fetchMessages(channel.id);
    channel.messages = messages;
    for(const message of messages) {
      if(message.bot_id) bot_ids.add(message.bot_id);
    }
    channel_ids.push(channel.id);
    await Deno.writeTextFile(`./output/channels/${channel.id}.json`, JSON.stringify(channel, null, 2));
  }

  if(conversations.response_metadata.next_cursor) {
    await dumpConversations(conversations.response_metadata.next_cursor);
  }
}

async function fetchMessages(channelId, cursor = null) {
  await delay(waitTime);
  const history = await web.conversations.history({ channel: channelId, limit: 100, cursor });
  const messages = await Promise.all(history.messages.map(async m => {
    m.files = m.files ? await Promise.all(m.files.map(async f => {
      if(!f.url_private_download) return f;
      await download(f.url_private, { file: `${f.id}_${f.name}`, dir: `output/files/` }, { headers: { Authorization: `Bearer ${token}` } });
      f.filepath = `${f.id}_${f.name}`;
      return f;
    })) : [];
    return m;
  }));

  if(history.response_metadata.next_cursor) {
    const m = await fetchMessages(channelId, history.response_metadata.next_cursor);
    messages.push(...m);
  }

  return messages;
}

// 関連ページを取得する
// 絵文字を取得する
// リプライ
// コードブロック
// ファイル埋め込み