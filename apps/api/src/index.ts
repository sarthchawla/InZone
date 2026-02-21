import { app } from './app.js';

// API_PORT is used for worktree setups with unique ports; falls back to PORT for compatibility
const PORT = parseInt(process.env.API_PORT || process.env.PORT || '3001', 10);

app.listen(PORT, () => {
  console.log(`InZone API running on http://localhost:${PORT}`);
});
