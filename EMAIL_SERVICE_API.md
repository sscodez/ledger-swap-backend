# LedgerSwap Email Service API

## Overview

The Email Service API provides comprehensive email management capabilities for the LedgerSwap platform. It includes health monitoring, configuration management, test email sending, and command execution features.

## Base URL

```
http://localhost:8080/api/email-service
```

## Authentication

All endpoints require **Admin JWT authentication**:

```bash
Authorization: Bearer <admin_jwt_token>
```

## Endpoints

### 1. Health Check

**GET** `/api/email-service/health`

Check the email service health and SMTP connection status.

#### Response Example:
```json
{
  "success": true,
  "status": "healthy",
  "configuration": {
    "host": "smtp.titan.email",
    "port": 587,
    "user": "ad***@ledgerswap.io",
    "configured": true
  },
  "connection": {
    "status": "connected",
    "error": null
  },
  "mode": "smtp",
  "timestamp": "2024-11-20T02:02:33.000Z"
}
```

#### Connection Status Values:
- `connected` - SMTP connection successful
- `failed` - SMTP connection failed
- `not_configured` - SMTP not configured
- `unknown` - Status unknown

---

### 2. Get Configuration

**GET** `/api/email-service/config`

Retrieve email service configuration and available email types.

#### Response Example:
```json
{
  "success": true,
  "configuration": {
    "host": "smtp.titan.email",
    "port": 587,
    "user": "ad***@ledgerswap.io",
    "secure": false,
    "configured": true,
    "mode": "smtp"
  },
  "availableEmailTypes": [
    "test",
    "password_reset",
    "email_verification",
    "welcome",
    "support"
  ],
  "timestamp": "2024-11-20T02:02:33.000Z"
}
```

---

### 3. Send Test Email

**POST** `/api/email-service/test`

Send various types of test emails.

#### Request Body:
```json
{
  "to": "test@example.com",
  "type": "test",
  "subject": "Custom Test Subject (optional)",
  "message": "Custom test message (optional)"
}
```

#### Email Types:
- `test` - Generic test email
- `password_reset` - Password reset email with code
- `email_verification` - Email verification email
- `welcome` - Welcome email
- `support` - Support notification email

#### Response Example:
```json
{
  "success": true,
  "message": "Test Email sent successfully",
  "details": {
    "to": "test@example.com",
    "type": "test",
    "emailType": "Test Email",
    "timestamp": "2024-11-20T02:02:33.000Z"
  }
}
```

---

### 4. Execute Commands

**POST** `/api/email-service/execute`

Execute various email service commands.

#### Available Commands:

##### Health Check Command
```json
{
  "command": "health_check"
}
```

##### Verify Connection Command
```json
{
  "command": "verify_connection"
}
```

##### Bulk Test Email Command
```json
{
  "command": "send_bulk_test",
  "parameters": {
    "recipients": ["user1@example.com", "user2@example.com"],
    "emailType": "test"
  }
}
```

#### Response Examples:

**Verify Connection:**
```json
{
  "success": true,
  "result": {
    "command": "verify_connection",
    "status": "success",
    "message": "SMTP connection verified successfully"
  },
  "timestamp": "2024-11-20T02:02:33.000Z"
}
```

**Bulk Test:**
```json
{
  "success": true,
  "result": {
    "command": "send_bulk_test",
    "totalRecipients": 2,
    "successful": 2,
    "failed": 0,
    "results": [
      {
        "recipient": "user1@example.com",
        "success": true,
        "timestamp": "2024-11-20T02:02:33.000Z"
      },
      {
        "recipient": "user2@example.com",
        "success": true,
        "timestamp": "2024-11-20T02:02:33.000Z"
      }
    ]
  },
  "timestamp": "2024-11-20T02:02:33.000Z"
}
```

## Email Service Configuration

The email service uses the following SMTP configuration:

```typescript
const smtpConfig = {
  host: 'smtp.titan.email',
  port: 587,
  user: 'admin@ledgerswap.io',
  pass: 'Matrix$345',
  secure: false
};
```

### Mock Mode

When SMTP is not configured, the service runs in **mock mode**:
- All emails are logged to console instead of being sent
- API responses indicate `"mode": "mock"`
- Useful for development and testing

## Testing Tools

### 1. Basic API Test
```bash
node test-email-api.js
```

### 2. Mock Mode Test
```bash
node test-email-mock.js
```

### 3. Interactive CLI Tool
```bash
node email-service-cli.js
```

## cURL Examples

### Health Check
```bash
curl -X GET "http://localhost:8080/api/email-service/health" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Send Test Email
```bash
curl -X POST "http://localhost:8080/api/email-service/test" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "test@example.com",
    "type": "test",
    "subject": "API Test Email",
    "message": "This is a test email from the API"
  }'
```

### Verify Connection
```bash
curl -X POST "http://localhost:8080/api/email-service/execute" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "command": "verify_connection"
  }'
```

## Error Responses

### Authentication Error (401)
```json
{
  "message": "Not authorized, token failed"
}
```

### Validation Error (400)
```json
{
  "success": false,
  "error": "Recipient email address is required"
}
```

### Server Error (500)
```json
{
  "success": false,
  "error": "Failed to send test email",
  "timestamp": "2024-11-20T02:02:33.000Z"
}
```

## Integration with LedgerSwap

The Email Service API integrates with:

- **User Authentication**: Password reset emails
- **Account Verification**: Email verification emails  
- **Welcome Flow**: Welcome emails after verification
- **Admin Support**: Support notification emails
- **System Monitoring**: Health checks and diagnostics

## Swagger Documentation

Complete API documentation is available at:
```
http://localhost:8080/api-docs
```

## Security Features

- **Admin-only access** - Requires admin JWT token
- **Rate limiting** - Prevents spam and abuse
- **Input validation** - Validates email addresses and parameters
- **Error handling** - Graceful error responses
- **Mock mode fallback** - Works without SMTP configuration

## Monitoring

The API provides comprehensive monitoring through:

- Health check endpoint for service status
- Connection verification for SMTP status
- Configuration endpoint for setup validation
- Detailed error logging and responses

## Production Deployment

For production deployment:

1. Ensure SMTP credentials are properly configured
2. Set up proper JWT authentication
3. Configure rate limiting
4. Monitor health check endpoint
5. Set up logging and alerting

## Support

For issues or questions about the Email Service API:

- Check the health endpoint for service status
- Review logs for detailed error information
- Use the CLI tool for interactive testing
- Consult the Swagger documentation for complete API reference
