function doGet() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var data = sheet.getDataRange().getValues();

  if (data.length <= 1) return ContentService.createTextOutput("No data");

  var players = data.slice(1).map((row) => ({
    rank: row[0], 
    name: row[1],
    points: row[2],
    achievements: row[3]
  }));

  return ContentService.createTextOutput(JSON.stringify(players))
    .setMimeType(ContentService.MimeType.JSON);
}
