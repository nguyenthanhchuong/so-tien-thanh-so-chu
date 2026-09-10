# Đổi Số Thành Chữ

Gõ một số, xem ngay cách đọc bằng chữ — song ngữ Việt và Anh hiện cùng lúc,
không cần chuyển đổi qua lại.

Ví dụ: `1500000` →
- 🇻🇳 một triệu năm trăm nghìn
- 🇬🇧 one million five hundred thousand

## Phạm vi

Chỉ đổi số nguyên (dương hoặc âm) thành chữ số đếm thuần — **không** gắn đơn
vị tiền tệ ("đồng", "dollar"...). Hỗ trợ tới 36 chữ số.

## Cách dùng

Mở [nguyenthanhchuong.github.io/so-tien-thanh-so-chu](https://nguyenthanhchuong.github.io/so-tien-thanh-so-chu/),
gõ số vào ô, kết quả hiện ngay bên dưới. Có nút sao chép riêng cho từng ngôn
ngữ. Bật "Số âm" nếu cần đọc số âm — bàn phím số trên điện thoại thường không
có phím trừ nên tách riêng thành công tắc.

Có thể cài ra màn hình chính (Chrome/Safari → "Cài đặt ứng dụng" / "Thêm vào
màn hình chính") để dùng như app, kể cả khi mất mạng.

## Cấu trúc

- `logic.js` — toàn bộ phép đổi số, không đụng DOM, test được độc lập.
- `test.html` — mở là tự chạy hơn 80 phép thử, bao gồm các luật khó của tiếng
  Việt (không trăm, linh, mốt/lăm) và các mốc lớn (nghìn tỷ, triệu tỷ, tỷ tỷ).
- `app.js` / `index.html` / `style.css` — giao diện.
- `sw.js` — service worker network-first (ưu tiên mạng, cache chỉ là dự
  phòng) để bản sửa luôn tới được người dùng ngay, không bị kẹt ở bản cũ.

## Vì sao xử lý bằng chuỗi, không dùng Number

JS Number chỉ chính xác tới khoảng 16 chữ số (2^53). Một công cụ đọc số mà
làm tròn sai dù chỉ một chữ số là hỏng cả kết quả, nên toàn bộ pipeline —
từ lúc gõ, định dạng dấu chấm phân cách, đến lúc đổi ra chữ — đều làm việc
trên chuỗi ký tự, không bao giờ ép qua Number/BigInt.
