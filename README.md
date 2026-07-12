# HeartSync

HeartSync là PWA riêng tư dành cho hai tài khoản đã liên kết. Phase 1 gồm:

- Firebase Authentication với phiên đăng nhập được giữ trên thiết bị.
- Mỗi Gmail có một mã cá nhân; chỉ ghép đôi khi hai tài khoản đã nhập mã của nhau.
- Check-in hằng ngày, nhịp yêu thương và trò chuyện real-time.
- Thư viện biểu tượng và sticker HeartSync trong khung trò chuyện.
- Bộ đếm ngày yêu và các cột mốc kỷ niệm.
- Kho lưu trữ sở thích, số đo và những điều cần ghi nhớ.
- Theo dõi chu kỳ có lịch ghi nhận và dự báo tham khảo.
- Lịch sự kiện chung cho hai tài khoản.
- Góc yêu với câu hỏi mỗi ngày, Hũ hẹn hò, Phiếu yêu thương và tín hiệu bất ngờ.
- Web Push qua Firebase Cloud Messaging khi app ở nền hoặc đã đóng.
- Nội dung lời nhắn trên màn hình khóa được ẩn mặc định.

## Chạy giao diện local

```bash
npm install
npm run icons
npm run dev -- --host 127.0.0.1
```

Mở `http://127.0.0.1:5173/?preview=app` để xem giao diện với dữ liệu mẫu. Các chế độ khác:

- `?preview=auth`: màn đăng nhập.
- `?preview=pair`: màn ghép đôi; dùng mã đối phương `NGAY-AY25` để mô phỏng xác nhận hai chiều.
- `?preview=app&view=tools&tool=days`: Tính ngày.
- `?preview=app&view=tools&tool=vault`: Kho lưu trữ.
- `?preview=app&view=tools&tool=cycle`: Chu kỳ.
- `?preview=app&view=tools&tool=calendar`: Lịch chung.
- `?preview=app&view=tools&tool=love`: Góc yêu.

Để thử Firebase và Vercel Functions cùng lúc, cài Vercel CLI rồi chạy `vercel dev`.

## Thiết lập Firebase

1. Trong Firebase Authentication, bật `Email/Password` và `Google`.
2. Thêm domain production của Vercel vào `Authentication > Settings > Authorized domains`.
3. Trong Realtime Database, triển khai nội dung của `database.rules.json`.
4. Trong `Project settings > Cloud Messaging > Web Push certificates`, tạo VAPID key.
5. Tạo Firebase service account dành cho Vercel Functions.

Firebase Web config hiện có giá trị mặc định của project `applove-d9878`. Có thể ghi đè bằng các biến `VITE_FIREBASE_*` trong `.env.example`.

## Biến môi trường Vercel

Thêm các biến sau cho Production và Preview:

```text
VITE_FIREBASE_VAPID_KEY
FIREBASE_PROJECT_ID
FIREBASE_CLIENT_EMAIL
FIREBASE_PRIVATE_KEY
FIREBASE_DATABASE_URL
APP_BASE_URL
```

`APP_BASE_URL` là URL production, ví dụ `https://app-love.vercel.app`.

Không commit private key hoặc service-account JSON lên GitHub. Có thể dùng một biến `FIREBASE_SERVICE_ACCOUNT_JSON` thay cho ba biến Admin riêng lẻ.

## Tương thích Vercel Functions

`firebase-admin` đang được khóa ở `13.6.1`. Bản `14.x` kéo `jwks-rsa 4.x` và `jose 6` chỉ hỗ trợ ESM; loader CommonJS của Vercel Functions có thể dừng với `ERR_REQUIRE_ESM` trước khi handler chạy. Chỉ nâng phiên bản sau khi `npm run check` và bốn kiểm tra API trên Preview Deployment đều qua.

## Dữ liệu chung và kiểm thử

Tính ngày, Kho lưu trữ, Chu kỳ, Lịch và Góc yêu nằm dưới `couples/{coupleId}/shared`. Cả hai thành viên đã liên kết đều có thể đọc dữ liệu chung. Câu hỏi mỗi ngày chỉ cho phép từng người sửa câu trả lời của chính mình; ý tưởng hẹn hò chỉ người tạo được xóa; phiếu chỉ người được nhận mới có thể sử dụng. Dữ liệu Chu kỳ là dữ liệu nhạy cảm; chỉ nhập khi cả hai đã thống nhất chia sẻ. Dự báo chu kỳ không dùng để tránh thai, chẩn đoán hoặc thay thế tư vấn y tế.

Mã cá nhân được Vercel Function cấp ở lần đăng nhập đầu tiên. Chỉ chủ tài khoản đọc được mã của mình. Bảng tra mã, yêu cầu ghép và khóa chống ghép trùng đều bị Firebase Rules chặn hoàn toàn với trình duyệt.

```bash
npm test
npm run test:rules
npm run smoke:ui
npm run build
```

## Ảnh đại diện tùy chỉnh

Sau khi đăng nhập, người dùng có thể đổi ảnh ở màn hình ghép đôi hoặc trong `Cài đặt > Hồ sơ`. Ảnh được cắt vuông và nén ngay trên thiết bị trước khi gửi lên API. Bản ảnh nhỏ được lưu trong Realtime Database tại hồ sơ của người dùng và bản thành viên của cặp đôi; không cần bật Firebase Storage. Chỉ tài khoản đó và người đã liên kết mới đọc được ảnh qua các luồng dữ liệu hiện có.

Nút làm mới xuất hiện ở màn hình đăng nhập, ghép đôi và thanh trên cùng của ứng dụng. Nút này tải lại trang nhưng không đăng xuất tài khoản vì Firebase Auth vẫn giữ phiên trên thiết bị.

Google Authentication dùng `signInWithPopup()` trên mọi thiết bị. Không tự chuyển sang `signInWithRedirect()` khi popup bị chặn vì Safari 16.1+ chặn bộ nhớ bên thứ ba của Firebase Auth trên domain Vercel. Lệnh mở popup được gọi trước khi giao diện chuyển sang trạng thái bận để giữ nguyên user activation trên Safari.

## Ảnh nền nhịp đôi

Nút máy ảnh trên khung Nhịp đôi cho phép một trong hai thành viên chọn ảnh nền chung hoặc trở về nền xanh mặc định. Ảnh được cắt theo tỷ lệ 16:9, nén WebP ngay trên thiết bị và kiểm tra lại chữ ký tệp ở Vercel Function. Realtime Database chỉ giữ bản hiện tại tại `couples/{coupleId}/shared/pulseBackground`; đổi ảnh là ghi đè nên dung lượng không tăng theo lịch sử.

## Hướng dẫn size quần áo và giày

Kho lưu trữ có bộ chọn bảng Nam/Nữ. Size quần áo dùng các khoảng chiều cao và cân nặng trong bảng tham chiếu; khi hai chỉ số trả về hai mức khác nhau, app ưu tiên mức lớn hơn để hạn chế bị chật. Các mức ngoài S–XXL được ngoại suy theo bước chiều cao/cân nặng sát biên thành XS, 2XS, 3XL, 4XL và tiếp tục tương tự.

Size giày nhận chiều dài chân theo centimet và trả đồng thời VN, US, UK. Giá trị nằm giữa hai hàng được nội suy rồi làm tròn đến nửa size; giá trị ngoài bảng dùng độ chênh của hai hàng gần biên nhất. Đây là size tham khảo, form giày và từng hãng vẫn có thể chênh lệch.

## Biệt danh đồng bộ

Trong tab `Hai đứa`, cả hai thành viên có thể đặt biệt danh cho mình và người ấy rồi lưu một lần. Dữ liệu nằm tại `couples/{coupleId}/shared/nicknames/{uid}`, tối đa 32 ký tự và chỉ chấp nhận UID đang thuộc cặp. Biệt danh được ưu tiên trong thanh tiêu đề, danh sách thành viên, tin nhắn, lịch và thông báo đẩy; tên Google gốc không bị thay đổi. Để trống một ô sẽ xóa biệt danh và dùng lại tên Google.

## Biểu tượng và sticker

Tab `Tin nhắn` có thư viện emoji chuẩn và 24 sticker HeartSync nguyên bản trong `shared/chat-media.json`. Bộ chọn mô phỏng thao tác quen thuộc của các ứng dụng nhắn tin nhưng không đóng gói tài sản độc quyền của Instagram hoặc Messenger. Emoji được chèn vào nội dung văn bản; sticker được gửi bằng `kind: "sticker"` và một `stickerId` đã được API đối chiếu với catalog. Firebase chỉ lưu ID, nhãn và metadata tin nhắn, không lưu Base64 hoặc file ảnh sticker.

## Lịch sử hoạt động 24 giờ

Tab `Tin nhắn` chỉ hiển thị hội thoại trực tiếp và sticker. Các thao tác từ tiện ích như gửi nhịp tim, trả lời câu hỏi, thêm ý tưởng hoặc dùng phiếu được API ghi riêng tại `couples/{coupleId}/activities/{activityId}` và hiển thị trong `Gần đây`. Mỗi bản ghi có `expiresAt = createdAt + 24 giờ`; app đặt timer theo thời điểm hết hạn gần nhất, ẩn đúng từng bản ghi khi đến hạn rồi yêu cầu API xóa riêng các ID đã hết hạn. Nếu cả hai thiết bị cùng ngoại tuyến, dữ liệu hết hạn được ẩn và dọn ngay khi một thiết bị kết nối lại.

## Deploy

Import repo GitHub vào Vercel với Framework Preset `Vite`. Mỗi lần push nhánh `main`, Vercel build `dist` và triển khai các API trong thư mục `api/`.

Sau deploy, kiểm tra theo thứ tự:

1. Hai tài khoản đăng nhập trên hai thiết bị.
2. Mỗi người gửi mã cá nhân của mình cho người còn lại.
3. Cả hai cùng nhập mã nhận được; app chỉ mở không gian chung sau khi hai chiều khớp.
4. Cả hai bật thông báo trong Cài đặt.
5. Trên iPhone, thêm PWA vào Màn hình chính trước khi cấp quyền thông báo.
6. Tắt app ở một thiết bị và gửi lời nhắn từ thiết bị còn lại.
