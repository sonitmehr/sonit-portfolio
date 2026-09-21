try {
  const res = await fetch('http://localhost:5174/api/steam/games');
  const data = await res.json();
  console.log('SUCCESS on localhost! Games returned:', data.count);
  console.log('Top game:', data.games[0]?.title, '-', data.games[0]?.playtimeHours, 'hours');
} catch (e) {
  console.error('Failed on localhost:', e.message);
  try {
    const res2 = await fetch('http://[::1]:5174/api/steam/games');
    const data2 = await res2.json();
    console.log('SUCCESS on [::1]! Games returned:', data2.count);
  } catch (e2) {
    console.error('Failed on [::1]:', e2.message);
  }
}
