function doGet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("Sheet1");
  const historySheet = ss.getSheetByName("PointsHistory");

  const data = sheet.getDataRange().getValues();
  const historyData = historySheet ? historySheet.getDataRange().getValues() : [];

  if (data.length <= 1) {
    return ContentService.createTextOutput(JSON.stringify([])).setMimeType(ContentService.MimeType.JSON);
  }

  const players = data.slice(1).map(row => ({
    rank: row[0],
    name: row[1],
    points: row[2],
    achievements: row[3],
    averages: row[5] ? Math.floor(parseFloat(row[5])) : 0,
    maxPoint: row[6] || 0,
    pointsHistory: []
  }));

  players.forEach(player => {
    player.pointsHistory = historyData.slice(1)
      .filter(row => row[1] === player.name)
      .map(row => ({
        timestamp: new Date(row[0]).toISOString(),
        points: row[2]
      }));
  });

  return ContentService.createTextOutput(JSON.stringify(players))
    .setMimeType(ContentService.MimeType.JSON);
}

function updateLeaderboard() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("Sheet1");
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return;

  const players = data.slice(1).map((row, index) => ({
    name: row[1],
    points: parseFloat(row[2]) || 0,
    maxPoint: parseFloat(row[6]) || 0,
    index: index + 1
  }));

  players.sort((a, b) => b.points - a.points);

  const rankIcons = ["🥇", "🥈", "🥉"];
  const sortedData = players.map((player, rank) => [
    (rank < 3 ? rankIcons[rank] : "⭐") + " " + (rank + 1),
    player.name,
    player.points,
    getAchievement(player.points),
    "", // New Point Add (Column E)
    player.maxPoint ? Math.floor(player.points / player.maxPoint * 100) : 0, // Averages (Column F)
    player.maxPoint, // Max Point (Column G)
  ]);

  // Set headers
  sheet.getRange(1, 1, 1, 8).setValues([["Rank", "Name", "Point", "Achievements", "New Point Add", "Averages", "Max Point", "Add Daily Point"]]);
  // Set player data
  sheet.getRange(2, 1, sortedData.length, 7).setValues(sortedData);
  sheet.getRange(2, 8, sortedData.length, 1).clearContent(); // Clear 'Add Daily Point' column
  sheet.getRange("F:F").setNumberFormat("0"); // Format averages column

  SpreadsheetApp.getActiveSpreadsheet().toast("Leaderboard Updated & Sorted! ✅");
}

function getAchievement(points) {
  if (points >= 5000) return "Master Coder 🏆";
  if (points >= 3000) return "Advanced Coder 🚀";
  if (points >= 300) return "Beginner Coder 👨‍💻";
  return "Newbie 🔰";
}

function addPoints(name, points) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("Sheet1");
  let historySheet = ss.getSheetByName("PointsHistory");
  if (!historySheet) {
    historySheet = ss.insertSheet("PointsHistory");
    historySheet.appendRow(["Timestamp", "Name", "PointsAdded"]);
  }

  historySheet.appendRow([new Date(), name, points]);

  const data = sheet.getDataRange().getValues();
  let found = false;

  for (let i = 1; i < data.length; i++) {
    if (data[i][1] === name) {
      data[i][2] = (parseFloat(data[i][2]) || 0) + points;
      found = true;
      break;
    }
  }

  if (!found) {
    sheet.appendRow(["⭐ " + data.length, name, points, getAchievement(points), "", 100, points]);
  } else {
    sheet.getRange(2, 1, data.length - 1, 7).setValues(data.slice(1));
  }

  updateLeaderboard();
}

function onEdit(e) {
  const sheet = e.source.getActiveSheet();
  if (sheet.getName() !== "Sheet1") return;

  const range = e.range;
  const row = range.getRow();
  const col = range.getColumn();

  if (row < 2) return;

  const name = sheet.getRange(row, 2).getValue();
  const pointCell = sheet.getRange(row, 3);
  const maxPointCell = sheet.getRange(row, 7);
  let historySheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("PointsHistory");

  // Add Daily Point (Column H)
  if (col === 8) {
    const dailyPoints = parseFloat(range.getValue());
    if (isNaN(dailyPoints) || dailyPoints === 0) {
      range.setValue("");
      return;
    }

    const currentMaxPoint = parseFloat(maxPointCell.getValue()) || 340;
    maxPointCell.setValue(currentMaxPoint + dailyPoints);
    range.setValue("");
    updateLeaderboard();
    return;
  }

  // New Point Add (Column E)
  if (col === 5) {
    const newPoints = parseFloat(range.getValue());
    if (isNaN(newPoints) || newPoints === 0) {
      range.setValue("");
      return;
    }

    const currentPoints = parseFloat(pointCell.getValue()) || 0;
    pointCell.setValue(currentPoints + newPoints);
    range.setValue("");

    if (!historySheet) {
      historySheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet("PointsHistory");
      historySheet.appendRow(["Timestamp", "Name", "PointsAdded"]);
    }
    historySheet.appendRow([new Date(), name, newPoints]);
    updateLeaderboard();
    return;
  }

  // Manual Point Change (Column C)
  if (col === 3) {
    const oldValue = e.oldValue === undefined ? 0 : parseFloat(e.oldValue);
    const newValue = parseFloat(range.getValue());
    if (isNaN(newValue) || newValue === oldValue) return;

    const pointsChange = newValue - oldValue;

    if (!historySheet) {
      historySheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet("PointsHistory");
      historySheet.appendRow(["Timestamp", "Name", "PointsAdded"]);
    }
    historySheet.appendRow([new Date(), name, pointsChange]);
    updateLeaderboard();
  }
}
