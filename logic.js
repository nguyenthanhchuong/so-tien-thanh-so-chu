// Phần tính toán thuần: không đụng tới DOM, không gọi mạng.
// Tách riêng để test được độc lập (xem test.html).
//
// QUAN TRỌNG: mọi phép toán ở đây làm việc trên CHUỖI CHỮ SỐ, không đổi qua
// Number/BigInt. JS Number chỉ chính xác tới 2^53 (~9 x 10^15, tức khoảng
// 16 chữ số) — vượt ngưỡng đó là làm tròn sai, và với một công cụ ĐỌC SỐ THÌ
// sai một chữ số là hỏng cả kết quả. Số tiền thật hoàn toàn có thể vượt mốc
// này (vài chục triệu tỷ), nên toàn bộ pipeline giữ nguyên dạng chuỗi từ đầu
// đến cuối, hỗ trợ tới 36 chữ số.
const Logic = (function () {

  const CHU_SO_VN = ["không","một","hai","ba","bốn","năm","sáu","bảy","tám","chín"];
  const CHU_SO_EN = ["zero","one","two","three","four","five","six","seven","eight","nine"];

  const MUOI_TEEN_VN = {
    10: "mười", 11: "mười một", 12: "mười hai", 13: "mười ba", 14: "mười bốn",
    15: "mười lăm", 16: "mười sáu", 17: "mười bảy", 18: "mười tám", 19: "mười chín"
  };
  const TEEN_EN = {
    10: "ten", 11: "eleven", 12: "twelve", 13: "thirteen", 14: "fourteen",
    15: "fifteen", 16: "sixteen", 17: "seventeen", 18: "eighteen", 19: "nineteen"
  };
  const CHUC_EN = {
    2: "twenty", 3: "thirty", 4: "forty", 5: "fifty",
    6: "sixty", 7: "seventy", 8: "eighty", 9: "ninety"
  };

  // Tên bậc tiếng Anh, mỗi phần tử ứng với một nhóm 3 chữ số (short scale).
  // index 0 = nhóm đơn vị (không có tên), 1 = nghìn, 2 = triệu...
  const BAC_EN = [
    "", "thousand", "million", "billion", "trillion", "quadrillion",
    "quintillion", "sextillion", "septillion", "octillion", "nonillion", "decillion"
  ];

  // Tên bậc tiếng Việt KHÔNG có danh sách cố định như tiếng Anh — nó lặp lại
  // theo chu kỳ 3 (nghìn/triệu/tỷ), rồi ghép thêm "tỷ" cho mỗi lần lặp:
  // bậc 0-3: (không tên), nghìn, triệu, tỷ
  // bậc 4-6: nghìn tỷ, triệu tỷ, tỷ tỷ
  // bậc 7-9: nghìn tỷ tỷ, triệu tỷ tỷ, tỷ tỷ tỷ  ...
  // Xem thêm ghi chú tại scaleVN().
  const BAC_GOC_VN = ["", "nghìn", "triệu"];

  const SO_CHU_SO_TOI_DA = BAC_EN.length * 3; // 36 — giới hạn chung cho cả hai ngôn ngữ

  function scaleVN(bac) {
    const goc = BAC_GOC_VN[bac % 3];
    const soLanTy = Math.floor(bac / 3);
    const phan = [];
    if (goc) phan.push(goc);
    for (let i = 0; i < soLanTy; i++) phan.push("tỷ");
    return phan.join(" ");
  }

  // Đọc một nhóm 3 chữ số (1-999; nhóm giá trị 0 phải được BỎ QUA từ trước,
  // xem convertInt) ra tiếng Việt.
  //
  // laNhomDauTien: đây có phải là nhóm KHÁC KHÔNG đầu tiên trong toàn bộ số
  // hay không (tính từ trái sang, các nhóm 000 ở giữa đã bị bỏ qua). Chi phối
  // hai chỗ dễ sai nhất của tiếng Việt:
  //   - có thêm "không trăm" hay không khi hàng trăm = 0
  //     (1.025 → "một nghìn KHÔNG TRĂM hai mươi lăm", nhưng riêng số 25 thì
  //      chỉ là "hai mươi lăm", không có "không trăm")
  //   - có thêm "linh"/"lẻ" hay không khi hàng chục = 0 mà hàng đơn vị khác 0
  //     (1.005 → "một nghìn không trăm LINH năm", nhưng riêng số 5 thì chỉ
  //      là "năm", không có "linh")
  function nhomVN(so, laNhomDauTien) {
    if (so === 0) return ""; // phòng hờ — không nên bị gọi với 0

    const tram = Math.floor(so / 100);
    const chuc = Math.floor((so % 100) / 10);
    const donVi = so % 10;
    const phan = [];

    if (tram > 0) {
      phan.push(CHU_SO_VN[tram] + " trăm");
    } else if (!laNhomDauTien) {
      phan.push("không trăm");
    }

    if (chuc === 0) {
      if (donVi > 0) {
        // Cần "linh" khi đã có ngữ cảnh phía trước (hàng trăm, hoặc đã in
        // "không trăm"); một chữ số đứng một mình thì không cần.
        const canLinh = tram > 0 || !laNhomDauTien;
        phan.push(canLinh ? "linh " + CHU_SO_VN[donVi] : CHU_SO_VN[donVi]);
      }
    } else if (chuc === 1) {
      phan.push(MUOI_TEEN_VN[10 + donVi]);
    } else {
      let tuChuc = CHU_SO_VN[chuc] + " mươi";
      if (donVi === 1) tuChuc += " mốt";
      else if (donVi === 5) tuChuc += " lăm";
      else if (donVi > 0) tuChuc += " " + CHU_SO_VN[donVi];
      phan.push(tuChuc);
    }
    return phan.join(" ");
  }

  // Đọc 1-99 ra tiếng Anh (không có "hundred").
  function duoiTramEN(n) {
    if (n < 10) return CHU_SO_EN[n];
    if (n < 20) return TEEN_EN[n];
    const chuc = Math.floor(n / 10), donVi = n % 10;
    return donVi > 0 ? CHUC_EN[chuc] + "-" + CHU_SO_EN[donVi] : CHUC_EN[chuc];
  }

  // Đọc một nhóm 3 chữ số (1-999) ra tiếng Anh. Không cần biết nhóm đầu hay
  // không — tiếng Anh không có luật "linh"/"không trăm" như tiếng Việt.
  function nhomEN(so) {
    const tram = Math.floor(so / 100);
    const duoi = so % 100;
    const phan = [];
    if (tram > 0) phan.push(CHU_SO_EN[tram] + " hundred");
    if (duoi > 0) phan.push(duoiTramEN(duoi));
    return phan.join(" ");
  }

  // Tách một chuỗi chữ số thành các nhóm 3 chữ số, nhóm đầu tiên (bên trái)
  // giữ nguyên độ dài dư ra (1 hoặc 2 chữ số) thay vì đệm 0.
  function chiaNhom(chuoiSo) {
    const nhom = [];
    let s = chuoiSo;
    while (s.length > 0) {
      const cat = s.length > 3 ? s.length - 3 : 0;
      nhom.unshift(Number(s.slice(cat)));
      s = s.slice(0, cat);
    }
    return nhom;
  }

  // Đổi một chuỗi số nguyên KHÔNG DẤU (chỉ chữ số, đã bỏ số 0 thừa ở đầu)
  // thành chữ. lang: "vi" | "en".
  function convertInt(chuoiSo, lang) {
    if (chuoiSo === "0") return lang === "vi" ? "không" : "zero";

    const nhom = chiaNhom(chuoiSo);
    const tongSoNhom = nhom.length;
    let daInGiChua = false;
    const ketQua = [];

    for (let i = 0; i < tongSoNhom; i++) {
      const gia = nhom[i];
      if (gia === 0) continue; // nhóm 000 ở giữa: bỏ qua hẳn, không nói "không nghìn"

      const bac = tongSoNhom - 1 - i; // bậc tính từ phải, 0 = nhóm đơn vị
      const laNhomDauTien = !daInGiChua;

      if (lang === "vi") {
        const chu = nhomVN(gia, laNhomDauTien);
        const ten = scaleVN(bac);
        ketQua.push(ten ? chu + " " + ten : chu);
      } else {
        const chu = nhomEN(gia);
        const ten = BAC_EN[bac];
        ketQua.push(ten ? chu + " " + ten : chu);
      }
      daInGiChua = true;
    }
    return ketQua.join(" ");
  }

  // Bỏ mọi ký tự không phải chữ số (dấu chấm/phẩy phân cách, khoảng trắng...),
  // rồi bỏ số 0 thừa ở đầu — nhưng giữ lại đúng một số 0 nếu toàn bộ là số 0.
  function chiLayChuSo(s) {
    const digits = String(s == null ? "" : s).replace(/[^0-9]/g, "");
    const boSo0Dau = digits.replace(/^0+(?=\d)/, "");
    return boSo0Dau;
  }

  // Hàm chính: chuyển một chuỗi số bất kỳ (có thể lẫn dấu chấm/phẩy phân
  // cách, có thể có dấu trừ ở đầu) thành chữ, trả về cả hai ngôn ngữ.
  //
  // Chỉ nhận SỐ NGUYÊN — không có phần thập phân. Đây là lựa chọn có chủ đích
  // (không phải thiếu sót): số tiền dùng công cụ này thường không có phần lẻ,
  // và việc quy ước dấu chấm/phẩy nào là phân cách nghìn hay phân cách thập
  // phân rất dễ mâu thuẫn giữa hai kiểu gõ Việt/Anh nếu cho phép cả hai.
  function convertNumber(raw) {
    const s = String(raw == null ? "" : raw).trim();
    const amDau = /^\s*-/.test(s);
    const digits = chiLayChuSo(s);

    if (digits === "") {
      return { ok: false, error: "empty" };
    }
    if (digits.length > SO_CHU_SO_TOI_DA) {
      return { ok: false, error: "qua_lon", toiDa: SO_CHU_SO_TOI_DA };
    }

    const laSo0 = digits === "0";
    const tienToVi = amDau && !laSo0 ? "âm " : "";
    const tienToEn = amDau && !laSo0 ? "minus " : "";

    return {
      ok: true,
      vi: tienToVi + convertInt(digits, "vi"),
      en: tienToEn + convertInt(digits, "en")
    };
  }

  // Thêm dấu phân cách nghìn vào một chuỗi chữ số, dùng dấu tuỳ chọn — thuần
  // chuỗi, không qua Number nên không giới hạn độ lớn và không có sai số làm
  // tròn. dinhDangKhiGo() bên dưới là bản mặc định (dấu chấm, dùng cho ô nhập
  // liệu); dùng hàm này trực tiếp khi cần đổi dấu (ví dụ cột tiếng Anh hiển
  // thị số theo quy ước dấu phẩy trong khi ô nhập vẫn luôn là dấu chấm).
  function dinhDangVoiDau(raw, dauPhanCach) {
    const s = String(raw == null ? "" : raw);
    const amDau = /^\s*-/.test(s);
    const digits = chiLayChuSo(s);
    if (digits === "") return amDau ? "-" : "";

    let ra = "";
    for (let i = 0; i < digits.length; i++) {
      const conLai = digits.length - i;
      ra += digits[i];
      if (conLai > 1 && (conLai - 1) % 3 === 0) ra += dauPhanCach;
    }
    return (amDau ? "-" : "") + ra;
  }

  function dinhDangKhiGo(raw) {
    return dinhDangVoiDau(raw, ".");
  }

  // ===== Tính VAT =====
  // Khác với phần đọc số ở trên, phần này TÍNH TOÁN (nhân/chia theo %) nên
  // bắt buộc phải qua Number — không thể làm thuần chuỗi. Vì vậy giới hạn số
  // chữ số CHẶT HƠN hẳn mức 36 của phần đọc số, để chắc chắn nằm trong vùng
  // Number còn chính xác tuyệt đối (2^53 ≈ 16 chữ số); không có giá tiền thật
  // nào cần vượt 15 chữ số nên đây không phải đánh đổi tính năng.
  const NGUONG_AN_TOAN_VAT = 15;

  // Tính VAT theo một trong hai chiều:
  //   "truoc" — chuoiSo là giá TRƯỚC thuế: vat = tròn(giá × tỷ lệ), tổng = giá + vat.
  //   "sau"   — chuoiSo là giá ĐÃ GỒM thuế: giá = tròn(tổng / (1 + tỷ lệ)),
  //             vat = tổng - giá (suy ra bằng phép TRỪ, không tính riêng).
  //
  // Cố ý suy ra phần còn lại bằng phép trừ thay vì làm tròn độc lập cả hai
  // phần: nếu làm tròn riêng "giá" và "vat" rồi cộng lại, tổng có thể lệch
  // 1 đồng so với số ban đầu — cùng nguyên tắc "làm tròn dồn vào phần còn lại
  // để tổng luôn khớp" đã dùng trong app sổ chi tiêu (phanBo/phanBoCuaKhoanThu).
  function tinhVAT(chuoiSo, tyLePhanTram, chieu) {
    if (!/^\d+$/.test(String(chuoiSo || ""))) {
      return { ok: false, error: "khong_hop_le" };
    }
    if (chuoiSo.length > NGUONG_AN_TOAN_VAT) {
      return { ok: false, error: "qua_lon", toiDa: NGUONG_AN_TOAN_VAT };
    }
    const r = Number(tyLePhanTram);
    if (!Number.isFinite(r)) {
      return { ok: false, error: "ty_le_khong_hop_le" };
    }

    const n = Number(chuoiSo);
    let goc, vat, tong;

    if (chieu === "sau") {
      const mauSo = 1 + r / 100;
      if (mauSo <= 0) return { ok: false, error: "ty_le_khong_hop_le" };
      tong = n;
      goc = Math.round(tong / mauSo);
      vat = tong - goc;
    } else {
      goc = n;
      vat = Math.round(goc * (r / 100));
      tong = goc + vat;
    }

    return { ok: true, goc: String(goc), vat: String(vat), tong: String(tong) };
  }

  return {
    convertNumber, convertInt, dinhDangKhiGo, dinhDangVoiDau, chiLayChuSo,
    nhomVN, nhomEN, scaleVN, chiaNhom, tinhVAT,
    SO_CHU_SO_TOI_DA, NGUONG_AN_TOAN_VAT, BAC_EN
  };
})();
