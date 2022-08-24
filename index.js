import "https://deno.land/x/dotenv/load.ts";
import { WebClient } from 'https://deno.land/x/slack_web_api/mod.js';
import { delay } from 'https://deno.land/x/delay@v0.2.0/mod.ts';
import { download } from "https://deno.land/x/download/mod.ts";

const token = Deno.env.get("SLACK_TOKEN");
const waitTime = 60000 / 50;

if(!token) {
  console.error("SLACK_TOKEN is not set");
  Deno.exit(1);
}
const web = new WebClient(token);

try {
  await Deno.remove("output", { recursive: true });
} catch(e) {}
await Deno.mkdir("output/channels", { recursive: true });
await Deno.mkdir("output/files", { recursive: true });
await Deno.mkdir("output/users/images", { recursive: true });

await dumpUsers();
await dumpConversations();

async function dumpUsers(cursor = null) {
  await delay(waitTime);
  const users = await web.users.list({ cursor });
  for(const user of users.members) {
    await Deno.writeTextFile(`output/users/${user.id}.json`, JSON.stringify(user, null, 2));
    await download(user.profile.image_192, { file: `${user.id}.png`, dir: `output/users/images/` });
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
      f.filepath = `files/${f.id}_${f.name}`;
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
