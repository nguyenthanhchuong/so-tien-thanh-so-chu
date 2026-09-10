// Giao diện: chỉ lo hiển thị và bắt sự kiện. Toàn bộ phép đổi số nằm trong
// logic.js để test độc lập được (xem test.html).
const $ = id => document.getElementById(id);

const oNhap = $("so-input");
const btnXoa = $("btn-xoa");
const amCheck = $("am-check");
const oLoi = $("o-loi");
const khuKetQua = $("khu-ket-qua");
const khuTrong = $("khu-trong");
const chuVi = $("chu-vi");
const chuEn = $("chu-en");

function hienDung(el) { el.hidden = false; }
function anDi(el) { el.hidden = true; }

// Chạy lại toàn bộ khi ô nhập hoặc công tắc "Số âm" đổi giá trị.
// Ô nhập LUÔN chỉ hiển thị chữ số dương (đã định dạng dấu chấm) — dấu âm do
// công tắc riêng quyết định, không gõ trực tiếp vào ô số. Làm vậy vì bàn phím
// số trên điện thoại (inputmode="numeric") thường không có phím trừ, gõ được
// hay không tuỳ máy; tách ra một công tắc là cách chắc chắn hoạt động mọi nơi.
function tinhLai() {
  const raw = Logic.chiLayChuSo(oNhap.value);
  const formatted = Logic.dinhDangKhiGo(raw);
  if (oNhap.value !== formatted) oNhap.value = formatted;
  btnXoa.hidden = formatted === "";

  if (raw === "") {
    anDi(oLoi);
    anDi(khuKetQua);
    hienDung(khuTrong);
    return;
  }

  const soDeDoi = (amCheck.checked ? "-" : "") + raw;
  const kq = Logic.convertNumber(soDeDoi);

  if (!kq.ok) {
    anDi(khuKetQua);
    anDi(khuTrong);
    oLoi.textContent = kq.error === "qua_lon"
      ? `Số quá lớn, tối đa ${kq.toiDa} chữ số. / Number too large, max ${kq.toiDa} digits.`
      : "Chưa nhập số hợp lệ. / No valid number entered.";
    hienDung(oLoi);
    return;
  }

  anDi(oLoi);
  anDi(khuTrong);
  chuVi.textContent = kq.vi;
  chuEn.textContent = kq.en;
  hienDung(khuKetQua);
}

oNhap.addEventListener("input", tinhLai);
amCheck.addEventListener("change", tinhLai);

btnXoa.addEventListener("click", () => {
  oNhap.value = "";
  amCheck.checked = false;
  tinhLai();
  oNhap.focus();
});

// Nút "Sao chép" / "Copy" trên từng thẻ kết quả.
document.querySelectorAll(".nut-chep").forEach(btn => {
  const textGoc = btn.textContent;
  btn.addEventListener("click", async () => {
    const el = $(btn.dataset.target);
    const text = el.textContent;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Trình duyệt cũ/không HTTPS: chọn sẵn văn bản để người dùng tự Ctrl+C.
      const range = document.createRange();
      range.selectNodeContents(el);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
      try { document.execCommand("copy"); } catch {}
    }
    btn.textContent = "✓";
    btn.disabled = true;
    setTimeout(() => { btn.textContent = textGoc; btn.disabled = false; }, 1300);
  });
});

// Nút ví dụ: điền số mẫu vào ô nhập.
document.querySelectorAll(".thu[data-so]").forEach(btn => {
  btn.addEventListener("click", () => {
    oNhap.value = Logic.dinhDangKhiGo(btn.dataset.so);
    amCheck.checked = false;
    tinhLai();
    oNhap.focus();
  });
});

tinhLai();
