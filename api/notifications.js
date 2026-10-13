// Notification server-side delivery (prototype stub)
// Never expose service-role keys in browser.
export const sendNotification = async (userId, type, title, body) => {
  return { delivered: false, mock: true, note: 'Email delivery requires server-side SMTP/SendGrid; in-app notification saved to notifications table.' };
};
