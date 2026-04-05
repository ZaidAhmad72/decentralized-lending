# OTP Authentication Implementation

## Overview
This implementation adds two-factor authentication using email-based OTP (One-Time Password) for login, while keeping signup simple with just email and password.

## Authentication Flow

### Signup Flow (No OTP)
1. User enters email, password, name, and age
2. Account is created using `supabase.auth.signUp()`
3. User profile is created in the database
4. User is redirected to dashboard immediately

### Login Flow (With OTP)
1. User enters email only
2. System sends OTP to email using `supabase.auth.signInWithOtp()`
3. User receives 6-digit code via email
4. User enters OTP code
5. System verifies OTP using `supabase.auth.verifyOtp()`
6. Upon successful verification, user is redirected to dashboard

## Key Features

- **Enhanced Security**: Login requires both email access and OTP verification
- **User-Friendly Signup**: New users can register quickly without OTP hassle
- **Resend OTP**: Users can request a new OTP if needed
- **Real-time Validation**: OTP input only accepts 6 digits
- **Clear UI States**: Different UI states for email entry, OTP entry, and verification

## Technical Implementation

### State Management
```typescript
const [otpSent, setOtpSent] = useState(false);  // Tracks if OTP was sent
const [otp, setOtp] = useState("");              // Stores OTP input
const [verifying, setVerifying] = useState(false); // Tracks verification status
```

### Key Functions

1. **handleSubmit()**: Handles both signup and OTP sending for login
2. **handleVerifyOtp()**: Verifies the OTP code entered by user
3. **handleResendOtp()**: Resends OTP if user didn't receive it

## Supabase Configuration

Make sure your Supabase project has:
- Email authentication enabled
- Email templates configured for OTP
- SMTP settings configured for email delivery

## Testing

1. **Test Signup**: Create a new account - should work without OTP
2. **Test Login**: Login with existing account - should receive OTP email
3. **Test OTP Verification**: Enter correct OTP - should login successfully
4. **Test Invalid OTP**: Enter wrong OTP - should show error
5. **Test Resend**: Click resend - should receive new OTP

## Branch
This feature is implemented on the `otp-auth` branch.
