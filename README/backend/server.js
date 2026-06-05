const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const users = [
  {
    id: 'user-1',
    name: 'TravelMate User',
    email: 'admin@travelmate.ai',
    password: 'Test1234',
    role: 'admin'
  }
];

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;

  // Log the incoming attempt (avoid logging raw passwords in real apps)
  console.log(`[auth] login attempt for: ${email}`);

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }

  const user = users.find((item) => item.email === email && item.password === password);

  if (!user) {
    return res.status(401).json({ message: 'Invalid email or password.' });
  }

  return res.json({
    accessToken: 'fake-jwt-token',
    refreshToken: 'fake-refresh-token',
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    }
  });
});

const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`Auth API running on http://localhost:${port}`);
});
