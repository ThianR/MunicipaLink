import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import ExcelJS from 'exceljs';
import { Logger } from '../utils/logger.js';

/**
 * Servicio centralizado para la generación de reportes exportables.
 */
export const ReportingService = {

    /**
     * Exporta datos a PDF.
     */
    async exportToPDF({ title, subtitle, columns, data, filename = 'reporte.pdf' }) {
        try {
            const doc = new jsPDF();
            const pageWidth = doc.internal.pageSize.width;

            // Estilos "Premium"
            doc.setFont("helvetica", "bold");
            doc.setFontSize(22);
            doc.setTextColor(15, 118, 110); // Emerald-700
            doc.text(title.toUpperCase(), 14, 22);

            doc.setFont("helvetica", "normal");
            doc.setFontSize(10);
            doc.setTextColor(100, 116, 139); // Slate-500
            doc.text(subtitle, 14, 30);

            doc.setDrawColor(226, 232, 240); // Slate-200
            doc.line(14, 35, pageWidth - 14, 35);

            // Tabla autogenerada - Usando la función importada directamente para evitar errores de plugin
            autoTable(doc, {
                startY: 40,
                head: [columns],
                body: data,
                theme: 'striped',
                headStyles: {
                    fillColor: [30, 41, 59], // Slate-800
                    textColor: [255, 255, 255],
                    fontSize: 10,
                    fontStyle: 'bold',
                    halign: 'center'
                },
                bodyStyles: {
                    fontSize: 9,
                    textColor: [51, 65, 85] // Slate-700
                },
                alternateRowStyles: {
                    fillColor: [248, 250, 252] // Slate-50
                },
                margin: { top: 40 },
                didDrawPage: (data) => {
                    const str = "Página " + doc.internal.getNumberOfPages();
                    doc.setFontSize(8);
                    doc.setTextColor(150);
                    doc.text(str, pageWidth - 25, doc.internal.pageSize.height - 10);
                    doc.text("Generado por MunicipaLink - " + new Date().toLocaleDateString(), 14, doc.internal.pageSize.height - 10);
                }
            });

            doc.save(filename);
            return true;
        } catch (error) {
            Logger.error('Error al generar PDF:', error);
            throw error;
        }
    },

    /**
     * Exporta datos a Excel con formato.
     * @param {Object} options
     * @param {string} options.sheetName - Nombre de la hoja
     * @param {Array} options.columns - Definición de columnas {header, key, width}
     * @param {Array} options.data - Filas de datos
     * @param {string} options.filename - Nombre del archivo
     */
    async exportToExcel({ sheetName, columns, data, filename = 'reporte.xlsx' }) {
        try {
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet(sheetName);

            worksheet.columns = columns;

            // Formatear cabecera
            const headerRow = worksheet.getRow(1);
            headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            headerRow.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FF1E293B' } // Slate-800
            };
            headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

            // Añadir datos
            worksheet.addRows(data);

            // Auto-filtros
            worksheet.autoFilter = {
                from: { row: 1, column: 1 },
                to: { row: 1, column: columns.length }
            };

            // Bordes y estilo de celdas
            worksheet.eachRow((row, rowNumber) => {
                row.eachCell((cell) => {
                    cell.border = {
                        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                        right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
                    };
                });
            });

            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.click();
            window.URL.revokeObjectURL(url);

            return true;
        } catch (error) {
            Logger.error('Error al generar Excel:', error);
            throw error;
        }
    }
};
