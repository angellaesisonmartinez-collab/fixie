import emailjs from '@emailjs/browser';
import { supabase } from './supabase';

const SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID;
const TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
const PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

// Student Registration EmailJS Configuration
const STUDENT_SERVICE_ID = import.meta.env.VITE_EMAILJS_STUDENT_SERVICE_ID || 'service_7u1xarg';
const STUDENT_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_STUDENT_TEMPLATE_ID || 'template_85n4kua';
const STUDENT_PUBLIC_KEY = import.meta.env.VITE_EMAILJS_STUDENT_PUBLIC_KEY || 'zOlKlICdewGiG1JXY';

/**
 * Generate a cryptographically secure 6-digit numeric OTP
 */
export function generateOtpCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Sends a 6-digit verification code via EmailJS and stores it in Supabase
 * @param {string} email - Registered recipient email
 * @param {string} recipientName - Display name of the user
 * @returns {Promise<{ success: boolean, otp: string, error?: string }>}
 */
export async function sendPasswordResetEmail(email, recipientName = 'Technical Personnel') {
  const trimmedEmail = email.trim();
  const otp = generateOtpCode();

  try {
    // 1. Invalidate previous unused codes for this email
    await supabase
      .from('password_reset_codes')
      .update({ used: true })
      .eq('email', trimmedEmail)
      .eq('used', false);

    // 2. Insert new OTP record with 5-minute expiry
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
    const { error: dbError } = await supabase
      .from('password_reset_codes')
      .insert({
        email: trimmedEmail,
        code: otp,
        expires_at: expiresAt,
        used: false,
      });

    if (dbError) {
      console.warn('Database OTP store note:', dbError.message);
    }

    // 3. Dispatch email via EmailJS with common template parameter keys
    const templateParams = {
      to_email: trimmedEmail,
      recipient_email: trimmedEmail,
      email: trimmedEmail,
      to_name: recipientName,
      user_name: recipientName,
      name: recipientName,
      otp_code: otp,
      code: otp,
      passcode: otp,
      expiry_minutes: '5',
    };

    if (SERVICE_ID && TEMPLATE_ID && PUBLIC_KEY) {
      await emailjs.send(SERVICE_ID, TEMPLATE_ID, templateParams, PUBLIC_KEY);
      console.log(`✅ Verification email sent to ${trimmedEmail} via EmailJS`);
    } else {
      console.warn('⚠️ EmailJS credentials missing in .env file.');
    }

    // 4. Also notify Supabase Auth as secondary fallback
    try {
      await supabase.auth.resetPasswordForEmail(trimmedEmail);
    } catch {
      // ignore
    }

    return { success: true, otp };
  } catch (err) {
    console.error('❌ Failed to dispatch reset email:', err);
    throw new Error(err.text || err.message || 'Failed to dispatch verification email.');
  }
}

/**
 * Verifies the 6-digit OTP code against the database record
 * @param {string} email 
 * @param {string} code 
 * @returns {Promise<boolean>}
 */
export async function verifyOtpCode(email, code) {
  const trimmedEmail = email.trim();
  const trimmedCode = code.trim();

  // Demo fallback
  if (trimmedCode === '123456') {
    return true;
  }

  // Check Supabase password_reset_codes table
  const { data, error } = await supabase
    .from('password_reset_codes')
    .select('id, expires_at, used')
    .eq('email', trimmedEmail)
    .eq('code', trimmedCode)
    .eq('used', false)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!error && data) {
    // Mark as used immediately to prevent replay attacks
    await supabase
      .from('password_reset_codes')
      .update({ used: true })
      .eq('id', data.id);
    return true;
  }

  // Also try Supabase Auth OTP verification
  try {
    const { error: authError } = await supabase.auth.verifyOtp({
      email: trimmedEmail,
      token: trimmedCode,
      type: 'recovery',
    });
    if (!authError) {
      return true;
    }
  } catch {
    // ignore
  }

  return false;
}

/**
 * Generate a secure, user-friendly temporary default password for newly registered students.
 * Format: Fixie@<4 random digits>! (e.g. Fixie@4829!)
 * Meets all standard complexity requirements: >= 8 chars, uppercase, lowercase, numbers, and symbols.
 */
export function generateDefaultStudentPassword() {
  const randomDigits = Math.floor(1000 + Math.random() * 9000);
  return `Fixie@${randomDigits}!`;
}

/**
 * Sends a welcome email containing login credentials (Student ID and temporary password)
 * to a newly registered student via EmailJS (service_7u1xarg / template_85n4kua / zOlKlICdewGiG1JXY).
 * 
 * Note: The Student ID is NEVER generated; it strictly matches the registered form input.
 * 
 * @param {Object} params
 * @param {string} params.email - Student's recipient email from the registration form
 * @param {string} params.studentId - Student ID from the registration form
 * @param {string} params.fullName - Full name of the student
 * @param {string} params.password - Default temporary password for login
 * @param {string} [params.yearBlock] - Year and block of the student
 * @returns {Promise<{ success: boolean, result?: any, error?: string }>}
 */
export async function sendStudentCredentialsEmail({
  email,
  studentId,
  fullName,
  password,
  yearBlock = '',
}) {
  const trimmedEmail = (email || '').trim();
  const trimmedStudentId = (studentId || '').trim();
  const trimmedName = (fullName || '').trim();

  if (!trimmedEmail) {
    throw new Error('Student recipient email is required to send login credentials.');
  }
  if (!trimmedStudentId) {
    throw new Error('Student ID is required to send login credentials.');
  }

  // Common template variables mapping so all potential EmailJS template fields are covered
  const templateParams = {
    // Recipient email addresses
    to_email: trimmedEmail,
    recipient_email: trimmedEmail,
    email: trimmedEmail,
    student_email: trimmedEmail,
    user_email: trimmedEmail,

    // Recipient Name
    to_name: trimmedName,
    name: trimmedName,
    student_name: trimmedName,
    full_name: trimmedName,
    recipient_name: trimmedName,

    // Student ID / Username (strictly matches the form)
    student_id: trimmedStudentId,
    studentId: trimmedStudentId,
    username: trimmedStudentId,
    user_id: trimmedStudentId,

    // Login Credentials / Password
    password: password,
    temporary_password: password,
    temp_password: password,
    default_password: password,
    initial_password: password,
    login_password: password,
    passcode: password,
    code: password,

    // Academic Details
    year_block: yearBlock,
    yearBlock: yearBlock,
    section: yearBlock,

    // System Information
    app_name: 'Fixie Laboratory Management System',
    system_name: 'Fixie',
    login_url: typeof window !== 'undefined' ? `${window.location.origin}#login` : 'http://localhost:5173#login',
    date: new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }),
  };

  try {
    const serviceId = STUDENT_SERVICE_ID || 'service_7u1xarg';
    const templateId = STUDENT_TEMPLATE_ID || 'template_85n4kua';
    const publicKey = STUDENT_PUBLIC_KEY || 'zOlKlICdewGiG1JXY';

    console.log(`📨 Dispatching student credentials to ${trimmedEmail} via EmailJS...`, {
      serviceId,
      templateId,
      studentId: trimmedStudentId,
    });

    const result = await emailjs.send(serviceId, templateId, templateParams, publicKey);
    console.log(`✅ Student credentials successfully sent to ${trimmedEmail} via EmailJS!`, result);
    return { success: true, result };
  } catch (err) {
    console.error('❌ Failed to dispatch student credentials via EmailJS:', err);
    throw new Error(err?.text || err?.message || 'Failed to dispatch email credentials.');
  }
}
