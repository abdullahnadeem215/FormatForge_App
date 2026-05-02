package com.maahhha.formatforge;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.apache.poi.xwpf.usermodel.*;
import org.apache.poi.util.Units;

import com.lowagie.text.*;
import com.lowagie.text.Font;
import com.lowagie.text.Image;
import com.lowagie.text.pdf.*;

import java.io.*;
import java.util.List;

@CapacitorPlugin(name = "DocxToPdf")
public class DocxToPdfPlugin extends Plugin {

    @PluginMethod
    public void convert(PluginCall call) {
        String inputPath  = call.getString("inputPath");
        String outputPath = call.getString("outputPath");

        if (inputPath == null || outputPath == null) {
            call.reject("inputPath and outputPath are required");
            return;
        }

        new Thread(() -> {
            try {
                convertDocxToPdf(inputPath, outputPath);
                JSObject result = new JSObject();
                result.put("outputPath", outputPath);
                call.resolve(result);
            } catch (Exception e) {
                call.reject("Conversion failed: " + e.getMessage());
            }
        }).start();
    }

    private void convertDocxToPdf(String inputPath, String outputPath) throws Exception {
        FileInputStream fis      = new FileInputStream(inputPath);
        XWPFDocument    document = new XWPFDocument(fis);

        Document   pdfDoc = new Document(PageSize.A4, 72, 72, 72, 72);
        PdfWriter.getInstance(pdfDoc, new FileOutputStream(outputPath));
        pdfDoc.open();

        BaseFont baseFont  = BaseFont.createFont(BaseFont.HELVETICA,       BaseFont.CP1252, BaseFont.NOT_EMBEDDED);
        BaseFont boldFont  = BaseFont.createFont(BaseFont.HELVETICA_BOLD,  BaseFont.CP1252, BaseFont.NOT_EMBEDDED);

        for (IBodyElement element : document.getBodyElements()) {
            if (element instanceof XWPFParagraph) {
                processParagraph((XWPFParagraph) element, pdfDoc, baseFont, boldFont);
            } else if (element instanceof XWPFTable) {
                processTable((XWPFTable) element, pdfDoc, baseFont, boldFont);
            }
        }

        pdfDoc.close();
        document.close();
        fis.close();
    }

    private void processParagraph(XWPFParagraph para, Document pdfDoc,
                                   BaseFont baseFont, BaseFont boldFont) throws Exception {
        // ── Images inside runs ──────────────────────────────────────────────
        for (XWPFRun run : para.getRuns()) {
            for (XWPFPicture pic : run.getEmbeddedPictures()) {
                try {
                    byte[] imgData = pic.getPictureData().getData();
                    Image img = Image.getInstance(imgData);
                    float maxW = PageSize.A4.getWidth()  - 144;
                    float maxH = PageSize.A4.getHeight() - 144;
                    if (img.getWidth() > maxW || img.getHeight() > maxH) {
                        img.scaleToFit(maxW, maxH);
                    }
                    img.setAlignment(Image.ALIGN_CENTER);
                    pdfDoc.add(img);
                } catch (Exception ignored) {}
            }
        }

        String text = para.getText();
        if (text == null || text.trim().isEmpty()) {
            pdfDoc.add(new Paragraph(" "));
            return;
        }

        // ── Style / heading detection ───────────────────────────────────────
        String  style    = para.getStyle();
        float   fontSize = 11f;
        boolean isBold   = false;
        int     pdfAlign = Element.ALIGN_LEFT;

        if (style != null) {
            String s = style.toLowerCase();
            if (s.contains("title"))    { fontSize = 24f; isBold = true; }
            else if (s.contains("heading1") || s.equals("h1")) { fontSize = 20f; isBold = true; }
            else if (s.contains("heading2") || s.equals("h2")) { fontSize = 16f; isBold = true; }
            else if (s.contains("heading3") || s.equals("h3")) { fontSize = 14f; isBold = true; }
            else if (s.contains("heading4") || s.equals("h4")) { fontSize = 12f; isBold = true; }
        }

        // Run-level bold override
        if (!para.getRuns().isEmpty() && Boolean.TRUE.equals(para.getRuns().get(0).isBold())) {
            isBold = true;
        }

        // Alignment
        if (para.getAlignment() != null) {
            switch (para.getAlignment()) {
                case CENTER: pdfAlign = Element.ALIGN_CENTER;    break;
                case RIGHT:  pdfAlign = Element.ALIGN_RIGHT;     break;
                case BOTH:   pdfAlign = Element.ALIGN_JUSTIFIED; break;
                default:     pdfAlign = Element.ALIGN_LEFT;      break;
            }
        }

        BaseFont chosenFont = isBold ? boldFont : baseFont;
        Font     font       = new Font(chosenFont, fontSize, Font.NORMAL);

        // List bullet / numbering
        String prefix = "";
        if (para.getNumILvl() != null) {
            int level = para.getNumILvl().intValue();
            prefix = "  ".repeat(level) + "• ";
        }

        Paragraph pdfPara = new Paragraph(prefix + text, font);
        pdfPara.setAlignment(pdfAlign);
        pdfPara.setSpacingAfter(4f);
        pdfPara.setSpacingBefore(2f);

        // Indent for lists
        if (!prefix.isEmpty()) {
            pdfPara.setIndentationLeft(12f);
        }

        pdfDoc.add(pdfPara);
    }

    private void processTable(XWPFTable table, Document pdfDoc,
                               BaseFont baseFont, BaseFont boldFont) throws Exception {
        if (table.getRows().isEmpty()) return;

        int numCols = 0;
        for (XWPFTableRow row : table.getRows()) {
            numCols = Math.max(numCols, row.getTableCells().size());
        }
        if (numCols == 0) return;

        PdfPTable pdfTable = new PdfPTable(numCols);
        pdfTable.setWidthPercentage(100);
        pdfTable.setSpacingBefore(8f);
        pdfTable.setSpacingAfter(8f);

        boolean isFirstRow = true;
        for (XWPFTableRow row : table.getRows()) {
            List<XWPFTableCell> cells = row.getTableCells();
            for (int i = 0; i < numCols; i++) {
                String cellText = i < cells.size() ? cells.get(i).getText() : "";
                Font   font     = isFirstRow
                    ? new Font(boldFont, 10f)
                    : new Font(baseFont, 10f);
                PdfPCell pdfCell = new PdfPCell(new Phrase(cellText, font));
                pdfCell.setPadding(6f);
                if (isFirstRow) {
                    pdfCell.setBackgroundColor(new java.awt.Color(230, 230, 230));
                }
                pdfTable.addCell(pdfCell);
            }
            isFirstRow = false;
        }

        pdfDoc.add(pdfTable);
    }
}
