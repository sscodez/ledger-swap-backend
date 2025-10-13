# LedgerSwap Database Seeding Guide

This guide explains how to set up your LedgerSwap database with initial data using the provided seeding scripts.

## Quick Start

To seed the entire database with all necessary data:

```bash
npm run seed
```

This will run the comprehensive seeding script that sets up:
- ✅ Admin user account
- ✅ Test user accounts  
- ✅ Cryptocurrency fees configuration
- ✅ User overview records

## Individual Seeding Scripts

You can also run individual seeding scripts as needed:

### 1. Seed Admin User
```bash
npm run seed:admin
```
Creates the default admin account for accessing the admin panel.

**Default Credentials:**
- Email: `admin@ledgerswap.dev`
- Password: `Admin@12345`

### 2. Seed Test Users
```bash
npm run seed:users
```
Creates sample user accounts for testing:
- Alice Johnson (alice@example.com)
- Bob Smith (bob@example.com)
- Carol Davis (carol@example.com)
- David Wilson (david@example.com)
- Eva Brown (eva@example.com)

**Default Password:** `User@12345`

### 3. Seed Crypto Fees
```bash
npm run seed:crypto-fees
```
Sets up fee configuration for supported cryptocurrencies:
- **BTC (Bitcoin)**: 0.5% fee
- **XDC (XDC Network)**: 0.3% fee
- **XLM (Stellar)**: 0.4% fee
- **XRP (Ripple)**: 0.4% fee
- **IOTA**: 0.2% fee

### 4. Comprehensive Seeding
```bash
npm run seed:all
```
Runs all seeding scripts in the correct order with detailed progress reporting.

## Environment Configuration

You can customize the admin user credentials using environment variables:

```bash
# .env file
DEFAULT_ADMIN_EMAIL=your-admin@company.com
DEFAULT_ADMIN_PASSWORD=YourSecurePassword123!
DEFAULT_ADMIN_NAME=Your Admin Name
```

## Database Requirements

Make sure your MongoDB connection is properly configured in your `.env` file:

```bash
MONGODB_URI=mongodb://localhost:27017/ledgerswap
# or for MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/ledgerswap
```

## What Gets Created

After running the seeding scripts, your database will contain:

### Users Collection
- 1 Admin user (configurable via environment variables)
- 5 Test users with different names and emails
- All users have hashed passwords and proper role assignments

### CryptoFees Collection
- Fee configurations for all supported cryptocurrencies
- Percentage fees, minimum/maximum limits
- Active status flags for enabling/disabling currencies

### Overview Collection
- User overview records linked to each user
- Required for dashboard functionality
- Tracks user-specific metrics and preferences

## Admin Panel Access

After seeding, you can access the admin panel at:
- **URL**: `https://ledgerswap.io/admin`
- **Email**: `admin@ledgerswap.dev` (or your custom email)
- **Password**: `Admin@12345` (or your custom password)

## Development Workflow

1. **Fresh Setup**: Run `npm run seed` to set up everything
2. **Reset Data**: Delete collections and re-run seeding scripts
3. **Add Test Data**: Use individual scripts to add specific data types
4. **Production**: Only run `npm run seed:admin` and `npm run seed:crypto-fees`

## Troubleshooting

### Connection Issues
- Verify MongoDB is running
- Check MONGODB_URI in your .env file
- Ensure network connectivity for MongoDB Atlas

### Duplicate Data
- Scripts check for existing data and skip duplicates
- Admin and user emails must be unique
- Re-running scripts is safe and won't create duplicates

### Permission Issues
- Ensure your MongoDB user has read/write permissions
- Check database name matches your configuration
- Verify authentication credentials

## Security Notes

⚠️ **Important Security Considerations:**

1. **Change Default Passwords**: Always change default passwords in production
2. **Environment Variables**: Use strong, unique passwords via environment variables
3. **Test Data**: Don't use seeded test users in production environments
4. **Admin Access**: Secure your admin credentials and limit access

## Script Locations

All seeding scripts are located in `/src/scripts/`:
- `seedAdmin.ts` - Admin user creation
- `seedUsers.ts` - Test user creation  
- `seedCryptoFees.ts` - Cryptocurrency fee configuration
- `seedAll.ts` - Comprehensive seeding script

Each script can be run independently or as part of the comprehensive seeding process.
