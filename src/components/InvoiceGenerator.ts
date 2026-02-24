import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { AppSettings } from "../types";

interface InvoiceData {
  parentName: string;
  fCode: string;
  issuedOn: string;
  dueDate: string;
  students: Array<{
    name: string;
    grade: string;
    month: string;
    amount: number;
    regularFee: number;
    discountedFee: number;
    finalFee: number;
    quantity: number;
    pricingType: string;
  }>;
  registrationEntries?: Array<{
    name: string;
    fullFee: number;
    discount: number;
    netFee: number;
  }>;
  totalAmount: number;
  programDiscountAmount: number;
  customDiscountAmount: number;
  enrollmentDiscountAmount: number;
  fixedDiscountAmount: number;
  finalAmount: number;
  settings: AppSettings;
  currency: string;
  exchangeRate: number;
}


const HEADER_URL = "/templates/Header.jpg";
const SCAN_URL = "/templates/Scan to pay.jpg";
const STAMP_URL = "/templates/Stamp and signature.jpg";

const NAVY: [number, number, number] = [41, 58, 128];
const DARK_BLUE: [number, number, number] = [25, 40, 100];
const FOOTER_H = 17;
const PAGE_W = 210;
const PAGE_H = 297;
const CONTENT_BOTTOM_SAFE = FOOTER_H + 8;

async function urlToDataUrl(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load: ${url}`);
  const blob = await res.blob();
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function detectImgFormat(dataUrl: string): "PNG" | "JPEG" {
  return dataUrl.startsWith("data:image/png") ? "PNG" : "JPEG";
}

async function getImageSize(dataUrl: string): Promise<{ w: number; h: number }> {
  return await new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ w: img.naturalWidth || 1, h: img.naturalHeight || 1 });
    img.onerror = reject;
    img.src = dataUrl;
  });
}

function fitBox(srcW: number, srcH: number, boxW: number, boxH: number) {
  const srcRatio = srcW / srcH;
  const boxRatio = boxW / boxH;
  if (srcRatio > boxRatio) {
    return { w: boxW, h: boxW / srcRatio };
  } else {
    return { w: boxH * srcRatio, h: boxH };
  }
}

async function addHeader(doc: jsPDF) {
  const headerImg = await urlToDataUrl(HEADER_URL);
  const { w, h } = await getImageSize(headerImg);
  const drawW = PAGE_W;
  const drawH = drawW * (h / w);
  doc.addImage(headerImg, detectImgFormat(headerImg), 0, 0, drawW, drawH);
  return drawH;
}

function drawFooter(doc: jsPDF, settings: AppSettings) {
  const footerY = PAGE_H - FOOTER_H;
  doc.setFillColor(NAVY[0], NAVY[1], NAVY[2]);
  doc.rect(0, footerY, PAGE_W, FOOTER_H, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`${settings.phone || "+92 305 5245551"}`, 18, footerY + 10);
  doc.text(`${settings.email || "acivs2021@gmail.com"}`, PAGE_W / 2, footerY + 10, { align: "center" });
  doc.text(`${settings.website || "iqravirtualschool.com"}`, PAGE_W - 18, footerY + 10, { align: "right" });
}

function ensureSpace(doc: jsPDF, y: number, need: number) {
  if (y + need > PAGE_H - CONTENT_BOTTOM_SAFE) {
    doc.addPage();
    return 15;
  }
  return y;
}

function drawHR(doc: jsPDF, y: number, x1 = 15, x2 = 195) {
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.2);
  doc.line(x1, y, x2, y);
}

export const generateInvoicePDF = async (data: InvoiceData) => {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const { settings } = data;

  // ===== Page 1 Header =====
  let y = 15;
  try {
    const headerH = await addHeader(doc);
    y = headerH + 6;
  } catch (e) {
    console.error("Header load failed", e);
    y = 20;
  }

  // ===== Title =====
  doc.setFont("helvetica", "bolditalic");
  doc.setFontSize(26);
  doc.setTextColor(DARK_BLUE[0], DARK_BLUE[1], DARK_BLUE[2]);
  doc.text("FEE INVOICE", 105, y, { align: "center" });
  y += 9;

  const formatN = (num: number) => {
    const rate = data.exchangeRate || 1;
    return (num * rate).toFixed(2);
  };

  const formatC = (num: number) => {
    return `${data.currency} ${formatN(num)}`;
  };

  // ===== Info Fields =====
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);

  doc.setFont("helvetica", "bold");
  doc.text("Parent's Name :", 20, y);
  doc.setFont("helvetica", "normal");
  doc.text(String(data.parentName || ""), 56, y);

  doc.setFont("helvetica", "bold");
  doc.text("Issued on:", 133, y);
  doc.setFont("helvetica", "normal");
  doc.text(String(data.issuedOn || ""), 156, y);

  y += 8;

  doc.setFont("helvetica", "bold");
  doc.text("F.Code:", 20, y);
  doc.setFont("helvetica", "normal");
  doc.text(String(data.fCode || ""), 40, y);

  doc.setFont("helvetica", "bold");
  doc.text("Due Date:", 133, y);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(200, 0, 0);
  doc.text(String(data.dueDate || ""), 156, y);
  doc.setTextColor(0, 0, 0);

  y += 8;

  doc.setFont("helvetica", "bold");
  doc.text("Currency:", 20, y);
  doc.setFont("helvetica", "normal");
  doc.text(`${data.currency} (1 SAR = ${data.exchangeRate.toFixed(4)} ${data.currency})`, 40, y);

  y += 12;

  // ===== Fee Table =====
  // COLUMN WIDTHS — total usable = 180mm (margins 15+15)
  // Col 0 Reg No:       9mm   (always "N/A")
  // Col 1 Description:  48mm  (description text)
  // Col 2 Grade:        34mm  (needs to fit "Regular Schooling - FS1 to FS3")
  // Col 3 Regular Fee:  21mm
  // Col 4 After Disc:   19mm
  // Col 5 Month:        22mm  (needs to fit "February 2026" on one line)
  // Col 6 Amount:       27mm  (fits "PKR 36488.78" + SAR line)
  // Total: 9+48+34+21+19+22+27 = 180 ✓

  const tableHead = [
    [
      { content: "Reg\nNo", styles: { halign: "left" as const } },
      { content: "Description", styles: { halign: "left" as const } },
      { content: "Grade", styles: { halign: "left" as const } },
      { content: `Regular Fee\n(${data.currency})`, styles: { halign: "right" as const } },
      { content: `After Disc.\n(${data.currency})`, styles: { halign: "right" as const } },
      { content: "Month", styles: { halign: "center" as const } },
      { content: `Amount\n(${data.currency})`, styles: { halign: "right" as const } },
    ],
  ];

  const rows: any[] = [];

  for (const s of data.students) {
    const qtyTxt = s.quantity > 1 ? ` (x${s.quantity})` : "";
    const normalFee = Number(s.regularFee || 0);
    const finalFee = Number(s.finalFee || 0);
    const pricingSuffix =
      s.pricingType === "subject"
        ? "\n(Fee per subject)"
        : s.pricingType === "days"
          ? "\n(Fee per day/plan)"
          : "";

    rows.push([
      "N/A",
      `Monthly Fee - ${s.name}${qtyTxt}${pricingSuffix}`,
      s.grade,
      formatN(normalFee),
      Math.abs(finalFee - normalFee) > 0.01 ? formatN(finalFee) : "-",
      s.month,
      formatN(finalFee),
    ]);
  }

  if (data.registrationEntries && data.registrationEntries.length > 0) {
    for (const reg of data.registrationEntries) {
      const discountTxt = reg.discount > 0 ? `\n(${reg.discount}% off)` : "";
      rows.push([
        "N/A",
        `Registration Fee - ${reg.name}${discountTxt}`,
        "",
        formatN(reg.fullFee),
        reg.discount > 0 ? formatN(reg.netFee) : "-",
        "",
        formatN(reg.netFee),
      ]);
    }
  }

  const normalTotal =
    data.students.reduce((sum, s) => sum + Number(s.regularFee || 0), 0) +
    (data.registrationEntries || []).reduce((sum, r) => sum + r.fullFee, 0);

  if (data.programDiscountAmount > 0) {
    rows.push(["", "Program Discount", "", "", "", "", `-${formatC(data.programDiscountAmount)}`]);
  }
  if (data.customDiscountAmount > 0) {
    rows.push(["", "Individual Discounts", "", "", "", "", `-${formatC(data.customDiscountAmount)}`]);
  }
  if (data.enrollmentDiscountAmount > 0) {
    rows.push([
      "",
      "Enrollment Discount\n(Sibling + Multi-Program)",
      "",
      "",
      "",
      "",
      `-${formatC(data.enrollmentDiscountAmount)}`,
    ]);
  }
  if (data.fixedDiscountAmount > 0) {
    rows.push(["", "Fixed Discount", "", "", "", "", `-${formatC(data.fixedDiscountAmount)}`]);
  }

  const totalSavings = normalTotal - data.finalAmount;
  const savingsPercent = normalTotal > 0 ? (totalSavings / normalTotal) * 100 : 0;
  const hasDiscount = totalSavings > 0.01;

  if (hasDiscount) {
    // Split SAR conversion onto a new line for readability
    const savingsBase = `-${formatC(totalSavings)}`;
    const savingsExtra = data.currency !== "SAR" ? `\n(-${totalSavings.toFixed(2)} SAR)` : "";
    const savingsTxt = `${savingsBase}${savingsExtra}`;

    rows.push([
      {
        content: `Total Savings (${savingsPercent.toFixed(1)}% of regular fee)`,
        colSpan: 6,
        styles: { fontStyle: "bold", textColor: [0, 120, 60], halign: "left" },
      },
      {
        content: savingsTxt,
        styles: { fontStyle: "bold", textColor: [0, 120, 60], halign: "right" },
      },
    ]);

    rows.push([
      {
        content: "Total (Without Discount)",
        colSpan: 6,
        styles: { fontStyle: "bold", halign: "left" },
      },
      { content: formatC(normalTotal), styles: { fontStyle: "bold", halign: "right" } },
    ]);
  }

  // Total Payable — split SAR conversion to next line
  const totalPayableBase = formatC(data.finalAmount);
  const totalPayableExtra =
    data.currency !== "SAR" ? `\n(${data.finalAmount.toFixed(2)} SAR)` : "";
  const totalPayableTxt = `${totalPayableBase}${totalPayableExtra}`;

  rows.push([
    {
      content: hasDiscount ? "Total Payable (After Discount)" : "Total Payable",
      colSpan: 6,
      styles: { fontStyle: "bold", fontSize: 9, halign: "left" },
    },
    {
      content: totalPayableTxt,
      styles: { fontStyle: "bold", fontSize: 9, halign: "right" },
    },
  ]);

  autoTable(doc, {
    startY: y,
    margin: { left: 15, right: 15, top: 15, bottom: CONTENT_BOTTOM_SAFE },
    theme: "plain",
    head: tableHead,
    body: rows,

    headStyles: {
      fillColor: NAVY,
      textColor: [255, 255, 255],
      fontStyle: "bolditalic",
      fontSize: 7.5,
      cellPadding: { top: 3, right: 2.5, bottom: 3, left: 2.5 },
      halign: "left",
      valign: "middle",
      minCellHeight: 12,
    },

    styles: {
      font: "helvetica",
      fontSize: 8,                          // ← reduced from 8.5 → 8 for less crowding
      cellPadding: { top: 3.5, right: 2.5, bottom: 3.5, left: 2.5 },  // ← more breathing room
      lineWidth: 0,
      textColor: [0, 0, 0],
      valign: "middle",
      overflow: "linebreak",
    },

    columnStyles: {
      0: { cellWidth: 9, halign: "left" },   // Reg No  (always "N/A")
      1: { cellWidth: 48, halign: "left" },   // Description
      2: { cellWidth: 34, halign: "left" },   // Grade — wide enough for "Regular Schooling - FS1 to FS3"
      3: { cellWidth: 21, halign: "right" },  // Regular Fee
      4: { cellWidth: 19, halign: "right" },  // After Discount
      5: { cellWidth: 22, halign: "center" }, // Month — wide enough for "February 2026"
      6: { cellWidth: 27, halign: "right" },  // Amount
    },

    pageBreak: "auto",
    rowPageBreak: "auto",

    didParseCell: (hook) => {
      // Subtle zebra
      if (hook.section === "body" && hook.row.index % 2 === 1) {
        hook.cell.styles.fillColor = [245, 247, 252];
      }

      // Total Payable row — highlighted background
      if (hook.section === "body" && hook.row.index === rows.length - 1) {
        hook.cell.styles.fontStyle = "bold";
        hook.cell.styles.fillColor = [235, 238, 248];
        hook.cell.styles.lineWidth = { top: 0.6, bottom: 0, left: 0, right: 0 };
        hook.cell.styles.lineColor = NAVY;
      }

      // Discount rows in green
      if (hook.section === "body") {
        const cellContent = typeof hook.cell.raw === "string" ? hook.cell.raw : "";
        if (cellContent.startsWith("-")) {
          hook.cell.styles.textColor = [0, 120, 60];
          hook.cell.styles.fontStyle = "bold";
        }
      }

      // After Discount column — highlight when reduced
      if (hook.section === "body" && hook.column.index === 4) {
        const regFeeArr = hook.row.cells[3].text;
        const aftDiscArr = hook.cell.text;
        const regFee = Array.isArray(regFeeArr) ? regFeeArr.join("") : regFeeArr;
        const aftDisc = Array.isArray(aftDiscArr) ? aftDiscArr.join("") : aftDiscArr;

        if (aftDisc !== "-" && regFee !== aftDisc) {
          hook.cell.styles.textColor = [0, 80, 180];
          hook.cell.styles.fontStyle = "bold";
        }
      }
    },
  });

  y = (doc as any).lastAutoTable?.finalY ?? (y + 50);
  y += 10;

  // ===== Payment Information =====
  y = ensureSpace(doc, y, 65);

  doc.setFillColor(NAVY[0], NAVY[1], NAVY[2]);
  doc.rect(15, y, 180, 9, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Payment Information", 105, y + 6.5, { align: "center" });
  y += 14;

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(7.8);

  const col1X = 15;
  const col2X = 80;
  const col3X = 150;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("Account Title: IQRA VIRTUALSOLUTIONS", col1X, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  const col1Lines = [
    "Account IBAN#: PK71MEZN0007810111367793",
    "(for International Transfers)",
    "Account No #: 07810111367793 (for Local",
    "Transfers)",
    "Branch Code: 0781",
    "Bank Address: Meezan Bank Peshawar (Khyber",
    "Bazar Branch)",
    "Contact# +92 335 524 5551",
  ];
  let lineY = y + 4;
  for (const line of col1Lines) {
    doc.text(line, col1X, lineY);
    lineY += 3.2;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("IVSGLOBAL", col2X, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  const col2Lines = [
    "Account Title: Ivs Global",
    "Bank Name: Mashreq Bank",
    "IBAN: AE620330000019101455931",
    "Account Number: 019101455931",
    "Mobile number +971528838128",
    "Beneficiary Address:",
    "Ajman Industrial Area 2, Ajman, UAE",
  ];
  lineY = y + 4;
  for (const line of col2Lines) {
    doc.text(line, col2X, lineY);
    lineY += 3.2;
  }

  try {
    const scanImg = await urlToDataUrl(SCAN_URL);
    const { w, h } = await getImageSize(scanImg);
    const scanH = 28;
    const scanW = scanH * (w / h);
    doc.addImage(scanImg, detectImgFormat(scanImg), col3X, y - 1, scanW, scanH);
  } catch (e) {
    console.error("Scan image failed", e);
  }

  y += 32;

  // ===== Instructions + Stamp/Signature =====
  y = ensureSpace(doc, y, 80);

  doc.setFont("helvetica", "bolditalic");
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  doc.text("Instructions:", 15, y);
  y += 6;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);

  const instrItems = [
    {
      tick: true,
      text: "This is a reminder from the Accounts Department of Iqra Virtual School. To ensure accurate verification of your fee payment, we kindly request you to fill out the fee receipt submission form:",
    },
    {
      tick: false,
      text: "   https://forms.gle/W4y3Q1VjyU8cRDvp7",
    },
    {
      tick: true,
      text: "Kindly fill out all the required information in the provided link accurately.",
    },
    {
      tick: true,
      text: "If you do not receive the paid slip from the school within 72 hours, kindly contact the Accounts Department.",
    },
    {
      tick: true,
      text: "Please note that if the fee payment was initially rejected by the bank and subsequently refunded, it will not be considered as paid.",
    },
    {
      tick: false,
      text: "For any queries, feel free to contact the Accounts Department.",
    },
  ];

  const instrStartY = y;
  const instrMaxW = 105;

  for (const item of instrItems) {
    if (item.tick) {
      doc.setTextColor(0, 120, 0);
      doc.setFont("helvetica", "bold");
      doc.text("✓", 17, y);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(0, 0, 0);
    }

    const wrapped = doc.splitTextToSize(item.text, instrMaxW);
    doc.text(wrapped, 22, y);
    y += wrapped.length * 3.5 + 1.5;
  }

  try {
    const stampImg = await urlToDataUrl(STAMP_URL);
    const fmt = detectImgFormat(stampImg);
    const stampW = 52;
    const stampH = 55;
    const stampX = 145;
    const instrHeight = y - instrStartY;
    const stampY = instrStartY + Math.max(0, (instrHeight - stampH) / 2);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(DARK_BLUE[0], DARK_BLUE[1], DARK_BLUE[2]);
    doc.text("Account Manager IVS", stampX + stampW / 2, stampY - 3, { align: "center" });
    doc.addImage(stampImg, fmt, stampX, stampY, stampW, stampH);
  } catch (e) {
    console.error("Stamp/signature failed", e);
  }

  // ===== Footer on EVERY page =====
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    drawFooter(doc, settings);
  }

  doc.save(`Invoice_${String(data.parentName || "Parent").replace(/\s+/g, "_")}.pdf`);
};
