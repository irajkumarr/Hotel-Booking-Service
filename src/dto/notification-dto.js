/**
 * Notification DTO
 * @param {Object} options
 * @param {string} options.to - Email address of the recipient
 * @param {string} options.subject - Subject of the email
 * @param {string} options.templateId - ID of the email template to use
 * @param {Object} options.params - Parameters to replace in the template
 * @returns {Object} Notification DTO
 */
function NotificationDto({ to, subject, templateId, params }) {
  return {
    to,
    subject,
    templateId,
    params,
  };
}

module.exports = { NotificationDto };
