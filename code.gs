// Code.gs
function doGet() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Sheet1");
  var historySheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("PointsHistory");
  var data = sheet.getDataRange().getValues();
  var historyData = historySheet ? historySheet.getDataRange().getValues() : [];

  if (data.length <= 1) return ContentService.createTextOutput(JSON.stringify([])).setMimeType(ContentService.MimeType.JSON);

  var players = data.slice(1).map((row) => ({
    rank: row[0],
    name: row[1],
    points: row[2],
    achievements: row[3]
  }));

  players.forEach(player => {
    player.pointsHistory = historyData.slice(1)
      .filter(row => row[1] === player.name)
      .map(row => ({
        timestamp: row[0].toISOString(),
        points: row[2]
      }));
  });

  return ContentService.createTextOutput(JSON.stringify(players))
    .setMimeType(ContentService.MimeType.JSON);
}

function updateLeaderboard() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Sheet1");
  var data = sheet.getDataRange().getValues();

  if (data.length <= 1) return;

  var players = data.slice(1).map((row, index) => ({
    name: row[1],
    points: row[2],
    index: index + 1
  }));

  players.sort((a, b) => b.points - a.points);

  var rankIcons = ["🥇", "🥈", "🥉"];
  var sortedData = players.map((player, rank) => [
    (rank < 3 ? rankIcons[rank] : "⭐") + " " + (rank + 1),
    player.name,
    player.points,
    getAchievement(player.points)
  ]);

  sheet.getRange(2, 1, sortedData.length, 4).setValues(sortedData);
  SpreadsheetApp.getActiveSpreadsheet().toast("Leaderboard Updated & Sorted! ✅");
}

function getAchievement(points) {
  if (points >= 5000) return "Master Coder 🏆";
  if (points >= 3000) return "Advanced Coder 🚀";
  if (points >= 300) return "Beginner Coder 👨‍💻";
  return "Newbie 🔰";
}

function addPoints(name, points) {
  var historySheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("PointsHistory");
  if (!historySheet) {
    historySheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet("PointsHistory");
    historySheet.appendRow(["Timestamp", "Name", "PointsAdded"]);
  }

  historySheet.appendRow([new Date(), name, points]);

  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Sheet1");
  var data = sheet.getDataRange().getValues();
  var found = false;

  for (var i = 1; i < data.length; i++) {
    if (data[i][1] === name) {
      data[i][2] += points;
      found = true;
      break;
    }
  }

  if (!found) {
    sheet.appendRow(["⭐ " + data.length, name, points, getAchievement(points)]);
  } else {
    sheet.getRange(2, 1, data.length - 1, 4).setValues(data.slice(1));
  }

  updateLeaderboard();
}

function onEdit(e) {
  var sheet = e.source.getActiveSheet();
  if (sheet.getName() !== "Sheet1") return;

  var range = e.range;
  var row = range.getRow();
  var col = range.getColumn();

  var name = sheet.getRange(row, 2).getValue(); // Column B (Name)
  var pointCell = sheet.getRange(row, 3); // Column C (Points)
  var historySheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("PointsHistory");

  if (!historySheet) {
    historySheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet("PointsHistory");
    historySheet.appendRow(["Timestamp", "Name", "PointsAdded"]);
  }

  // If New Point column is edited (Column E = 5)
  if (col === 5 && row >= 2) {
    var newPoints = parseFloat(range.getValue());
    if (isNaN(newPoints) || newPoints === 0) return;

    var currentPoints = parseFloat(pointCell.getValue());
    pointCell.setValue(currentPoints + newPoints);
    range.setValue(""); // Clear new point after adding

    // Log to history
    historySheet.appendRow([new Date(), name, newPoints]);
    updateLeaderboard();
    return;
  }

  // If Points column (Column C = 3) is manually edited
  if (col === 3 && row >= 2) {
    var oldValue = e.oldValue === undefined ? 0 : parseFloat(e.oldValue);
    var newValue = parseFloat(range.getValue());
    var pointsChange = newValue - oldValue;
    if (pointsChange === 0) return;

    historySheet.appendRow([new Date(), name, pointsChange]);
    updateLeaderboard();
  }
}
