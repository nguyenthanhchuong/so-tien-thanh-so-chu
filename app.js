// Giao diện: chỉ lo hiển thị và bắt sự kiện. Toàn bộ phép đổi số và tính
// VAT nằm trong logic.js để test độc lập được (xem test.html).
const $ = id => document.getElementById(id);

const oNhap = $("so-input");
const btnXoa = $("btn-xoa");
const amCheck = $("am-check");
const oLoi = $("o-loi");
const khuKetQua = $("khu-ket-qua");
const khuTrong = $("khu-trong");
const khuVatDieuKhien = $("khu-vat-dieu-khien");
const vatGhiChu = $("vat-ghi-chu");
const tyLeInput = $("ty-le-input");

function hienDung(el) { el.hidden = false; }
function anDi(el) { el.hidden = true; }

// ===== Trạng thái điều khiển VAT =====
let cheDoVat = "truoc"; // "truoc" | "sau"

document.querySelectorAll("#che-do-vat .chip").forEach(btn => {
  btn.addEventListener("click", () => {
    cheDoVat = btn.dataset.cheDo;
    document.querySelectorAll("#che-do-vat .chip").forEach(b => b.classList.toggle("on", b === btn));
    tinhLai();
  });
});

document.querySelectorAll("#ty-le-vat .chip").forEach(btn => {
  btn.addEventListener("click", () => {
    tyLeInput.value = btn.dataset.tyLe;
    document.querySelectorAll("#ty-le-vat .chip").forEach(b => b.classList.remove("on"));
    btn.classList.add("on");
    tinhLai();
  });
});

tyLeInput.addEventListener("input", () => {
  // Gõ tay một mức không trùng chip nào thì bỏ trạng thái "đang chọn" của
  // mọi chip, tránh hiện một mức không đúng với số đang gõ.
  const khop = Array.from(document.querySelectorAll("#ty-le-vat .chip"))
    .find(b => b.dataset.tyLe === tyLeInput.value.trim());
  document.querySelectorAll("#ty-le-vat .chip").forEach(b => b.classList.toggle("on", b === khop));
  tinhLai();
});

// ===== Dựng bảng kết quả (số + chữ, hai ngôn ngữ) =====
// rows: mảng { nhan, viSo, viChu, enSo, enChu }
function dungBang(rows) {
  const dauHang = `
    <div class="bang-hang bang-dau">
      <div class="bang-nhan"></div>
      <div class="bang-o">
        <span class="co">🇻🇳</span> Tiếng Việt
        <button type="button" class="nut-chep" data-ngon-ngu="vi">Sao chép</button>
      </div>
      <div class="bang-o">
        <span class="co">🇬🇧</span> English
        <button type="button" class="nut-chep" data-ngon-ngu="en">Copy</button>
      </div>
    </div>`;

  const cacHang = rows.map(r => `
    <div class="bang-hang" data-nhan-thuong="${r.nhanThuong || ""}">
      <div class="bang-nhan">${r.nhan}${r.laSoNhap ? '<span class="dau-nhap">số bạn nhập</span>' : ""}</div>
      <div class="bang-o"><div class="bang-so">${r.viSo}</div><div class="bang-chu">${r.viChu}</div></div>
      <div class="bang-o"><div class="bang-so">${r.enSo}</div><div class="bang-chu">${r.enChu}</div></div>
    </div>`).join("");

  khuKetQua.innerHTML = dauHang + cacHang;
  khuKetQua.dataset.rows = JSON.stringify(rows);
}

// Nút "Sao chép" / "Copy" — gắn một lần bằng cách uỷ quyền sự kiện lên
// khuKetQua, vì nội dung bảng bị vẽ lại mỗi lần tính (querySelectorAll một
// lần lúc nạp trang sẽ không bắt được các nút sinh ra sau đó).
khuKetQua.addEventListener("click", async e => {
  const btn = e.target.closest(".nut-chep");
  if (!btn) return;

  const ngonNgu = btn.dataset.ngonNgu;
  let rows = [];
  try { rows = JSON.parse(khuKetQua.dataset.rows || "[]"); } catch {}
  const text = rows.map(r => {
    const nhanThuong = r.nhanThuong || r.nhan;
    const so = ngonNgu === "vi" ? r.viSo : r.enSo;
    const chu = ngonNgu === "vi" ? r.viChu : r.enChu;
    return `${nhanThuong}: ${so} — ${chu}`;
  }).join("\n");

  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand("copy"); } catch {}
    document.body.removeChild(ta);
  }

  const textGoc = ngonNgu === "vi" ? "Sao chép" : "Copy";
  btn.textContent = "✓";
  btn.disabled = true;
  setTimeout(() => { btn.textContent = textGoc; btn.disabled = false; }, 1300);
});

// ===== Tính toán chính =====
// Ô nhập LUÔN chỉ hiển thị chữ số dương (đã định dạng dấu chấm) — dấu âm do
// công tắc riêng quyết định, không gõ trực tiếp vào ô số. Bàn phím số trên
// điện thoại (inputmode="numeric") thường không có phím trừ; tách ra một
// công tắc là cách chắc chắn hoạt động mọi nơi.
function tinhLai() {
  const raw = Logic.chiLayChuSo(oNhap.value);
  const formatted = Logic.dinhDangKhiGo(raw);
  if (oNhap.value !== formatted) oNhap.value = formatted;
  btnXoa.hidden = formatted === "";

  const laAm = amCheck.checked && raw !== "0" && raw !== "";

  if (raw === "") {
    anDi(oLoi);
    anDi(khuKetQua);
    hienDung(khuTrong);
    anDi(vatGhiChu);
    return;
  }

  const soDeDoi = (laAm ? "-" : "") + raw;
  const kq = Logic.convertNumber(soDeDoi);

  if (!kq.ok) {
    anDi(khuKetQua);
    anDi(khuTrong);
    anDi(vatGhiChu);
    oLoi.textContent = kq.error === "qua_lon"
      ? `Số quá lớn, tối đa ${kq.toiDa} chữ số. / Number too large, max ${kq.toiDa} digits.`
      : "Chưa nhập số hợp lệ. / No valid number entered.";
    hienDung(oLoi);
    return;
  }

  anDi(oLoi);
  anDi(khuTrong);

  // VAT chỉ có ý nghĩa với số dương, trong vùng Number tính chính xác được.
  // Số âm hoặc quá lớn thì chỉ hiện một dòng đọc chữ đơn thuần, không có VAT.
  const tyLe = Number(tyLeInput.value);
  const vatKq = !laAm && Number.isFinite(tyLe)
    ? Logic.tinhVAT(raw, tyLe, cheDoVat)
    : { ok: false };

  if (!vatKq.ok) {
    vatGhiChu.textContent = laAm
      ? "Số âm không tính VAT — chỉ hiện cách đọc bằng chữ."
      : `Số quá lớn để tính VAT chính xác (tối đa ${Logic.NGUONG_AN_TOAN_VAT} chữ số) — chỉ hiện cách đọc bằng chữ.`;
    hienDung(vatGhiChu);

    dungBang([{
      nhan: "Giá trị / Value",
      nhanThuong: "Giá trị",
      viSo: Logic.dinhDangVoiDau(soDeDoi, "."),
      viChu: kq.vi,
      enSo: Logic.dinhDangVoiDau(soDeDoi, ","),
      enChu: kq.en
    }]);
    hienDung(khuKetQua);
    return;
  }

  anDi(vatGhiChu);

  const doiChu = n => Logic.convertNumber(n);
  const gocChu = doiChu(vatKq.goc);
  const vatChu = doiChu(vatKq.vat);
  const tongChu = doiChu(vatKq.tong);
  const tyLeHienThi = Number.isInteger(tyLe) ? tyLe : tyLe.toFixed(1).replace(/\.0$/, "");

  dungBang([
    {
      nhan: "Giá trước thuế / Before VAT",
      nhanThuong: "Giá trước thuế",
      laSoNhap: cheDoVat === "truoc",
      viSo: Logic.dinhDangVoiDau(vatKq.goc, "."), viChu: gocChu.vi,
      enSo: Logic.dinhDangVoiDau(vatKq.goc, ","), enChu: gocChu.en
    },
    {
      nhan: `Tiền thuế VAT (${tyLeHienThi}%) / VAT amount (${tyLeHienThi}%)`,
      nhanThuong: `Tiền thuế VAT (${tyLeHienThi}%)`,
      viSo: Logic.dinhDangVoiDau(vatKq.vat, "."), viChu: vatChu.vi,
      enSo: Logic.dinhDangVoiDau(vatKq.vat, ","), enChu: vatChu.en
    },
    {
      nhan: "Giá sau thuế / After VAT",
      nhanThuong: "Giá sau thuế",
      laSoNhap: cheDoVat === "sau",
      viSo: Logic.dinhDangVoiDau(vatKq.tong, "."), viChu: tongChu.vi,
      enSo: Logic.dinhDangVoiDau(vatKq.tong, ","), enChu: tongChu.en
    }
  ]);
  hienDung(khuKetQua);
}

oNhap.addEventListener("input", tinhLai);
amCheck.addEventListener("change", () => {
  // Số âm và VAT không đi cùng nhau — ẩn bộ điều khiển VAT cho khỏi rối,
  // vẫn tính lại để hiện đúng ghi chú giải thích vì sao.
  khuVatDieuKhien.style.opacity = amCheck.checked ? "0.4" : "1";
  khuVatDieuKhien.style.pointerEvents = amCheck.checked ? "none" : "auto";
  tinhLai();
});

btnXoa.addEventListener("click", () => {
  oNhap.value = "";
  amCheck.checked = false;
  khuVatDieuKhien.style.opacity = "1";
  khuVatDieuKhien.style.pointerEvents = "auto";
  tinhLai();
  oNhap.focus();
});

// Nút ví dụ: điền số mẫu vào ô nhập.
document.querySelectorAll(".thu[data-so]").forEach(btn => {
  btn.addEventListener("click", () => {
    oNhap.value = Logic.dinhDangKhiGo(btn.dataset.so);
    amCheck.checked = false;
    khuVatDieuKhien.style.opacity = "1";
    khuVatDieuKhien.style.pointerEvents = "auto";
    tinhLai();
    oNhap.focus();
  });
});

tinhLai();
