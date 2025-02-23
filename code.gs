function updateLeaderboard() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var data = sheet.getDataRange().getValues();

  if (data.length <= 1) return; // No data to process

  // Extract students data (Ignore header row)
  var players = data.slice(1).map((row, index) => ({
    name: row[1],
    points: row[2],
    index: index + 1 // Row index for updating
  }));

  // Sort players by points (Descending Order)
  players.sort((a, b) => b.points - a.points);

  // Rank Icons 🏆
  var rankIcons = ["🥇", "🥈", "🥉"];

  // Reorder rows based on new rank
  var sortedData = players.map((player, rank) => [
    (rank < 3 ? rankIcons[rank] : "⭐") + " " + (rank + 1), // Rank with Icon
    player.name,
    player.points,
    getAchievement(player.points) // Assign Achievements
  ]);

  // Update Google Sheets with new sorted data
  sheet.getRange(2, 1, sortedData.length, 4).setValues(sortedData);

  SpreadsheetApp.getActiveSpreadsheet().toast("Leaderboard Updated & Sorted! ✅");
}

// Function to assign Achievements
function getAchievement(points) {
  if (points >= 200) return "Master Coder 🏆";
  if (points >= 100) return "Advanced Coder 🚀";
  if (points >= 50) return "Beginner Coder 👨‍💻";
  return "Newbie 🔰";
}
