const { AppError } = require('../middlewares/errorHandler');

const getMyNotifications = async (req, res, next) => {
  const { query } = require('../../db'); // Adjust path to your db.js if needed
  try {
    // req.user.id comes from your authenticate middleware
    const userId = req.user.id; 
    
    const sql = `
      SELECT notifications_id, type, title, body, is_read, created_at 
      FROM notifications 
      WHERE user_id = $1 
      ORDER BY created_at DESC 
      LIMIT 50;
    `;
    
    const result = await query(sql, [userId]);
    
    res.status(200).json({ 
      success: true, 
      notifications: result.rows 
    });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    next(error);
  }
};

const markAllAsRead = async (req, res, next) => {
  const { query } = require('../../db');
  try {
    const userId = req.user.id;
    await query('UPDATE notifications SET is_read = true WHERE user_id = $1', [userId]);
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMyNotifications,
  markAllAsRead
};