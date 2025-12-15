<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Temporary Password</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: Arial, sans-serif;">
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <tr>
            <td style="padding: 40px 30px;">
                <h1 style="margin: 0 0 20px; color: #333333; font-size: 24px; font-weight: 600; text-align: center;">Your Temporary Password</h1>
                <p style="margin: 0 0 20px; color: #555555; font-size: 16px; line-height: 1.5;">Hello {{name}},</p>
                <p style="margin: 0 0 20px; color: #555555; font-size: 16px; line-height: 1.5;">Thank you for registering. Your temporary password is:</p>
                
                <div style="margin: 30px 0; padding: 15px; background-color: #f9f9f9; border-radius: 4px; text-align: center; border: 1px solid #eeeeee;">
                    <p style="margin: 0; font-family: monospace; font-size: 24px; letter-spacing: 3px; color: #333333; font-weight: 600;">{{password}}</p>
                </div>
                
                <p style="margin: 30px 0 0; color: #555555; font-size: 16px; line-height: 1.5; text-align: center;">We recommend changing it after your first login for security purposes.</p>
                
                <div style="text-align: center; margin: 30px 0;">
                    <a href="{{loginUrl}}" style="display: inline-block; padding: 12px 24px; background-color: #a3a3a3; color: #ffffff; text-decoration: none; font-weight: 500; border-radius: 4px; font-size: 16px;">Sign In</a>
                </div>
            </td>
        </tr>
        <tr>
            <td style="padding: 20px 30px; background-color: #f9f9f9; border-bottom-left-radius: 8px; border-bottom-right-radius: 8px; text-align: center;">
                <p style="margin: 0; color: #999999; font-size: 14px;">© 2025 Your Company. All rights reserved.</p>
            </td>
        </tr>
    </table>
</body>
</html>
