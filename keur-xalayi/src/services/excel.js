'use strict';

// Export Excel générique : une feuille avec en-tête coloré et colonnes ajustées.
const ExcelJS = require('exceljs');

/**
 * @param {string} titre
 * @param {Array<{titre, cle, largeur?, format?}>} colonnes  format : 'montant' | 'date'
 * @param {Array<object>} lignes
 */
async function classeur(titre, colonnes, lignes, { ecole = 'Keur Xalayi', devise = '' } = {}) {
  const wb = new ExcelJS.Workbook();
  wb.creator = ecole;
  const ws = wb.addWorksheet(titre.slice(0, 31).replace(/[\\/?*[\]:]/g, '-'));
  ws.addRow([`${ecole} — ${titre}`]).font = { bold: true, size: 14, color: { argb: 'FF1F5F6B' } };
  ws.addRow([`Exporté le ${new Date().toLocaleDateString('fr-FR')}`]).font = { italic: true, color: { argb: 'FF6B6B6B' } };
  ws.addRow([]);
  const entete = ws.addRow(colonnes.map((c) => c.titre));
  entete.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9632B' } };
    cell.alignment = { vertical: 'middle' };
  });
  for (const l of lignes) {
    ws.addRow(colonnes.map((c) => {
      const v = l[c.cle];
      if (c.format === 'date' && v) return new Date(`${String(v).slice(0, 10)}T12:00:00`);
      return v ?? '';
    }));
  }
  colonnes.forEach((c, i) => {
    const col = ws.getColumn(i + 1);
    col.width = c.largeurXl || Math.max(10, Math.min(45, (c.titre.length + 4), ...lignes.slice(0, 200).map((l) => String(l[c.cle] ?? '').length + 2)));
    if (c.format === 'montant') col.numFmt = `#,##0${devise ? ` "${devise}"` : ''}`;
    if (c.format === 'date') col.numFmt = 'dd/mm/yyyy';
  });
  ws.views = [{ state: 'frozen', ySplit: 4 }];
  ws.autoFilter = { from: { row: 4, column: 1 }, to: { row: 4, column: colonnes.length } };
  return wb.xlsx.writeBuffer();
}

module.exports = { classeur };
