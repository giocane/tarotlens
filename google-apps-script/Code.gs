// TAROTLENS — reçoit les commandes (panier.js) et les inscriptions "prévenez-moi du
// retour en stock" (index.html), et les ajoute au Google Sheet. À coller dans
// Extensions > Apps Script du Sheet cible, puis déployer en Web App
// (Exécuter en tant que : Moi — Accès : Tous). Voir le README à côté de ce fichier.

function doPost(e) {
    var lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
        var data = JSON.parse(e.postData.contents);
        var ss = SpreadsheetApp.getActiveSpreadsheet();

        if (data.type === 'stock_interest') {
            var stockSheet = ss.getSheetByName('Intérêts stock') || ss.getActiveSheet();
            stockSheet.appendRow([
                new Date(),
                data.email || '',
                data.product || '',
                data.lang || '',
            ]);
        } else {
            var orderSheet = ss.getSheetByName('Commandes') || ss.getActiveSheet();
            var itemsSummary = (data.items || [])
                .map(function (it) { return it.name + ' x' + it.qty; })
                .join(', ');

            orderSheet.appendRow([
                new Date(),
                data.name || '',
                data.email || '',
                data.phone || '',
                data.address || '',
                itemsSummary,
                data.subtotal || '',
                data.lang || '',
            ]);
        }

        return ContentService
            .createTextOutput(JSON.stringify({ ok: true }))
            .setMimeType(ContentService.MimeType.JSON);
    } catch (err) {
        return ContentService
            .createTextOutput(JSON.stringify({ ok: false, error: String(err) }))
            .setMimeType(ContentService.MimeType.JSON);
    } finally {
        lock.releaseLock();
    }
}
