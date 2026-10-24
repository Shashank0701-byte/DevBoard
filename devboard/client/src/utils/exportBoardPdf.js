import { jsPDF } from "jspdf";

const COLUMNS = [
  { id: "backlog", label: "Backlog", color: [113, 113, 122] },
  { id: "inprogress", label: "In Progress", color: [37, 99, 235] },
  { id: "review", label: "In Review", color: [217, 119, 6] },
  { id: "done", label: "Completed", color: [5, 150, 105] },
];

const MARGIN = 40;

const pdfText = (value) =>
  String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[^\x20-\x7E\u00A0-\u00FF]/g, "");

const taskMeta = (task) => {
  const priority = task.priority ? pdfText(task.priority) : "";
  const tags = Array.isArray(task.tags)
    ? task.tags.map((tag) => pdfText(tag)).filter(Boolean)
    : [];
  return [
    priority ? priority[0].toUpperCase() + priority.slice(1) : "",
    tags.map((tag) => `#${tag}`).join("  "),
  ]
    .filter(Boolean)
    .join("    ");
};

/**
 * Build a one-column board export. Standard columns stay in board order.
 * Tasks on any other status are listed after them so nothing is dropped.
 */
export const buildBoardPdf = (tasks, { sprintName } = {}) => {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const contentWidth = pageWidth - MARGIN * 2;
  let y = MARGIN;

  const ensureSpace = (needed) => {
    if (y + needed <= pageHeight - MARGIN) return;
    doc.addPage();
    y = MARGIN;
  };

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(24, 24, 27);
  doc.text("DevBoard", MARGIN, y);
  y += 16;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(82, 82, 91);
  const generated = `Generated ${new Date().toLocaleString()}`;
  const sprint = pdfText(sprintName);
  doc.text(sprint ? `${generated}    ${sprint}` : generated, MARGIN, y);
  y += 14;

  doc.setDrawColor(228, 228, 231);
  doc.line(MARGIN, y, pageWidth - MARGIN, y);
  y += 22;

  const known = new Set(COLUMNS.map((column) => column.id));
  const extraIds = [...new Set(tasks.map((task) => task.status).filter((status) => status && !known.has(status)))];
  const sections = [
    ...COLUMNS,
    ...extraIds.map((id) => ({
      id,
      label: pdfText(id) || "Other",
      color: [82, 82, 91],
    })),
  ];

  sections.forEach((column) => {
    const columnTasks = tasks.filter((task) => task.status === column.id);
    ensureSpace(28);
    doc.setFillColor(...column.color);
    doc.rect(MARGIN, y - 10, 3, 14, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...column.color);
    doc.text(column.label.toUpperCase(), MARGIN + 10, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(113, 113, 122);
    doc.text(`${columnTasks.length}`, pageWidth - MARGIN, y, { align: "right" });
    y += 16;

    if (columnTasks.length === 0) {
      doc.setFontSize(9);
      doc.setTextColor(161, 161, 170);
      doc.text("No tasks", MARGIN + 10, y);
      y += 20;
      return;
    }

    columnTasks.forEach((task) => {
      const title = pdfText(task.title) || "Untitled";
      const meta = taskMeta(task);
      doc.setFontSize(10);
      const titleLines = doc.splitTextToSize(title, contentWidth - 16);
      const blockHeight = titleLines.length * 13 + (meta ? 12 : 0) + 8;
      ensureSpace(blockHeight);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(24, 24, 27);
      doc.text(titleLines, MARGIN + 10, y);
      y += titleLines.length * 13;

      if (meta) {
        doc.setFontSize(8);
        doc.setTextColor(113, 113, 122);
        const metaLines = doc.splitTextToSize(meta, contentWidth - 16);
        doc.text(metaLines, MARGIN + 10, y);
        y += metaLines.length * 11;
      }
      y += 8;
    });

    y += 8;
  });

  const pageCount = doc.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(161, 161, 170);
    doc.text(`DevBoard    ${page} / ${pageCount}`, pageWidth / 2, pageHeight - 24, {
      align: "center",
    });
  }

  return doc;
};

export const exportBoardPdf = (tasks, options) => {
  const doc = buildBoardPdf(tasks, options);
  const stamp = new Date().toISOString().slice(0, 10);
  doc.save(`devboard-export-${stamp}.pdf`);
};
