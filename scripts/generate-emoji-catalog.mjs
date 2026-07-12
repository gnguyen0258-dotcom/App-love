import { readFile, writeFile } from "node:fs/promises";

const catalogPath = new URL("../shared/chat-media.json", import.meta.url);

function items(value) {
  return value.trim().split(/\s+/u);
}

function emojiKey(value) {
  return value.normalize("NFC").replaceAll("\uFE0F", "");
}

const sources = [
  {
    id: "feelings",
    label: "Cảm xúc",
    icon: "😀",
    items: items(`
      😀 😃 😄 😁 😆 😅 😂 🤣 😊 😇 🙂 🙃 ☺️ 😉 😌 😍 🥰 😘 😗 😙 😚
      😋 😛 😝 😜 🤪 🤨 🧐 🤓 😎 🥸 🤑 🤗 🤭 🫢 🫣 🤫 🤔 🫡 🤐 🤨 😐 😑
      😶 🫥 😶‍🌫️ 😏 😒 🙄 😬 😮‍💨 🤥 😌 😔 😪 🤤 😴 😷 🤒 🤕 🤢 🤮 🤧 🥵
      🥶 🥴 😵 😵‍💫 🤯 🤠 🥳 🥺 🥹 😕 🫤 😟 🙁 ☹️ 😣 😖 😫 😩 😢 😭 😤
      😠 😡 🤬 😈 👿 💀 ☠️ 💩 🤡 👹 👺 👻 👽 👾 🤖 🎃 😺 😸 😹 😻 😼 😽
      🙀 😿 😾 🙈 🙉 🙊 😯 😦 😧 😮 😲 😳 🥱 😨 😰 😥 😓 😱 😞 😖 😤
    `),
  },
  {
    id: "people",
    label: "Cử chỉ & con người",
    icon: "👋",
    items: items(`
      👋 🤚 🖐️ ✋ 🖖 👌 🤌 🤏 ✌️ 🤞 🫰 🤟 🤘 🤙 👈 👉 👆 🖕 👇 ☝️ 🫵
      👍 👎 👊 ✊ 🤛 🤜 👏 🙌 🫶 👐 🤲 🤝 🙏 ✍️ 💅 🤳 💪 🦾 🦿 🦵 🦶
      👂 🦻 👃 🧠 🫀 🫁 🦷 🦴 👀 👁️ 👅 👄 👣 🗣️ 👤 👥 🫂
      👍🏻 👍🏼 👍🏽 👍🏾 👍🏿 👎🏻 👎🏼 👎🏽 👎🏾 👎🏿
      👶 🧒 👦 👧 🧑 👱 👨 🧔 👩 🧓 👴 👵 👲 👳 🧕 👮 👷 💂 🕵️ 👩‍⚕️ 👨‍⚕️
      👩‍🎓 👨‍🎓 👩‍🏫 👨‍🏫 👩‍⚖️ 👨‍⚖️ 👩‍🌾 👨‍🌾 👩‍🍳 👨‍🍳 👩‍🔧 👨‍🔧 👩‍🏭 👨‍🏭
      👩‍💼 👨‍💼 👩‍🔬 👨‍🔬 👩‍💻 👨‍💻 👩‍🎤 👨‍🎤 👩‍🎨 👨‍🎨 👩‍✈️ 👨‍✈️ 👩‍🚀 👨‍🚀
      👩‍🚒 👨‍🚒 👸 🤴 👰 🤵 🤶 🎅 👼 🤰 🤱 🙍 🙎 🙅 🙆 💁 🙋 🧏 🙇 🤦 🤷
      💆 💇 🚶 🧍 🧎 🏃 💃 🕺 🕴️ 👯 🧖 🧗 🤺 🏇 ⛷️ 🏂 🏌️ 🏄 🚣 🏊
      ⛹️ 🏋️ 🚴 🚵 🤸 🤼 🤽 🤾 🛀 🛌 👭 👬 👫 💏 💑 👩‍❤️‍👨 👨‍❤️‍👨
      👩‍❤️‍👩 👩‍❤️‍💋‍👨 👨‍❤️‍💋‍👨 👩‍❤️‍💋‍👩 👪 👨‍👩‍👦 👨‍👩‍👧 👨‍👩‍👧‍👦
      👨‍👩‍👦‍👦 👨‍👩‍👧‍👧 👩‍👩‍👦 👩‍👩‍👧 👨‍👨‍👦 👨‍👨‍👧 👩‍👦 👩‍👧 👨‍👦 👨‍👧
    `),
  },
  {
    id: "love-activities",
    label: "Yêu thương & hoạt động",
    icon: "❤️",
    items: items(`
      ❤️ 🩷 🧡 💛 💚 💙 🩵 💜 🤎 🖤 🩶 🤍 💔 ❣️ 💕 💞 💓 💗 💖 💘 💝 💟
      ❤️‍🔥 ❤️‍🩹 💌 💋 👄 💄 💍 💎 📿 🎁 🎀 👙 👗 👚 👕 👔 👖 🧣 🧤 🧥 🧦
      👠 👡 👢 👞 👟 🥾 🥿 👒 🎩 🎓 👑 ⛑️ 👓 🕶️ 🥽 👛 👝 👜 💼 🎒 🛍️ 🛒
      🎭 🎨 🎪 🎟️ 🎫 🎗️ 🎖️ 🏆 🏅 🥇 🥈 🥉 ⚽ 🏀 🏈 ⚾ 🥎 🏐 🏉 🎱
      🎾 🏸 🏓 🏏 🏑 🏒 🥅 ⛳ 🏹 🎣 🥊 🥋 ⛸️ 🎿 🛷 🥌 🛹 🛼 🛶 🎯
      🎳 🎮 🎲 🧩 ♟️ 🎰 🎤 🎧 🎷 🎸 🎹 🎺 🎻 🪕 🥁 📯 🎼 🎵 🎶 🎬 📸
      🎉 🎊 🎈 🎂 🎆 🎇 🪩 🪁 🪀 🧸 🪄 🧵 🧶 🪡 🧿
    `),
  },
  {
    id: "food-drink",
    label: "Đồ ăn & thức uống",
    icon: "🍜",
    items: items(`
      🍏 🍎 🍐 🍊 🍋 🍌 🍉 🍇 🍓 🫐 🍈 🍒 🍑 🥭 🍍 🥥 🥝 🍅 🍆 🥑 🥦
      🥬 🥒 🌶️ 🫑 🌽 🥕 🫒 🧄 🧅 🥔 🍠 🌰 🥜 🫘 🍄 🥐 🥯 🍞 🥖 🥨
      🧀 🥚 🍳 🧈 🥞 🧇 🥓 🥩 🍗 🍖 🌭 🍔 🍟 🍕 🫓 🥪 🥙 🧆 🌮 🌯 🫔
      🥗 🥘 🫕 🥫 🍝 🍜 🍲 🍛 🍣 🍱 🥟 🦪 🍤 🍙 🍚 🍘 🍥 🥠 🥮 🍢
      🍡 🍧 🍨 🍦 🥧 🧁 🍰 🎂 🍮 🍭 🍬 🍫 🍿 🍩 🍪 🌰 🍯 🍼 🥛 ☕ 🍵
      🧃 🧉 🧊 🍶 🍺 🍻 🥂 🍷 🥃 🍸 🍹 🍾 🫖 🥤 🧋 🥄 🍴 🍽️ 🥢 🧂
    `),
  },
  {
    id: "animals",
    label: "Động vật",
    icon: "🐱",
    items: items(`
      🐱 🐈 🐈‍⬛ 🐶 🐕 🐩 🦮 🐕‍🦺 🐺 🦊 🦝 🐻 🐻‍❄️ 🐼 🐨 🐯 🦁 🐮 🐷
      🐽 🐸 🐵 🦍 🦧 🐒 🐔 🐓 🐣 🐤 🐥 🐦 🐧 🕊️ 🦅 🦆 🦢 🦉 🦤
      🦩 🦚 🦜 🐴 🦄 🫏 🦓 🦌 🦬 🐂 🐃 🐄 🐎 🐖 🐏 🐑 🦙 🐐 🐪
      🐫 🦒 🐘 🦣 🦏 🦛 🐭 🐁 🐀 🐹 🐰 🐇 🐿️ 🦫 🦔 🦇 🦦 🦥
      🦘 🦨 🦡 🐾 🦃 🐦‍⬛ 🪿 🐦‍🔥 🐍 🦎 🐢 🐊 🐲 🐉 🦕 🦖 🐳 🐋
      🐬 🦭 🐟 🐠 🐡 🦈 🐙 🐚 🪸 🪼 🦀 🦞 🦐 🦑 🦪 🐌 🦋 🐛 🐜
      🐝 🪲 🐞 🦗 🪳 🕷️ 🕸️ 🦂 🦟 🪰 🪱 🦠 🐏 🐑 🐐 🐂 🐃 🐄
    `),
  },
  {
    id: "nature-weather",
    label: "Thiên nhiên & thời tiết",
    icon: "🌿",
    items: items(`
      🌸 🌼 🌻 🌺 🌹 🥀 🌷 🪻 🪷 💐 🌱 🪴 🌲 🌳 🌴 🌵 🌾 🌿 ☘️ 🍀 🍁
      🍂 🍃 🪹 🪺 🍄 🌎 🌍 🌏 🌐 🪨 🪵 🌑 🌒 🌓 🌔 🌕 🌖 🌗 🌘 🌙
      🌚 🌛 🌜 🌝 🌞 ⭐ 🌟 💫 ✨ ⚡ 🔥 💥 ☄️ ☀️ 🌤️ ⛅ 🌥️ 🌦️ ☁️
      🌧️ ⛈️ 🌩️ 🌨️ ❄️ 💨 🌬️ 🌪️ 🌫️ 🌈 ☔ 💧 💦 🌊 ⛄ ☃️ 🧊 🫧
    `),
  },
  {
    id: "symbols",
    label: "Vật dụng & biểu tượng",
    icon: "💯",
    items: items(`
      ❗ ❕ ❓ ❔ ‼️ ⁉️ ✅ ❌ ⭕ 💢 🚫 🔞 📵 🚭 🚯 🚱 🚳 🚷 🔕 🔇 🔈 🔉 🔊
      🛑 ⛔ ⚠️ ☢️ ☣️ ❎ ♻️ ☯️ 💯 💤 🔆 🔅 🌀 ♨️ ⚜️ 🔱 〽️ 〰️ ✡️ ✝️
      ☦️ ☪️ 🕉️ ☸️ 🔯 🕎 ☮️ ⚛️ ♀️ ♂️ ⚧️ ✔️ ✖️ ➕ ➖ ➗ ©️ ®️ ™️ ☑️ ♿
      🆘 🆗 🆙 🆒 🆕 🆓 🆖 🆚 🆑 🆔 🅰️ 🅱️ 🆎 🅾️ 🅿️ Ⓜ️ ℹ️ 🈁 🈂️
      🈷️ 🈶 🈯 🉐 🈹 🈚 🈲 🈴 🈵 🈸 🈺 🈳 ㊗️ ㊙️
      0️⃣ 1️⃣ 2️⃣ 3️⃣ 4️⃣ 5️⃣ 6️⃣ 7️⃣ 8️⃣ 9️⃣ 🔟 🔢 #️⃣ *️⃣
      ▶️ ⏸️ ⏹️ ⏺️ ⏭️ ⏮️ ⏩ ⏪ ⏫ ⏬ ◀️ 🔼 🔽 🔀 🔁 🔂
      ⬆️ ↗️ ➡️ ↘️ ⬇️ ↙️ ⬅️ ↖️ ↕️ ↔️ ↩️ ↪️ ⤴️ ⤵️ 🔃 🔄 🔙 🔚 🔛 🔜 🔝
      ♈ ♉ ♊ ♋ ♌ ♍ ♎ ♏ ♐ ♑ ♒ ♓ ⛎
      🔴 🟠 🟡 🟢 🔵 🟣 🟤 ⚫ ⚪ 🟥 🟧 🟨 🟩 🟦 🟪 🟫 ⬛ ⬜ ◼️ ◻️
      ◾ ◽ ▪️ ▫️ 🔶 🔷 🔸 🔹 🔺 🔻 💠 🔘 🔳 🔲
      💬 🗨️ 🗯️ 💭 👁️‍🗨️ ♠️ ♣️ ♥️ ♦️ 🃏 🀄 🎴
      🚹 🚺 🚻 🚼 🚾 🛂 🛃 🛄 🛅 🛗 🛜 📶 📳 📴 🛐
      ⌚ ⏰ ⏱️ ⏲️ 🕰️ 🕛 🕧 🕐 🕜 🕑 🕝 🕒 🕞 🕓 🕟 🕔 🕠 🕕 🕡
      🕖 🕢 🕗 🕣 🕘 🕤 🕙 🕥 🕚 🕦
      🏠 🚗 🛵 ✈️ 🚀 🚲 🚂 🚆 🚇 🚊 🚌 🚕 🚙 🚚 🚢 ⛵ 🗺️ 🧭
      📞 📱 💻 ⌨️ 🖥️ 🖨️ 🖱️ 💾 💿 📀 📺 📻 📷 📹 🔍 🔎 💡 🔦 🕯️
      📚 📖 📝 ✏️ 🖊️ 📌 📍 📎 📐 📏 ✂️ 🔒 🔓 🔑 🗝️ 🔨 🪓 ⛏️ ⚒️ 🛠️
      🗡️ ⚔️ 🔫 🛡️ 🔧 🪛 🔩 ⚙️ 🧰 🧲 🧪 🧬 🔬 🔭 🩺 💊 🩹 🩸
    `),
  },
];

const seen = new Set();
const emojiGroups = sources.map(({ id, label, icon, items: groupItems }) => ({
  id,
  label,
  icon,
  items: groupItems.filter((emoji) => {
    const key = emojiKey(emoji);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }),
}));

const chatMedia = JSON.parse(await readFile(catalogPath, "utf8"));
chatMedia.emojiGroups = emojiGroups;
await writeFile(catalogPath, `${JSON.stringify(chatMedia, null, 2)}\n`, "utf8");

const total = emojiGroups.reduce((count, group) => count + group.items.length, 0);
console.log(`Generated ${total} unique emoji across ${emojiGroups.length} groups.`);
