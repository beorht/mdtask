const { createApp } = require('./src/server');

const app = createApp();
const PORT = process.env.PORT || 42521;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
