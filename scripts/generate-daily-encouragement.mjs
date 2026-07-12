import { writeFile } from "node:fs/promises";

const outputPath = new URL("../shared/daily-encouragement.json", import.meta.url);

const openings = [
  "Hôm nay, hai đứa hãy nhớ rằng",
  "Bắt đầu ngày mới, mình cùng tin rằng",
  "Dù hôm nay bận đến đâu, đừng quên rằng",
  "Trước khi bước vào ngày mới, hai đứa hãy mang theo niềm tin rằng",
  "Sáng nay, mình nhắc nhau một điều nhỏ:",
  "Ngày mới sẽ dịu dàng hơn khi hai đứa nhớ rằng",
  "Hôm nay, mình cứ bình tĩnh và tin rằng",
  "Hai đứa có thể bắt đầu buổi sáng bằng việc nhớ rằng",
  "Một ngày mới lại đến, và điều đáng giữ trong tim là",
  "Khi mặt trời lên, mình cùng nhắc nhau rằng",
  "Hôm nay, dù mọi chuyện diễn ra thế nào, hãy nhớ rằng",
  "Buổi sáng này, hai đứa cùng chọn tin rằng",
  "Trước những việc đang chờ phía trước, mình hãy nhớ rằng",
  "Hôm nay là một cơ hội mới để hai đứa tin rằng",
  "Mỗi sáng, điều đầu tiên mình nên nhớ là",
  "Ngày hôm nay sẽ có ý nghĩa hơn khi mình biết rằng",
  "Hai đứa hãy bước vào ngày mới với suy nghĩ rằng",
  "Sáng nay, mình gửi cho nhau một lời nhắc:",
];

const affirmations = [
  "cả hai đều xứng đáng với một ngày dịu dàng.",
  "mình không cần hoàn hảo để vẫn đáng tự hào.",
  "mỗi cố gắng nhỏ hôm nay đều có ý nghĩa.",
  "chỉ cần cùng một phía, chuyện khó rồi cũng sẽ nhẹ hơn.",
  "hai đứa luôn có một nơi bình yên trong nhau.",
  "một lời hỏi han đúng lúc có thể làm cả ngày ấm hơn.",
  "mình có thể đi chậm, miễn là không bỏ quên nhau.",
  "hôm nay vẫn còn rất nhiều điều tốt đẹp đang chờ.",
  "cả hai đã mạnh mẽ hơn những gì mình thường nghĩ.",
  "một ngày chưa trọn vẹn vẫn có thể chứa nhiều khoảnh khắc đẹp.",
  "yêu thương được tạo nên từ những điều nhỏ mình làm mỗi ngày.",
  "mỗi người đều có quyền mệt, nghỉ và bắt đầu lại.",
  "hai đứa không phải tự mình gánh hết mọi chuyện.",
  "mình luôn có thể chọn nói với nhau bằng sự dịu dàng.",
  "những bước tiến bé vẫn là bước tiến thật sự.",
  "một cái ôm và một câu chân thành đôi khi đã là đủ.",
  "mình đang cùng nhau xây nên điều đáng quý từng ngày.",
  "khó khăn hôm nay không quyết định niềm vui của ngày mai.",
  "cả hai đều có những điểm mạnh đáng được nhìn thấy.",
  "chỉ cần còn lắng nghe, mình vẫn luôn tìm được đường về với nhau.",
  "hạnh phúc không cần ồn ào mới trở nên có thật.",
  "sự hiện diện của mỗi người đều làm cuộc sống người kia tốt hơn.",
  "mình có thể cùng biến một ngày bình thường thành kỷ niệm đẹp.",
  "điều tốt nhất hôm nay có thể bắt đầu từ một nụ cười dành cho nhau.",
  "cả hai đều xứng đáng được yêu thương theo cách khiến mình thấy an toàn.",
  "mỗi lần lựa chọn thấu hiểu là một lần tình yêu lớn thêm.",
  "mình có đủ kiên nhẫn để đi qua ngày hôm nay từng việc một.",
  "hai đứa đã đi được một chặng đáng tự hào và vẫn còn nhiều điều đẹp phía trước.",
  "không cần giải quyết mọi thứ ngay lúc này; ở bên nhau đã là một khởi đầu.",
  "mỗi ngày cùng nhau đều là một cơ hội để yêu nhau tốt hơn.",
];

const items = openings.flatMap((opening, openingIndex) =>
  affirmations.map((affirmation, affirmationIndex) => ({
    id: `o${String(openingIndex + 1).padStart(2, "0")}-a${String(affirmationIndex + 1).padStart(2, "0")}`,
    text: `${opening} ${affirmation}`,
  })),
);

const catalog = {
  version: 1,
  timezone: "Asia/Ho_Chi_Minh",
  items,
};

await writeFile(outputPath, `${JSON.stringify(catalog, null, 2)}\n`, "utf8");
console.log(`Generated ${items.length} unique daily encouragements.`);
