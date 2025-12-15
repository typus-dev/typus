<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>New Contact Form Submission</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: Arial, sans-serif;">
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 700px; margin: 40px auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <tr>
            <td style="padding: 40px 30px;">
                <h1 style="margin: 0 0 20px; color: #d32f2f; font-size: 24px; font-weight: 600; text-align: center;">
                    🚨 New Contact Form Submission
                </h1>
                
                <div style="margin: 20px 0; padding: 20px; background-color: #fff3cd; border-left: 4px solid #ffc107; border-radius: 4px;">
                    <p style="margin: 0; color: #856404; font-size: 16px; font-weight: 500;">
                        ⚡ A new inquiry has been received through your website contact form and requires your attention.
                    </p>
                </div>

                <h2 style="margin: 30px 0 15px; color: #333333; font-size: 20px; font-weight: 600; border-bottom: 2px solid #e0e0e0; padding-bottom: 10px;">
                    📋 Contact Information
                </h2>
                
                <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 25px;">
                    <tr>
                        <td style="padding: 8px 0; width: 120px; color: #666666; font-size: 14px; font-weight: 500;">Name:</td>
                        <td style="padding: 8px 0; color: #333333; font-size: 15px; font-weight: 600;">{{contactName}}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; width: 120px; color: #666666; font-size: 14px; font-weight: 500;">Email:</td>
                        <td style="padding: 8px 0; color: #333333; font-size: 15px;">
                            <a href="mailto:{{contactEmail}}" style="color: #1976d2; text-decoration: none;">{{contactEmail}}</a>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; width: 120px; color: #666666; font-size: 14px; font-weight: 500;">Phone:</td>
                        <td style="padding: 8px 0; color: #333333; font-size: 15px;">
                            <a href="tel:{{contactPhone}}" style="color: #1976d2; text-decoration: none;">{{contactPhone}}</a>
                        </td>
                    </tr>
                </table>

                <h2 style="margin: 30px 0 15px; color: #333333; font-size: 20px; font-weight: 600; border-bottom: 2px solid #e0e0e0; padding-bottom: 10px;">
                    💬 Message Details
                </h2>

                <div style="margin-bottom: 15px;">
                    <strong style="color: #666666; font-size: 14px; font-weight: 500;">Subject:</strong>
                    <p style="margin: 5px 0 0; color: #333333; font-size: 16px; font-weight: 600;">{{subject}}</p>
                </div>

                <div style="margin-bottom: 25px;">
                    <strong style="color: #666666; font-size: 14px; font-weight: 500;">Message:</strong>
                    <div style="margin: 10px 0; padding: 20px; background-color: #f8f9fa; border-left: 4px solid #007bff; border-radius: 4px; font-family: monospace; white-space: pre-wrap; color: #333333; font-size: 14px; line-height: 1.6;">{{message}}</div>
                </div>

                <h2 style="margin: 30px 0 15px; color: #333333; font-size: 20px; font-weight: 600; border-bottom: 2px solid #e0e0e0; padding-bottom: 10px;">
                    🔗 System Information
                </h2>

                <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 30px;">
                    <tr>
                        <td style="padding: 8px 0; width: 150px; color: #666666; font-size: 14px; font-weight: 500;">Contact ID:</td>
                        <td style="padding: 8px 0; color: #333333; font-size: 15px; font-family: monospace;">{{contactId}}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; width: 150px; color: #666666; font-size: 14px; font-weight: 500;">Conversation ID:</td>
                        <td style="padding: 8px 0; color: #333333; font-size: 15px; font-family: monospace;">{{conversationId}}</td>
                    </tr>
                </table>

                <div style="text-align: center; margin: 40px 0;">
                    <a href="{{crmUrl}}" style="display: inline-block; padding: 15px 30px; background-color: #28a745; color: #ffffff; text-decoration: none; font-weight: 600; border-radius: 5px; font-size: 16px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                        🎯 Open CRM System
                    </a>
                </div>

                <div style="margin: 30px 0; padding: 20px; background-color: #e8f4fd; border-left: 4px solid #2196f3; border-radius: 4px;">
                    <p style="margin: 0; color: #1565c0; font-size: 14px; line-height: 1.5;">
                        <strong>Next Steps:</strong><br>
                        • Log in to the CRM system to view the full conversation<br>
                        • Respond to the customer inquiry promptly<br>
                        • Update the conversation status as needed
                    </p>
                </div>
            </td>
        </tr>
        <tr>
            <td style="padding: 20px 30px; background-color: #f9f9f9; border-bottom-left-radius: 8px; border-bottom-right-radius: 8px; text-align: center;">
                <p style="margin: 0; color: #999999; font-size: 14px;">
                    This is an automated notification from your CRM system.<br>
                    © 2025 Your Company. All rights reserved.
                </p>
            </td>
        </tr>
    </table>
</body>
</html>
