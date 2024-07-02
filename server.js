const express = require('express');
const bodyParser = require('body-parser');
const connectDB = require('./db/database');
const User = require('./models/user');
const nodemailer = require('nodemailer');
const cron = require('cron');

// Load environment variables
require('dotenv').config();

const app = express();

connectDB();

app.use(bodyParser.json());

app.get('/', (req, res) => {
  res.send('Birthday Reminder App');
});

app.post('/users', async (req, res) => {
  const { username, email, dateOfBirth } = req.body;

  try {
    const user = new User({
      username,
      email,
      dateOfBirth,
    });

    await user.save();
    res.status(201).send(user);
  } catch (err) {
    res.status(400).send(err.message);
  }
});

// Cron job to check birthdays at 7am daily
const job = new cron.CronJob('0 7 * * *', async () => {
  const today = new Date();
  const month = today.getMonth();
  const day = today.getDate();

  const users = await User.find({
    $expr: {
      $and: [
        { $eq: [{ $month: '$dateOfBirth' }, month + 1] },
        { $eq: [{ $dayOfMonth: '$dateOfBirth' }, day] },
      ],
    },
  });

  users.forEach(user => {
    sendBirthdayEmail(user);
  });
});

job.start();

const sendBirthdayEmail = (user) => {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL,
      pass: process.env.EMAIL_PASSWORD,
    },
  });

  const mailOptions = {
    from: process.env.EMAIL,
    to: user.email,
    subject: 'Happy Birthday!',
    text: `Dear ${user.username},\n\nWishing you a very Happy Birthday!\n\nBest regards,\nYour Company`,
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      return console.log(error);
    }
    console.log('Email sent: ' + info.response);
  });
};

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

