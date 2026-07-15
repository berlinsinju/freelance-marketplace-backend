const Notification = require('../models/Notification');

const createNotification = async ({ user, type, message, link = '' }) => {
  try {
    await Notification.create({ user, type, message, link });
  } catch (err) {
    console.error('Failed to create notification:', err.message);
  }
};

module.exports = createNotification;
