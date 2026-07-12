const assert = require("node:assert/strict");
const test = require("node:test");
const chatMedia = require("../shared/chat-media.json");

function emojiKey(value) {
  return value.normalize("NFC").replaceAll("\uFE0F", "");
}

const legacyEmoji = `
  ❤️ ❣️ 🧡 💛 💚 💟 💙 💜 🤎 🖤 🤍 💕 💞 💓 💗 💖 💘 💝 ❤️‍🔥 ❤️‍🩹
  💑 😘 🥰 😍 😀 😄 😆 😂 🤣 😊 ☺️ 🙂 🙃 🥺 😢 😌 😋 😜 🤭 🙈 😇 😭 😤
  😠 🤯 👍 👎 👌 ✌️ 🤞 👆 🤟 🤘 👏 🙌 👐 🤲 🤝 🙏 💪 🤗 👋 🤚 ☝️ 👀
  💋 💅 ☀️ 🌙 ⭐ ✨ ☕ 🍵 🍜 🍕 🍰 🍓 🌹 🎁 🎉 🎬 🎧 📸 🏠 🚗 🛵 ✈️ 🌧️
  🔥 💯 💤
`.trim().split(/\s+/u);

test("emoji catalog is grouped, broad and globally duplicate-free", () => {
  assert.deepEqual(
    chatMedia.emojiGroups.map((group) => group.id),
    ["feelings", "people", "love-activities", "food-drink", "animals", "nature-weather", "symbols"],
  );
  const all = chatMedia.emojiGroups.flatMap((group) => group.items);
  const keys = all.map(emojiKey);
  assert.ok(all.length >= 1_000, `expected at least 1,000 emoji, received ${all.length}`);
  assert.equal(new Set(keys).size, all.length);
  for (const group of chatMedia.emojiGroups) {
    assert.ok(group.icon);
    assert.ok(group.label);
    assert.ok(group.items.length >= 70);
  }
});

test("all original emoji remain available after catalog expansion", () => {
  const available = new Set(chatMedia.emojiGroups.flatMap((group) => group.items).map(emojiKey));
  for (const emoji of legacyEmoji) {
    assert.ok(available.has(emojiKey(emoji)), `missing original emoji ${emoji}`);
  }
});

test("each requested screenshot category has representative emoji", () => {
  const groups = new Map(chatMedia.emojiGroups.map((group) => [group.id, new Set(group.items)]));
  const expected = {
    feelings: ["🤡", "🤮", "👽"],
    people: ["👳", "👩‍🚀", "🤸"],
    "love-activities": ["👑", "🎻", "🥉"],
    "food-drink": ["🍣", "🥂", "🥢"],
    animals: ["🦄", "🐙", "🕸️"],
    "nature-weather": ["🌪️", "🌈", "🌘"],
    symbols: ["☢️", "♒", "🔟", "🕧"],
  };
  for (const [groupId, emoji] of Object.entries(expected)) {
    for (const value of emoji) assert.ok(groups.get(groupId).has(value), `${value} missing from ${groupId}`);
  }
});
