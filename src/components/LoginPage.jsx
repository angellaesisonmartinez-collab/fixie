import { useState, useEffect } from 'react';
import bcrypt from 'bcryptjs';
import {
  IdCard,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  LogOut,
  ShieldCheck,
  Wrench,
  GitFork,
  Cable,
  BookMarked
} from 'lucide-react';
import angelAvatar from '../assets/avatars/angel.png';
import { getStudentAvatar } from '../lib/studentAvatarUtils';
import fixieMascotImg from '../assets/fixie-mascot.png';
import Header from './Header';
import Footer from './Footer';
import ForgotPasswordModal from './ForgotPasswordModal';
import SignOutModal from './SignOutModal';
import ChangePasswordCard from './ChangePasswordCard';
import TechnicalPersonnelSetup from './TechnicalPersonnelSetup';
import StudentAccountSetup from './StudentAccountSetup';
import AdminDashboard from './AdminDashboard';
import StudentDashboard from './StudentDashboard';
import { supabase } from '../lib/supabase';
import { fetchStudentReportsAndStats } from '../lib/studentReportsService';


export default function LoginPage() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [identifierError, setIdentifierError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Modal dialog states
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [isSignOutModalOpen, setIsSignOutModalOpen] = useState(false);

  // Authenticated state
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);

  // Hydrate authenticated student or technical personnel session on mount / page refresh
  useEffect(() => {
    try {
      const storedTech = sessionStorage.getItem('fixie_authenticated_tech');
      if (storedTech) {
        const tech = JSON.parse(storedTech);
        if (tech && tech.role === 'admin') {
          setCurrentUser({ id: tech.id, email: tech.email });
          setUserProfile(tech);
          return;
        }
      }

      const stored = sessionStorage.getItem('fixie_authenticated_student');
      if (stored) {
        const student = JSON.parse(stored);
        if (student && (student.student_id || student.email)) {
          setCurrentUser({ id: student.id, email: student.email });
          setUserProfile(student);
        }
      }
    } catch (e) {
      console.warn('Session hydration note:', e);
    }
  }, []);

  // Student ID pattern requirement: ^\d{2}-\d{4}-\d{3}$
  const STUDENT_ID_REGEX = /^\d{2}-\d{4}-\d{3}$/;


  const validateForm = () => {
    let isValid = true;
    setIdentifierError('');
    setPasswordError('');
    setInfoMessage('');

    const trimmedIdentifier = identifier.trim();

    // 1. Identifier Validation
    if (!trimmedIdentifier) {
      setIdentifierError('Student ID or Username is required.');
      isValid = false;
    } else {
      // If it looks like a student ID with hyphens and digits, validate regex format
      const isStudentIdAttempt = /^\d+[\d-]*\d+$/.test(trimmedIdentifier) && trimmedIdentifier.includes('-');
      if (isStudentIdAttempt && !STUDENT_ID_REGEX.test(trimmedIdentifier)) {
        setIdentifierError('Invalid Student ID format. Expected format: XX-XXXX-XXX.');
        isValid = false;
      }
    }

    // 2. Password Validation
    if (!password) {
      setPasswordError('Password is required.');
      isValid = false;
    }

    return isValid;
  };

  const getSyntheticEmail = (rawIdentifier) => {
    const trimmed = rawIdentifier.trim().toLowerCase();
    if (trimmed === 'ict-admin' || trimmed === 'admin') {
      return 'angellaemrtnz@gmail.com';
    }
    return `${rawIdentifier.trim()}@student.fixie.internal`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setInfoMessage('');

    try {
      const trimmedIdentifier = identifier.trim();
      const lowerIdentifier = trimmedIdentifier.toLowerCase();
      let authEmail = null;
      let studentRecord = null;
      let tpRecord = null;

      const isAdminAlias =
        lowerIdentifier === 'ict-admin' ||
        lowerIdentifier === 'admin' ||
        lowerIdentifier === 'angellaemrtnz@gmail.com';

      // 1. Resolve user record and target auth identity
      if (isAdminAlias) {
        authEmail = 'angellaemrtnz@gmail.com';
        try {
          const { data } = await supabase
            .from('technical_personnel')
            .select('*')
            .or(`username.eq.ict-admin,username.eq.admin,registered_email.eq.angellaemrtnz@gmail.com`)
            .maybeSingle();
          tpRecord = data;
        } catch {}
      } else {
        // Fast-path student lookup: match by student_id, email, full name, or email prefix
        try {
          let orQuery = `student_id.eq.${trimmedIdentifier},email.eq.${trimmedIdentifier},name.ilike.${trimmedIdentifier}`;
          if (!trimmedIdentifier.includes('@') && !/^\d{2}-\d{4}-\d{3}$/.test(trimmedIdentifier)) {
            orQuery += `,email.ilike.${trimmedIdentifier}@%`;
          }
          const stPromise = supabase
            .from('students')
            .select('*')
            .or(orQuery)
            .maybeSingle();
          const stTimeout = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('TIMEOUT')), 2500)
          );
          const { data: stData } = await Promise.race([stPromise, stTimeout]);
          studentRecord = stData;
        } catch (stErr) {
          console.warn('Student quick-lookup note:', stErr?.message || stErr);
        }

        if (studentRecord) {
          authEmail = studentRecord.email || getSyntheticEmail(trimmedIdentifier);
        } else {
          // Look up technical personnel custom username or registered email
          try {
            const tpPromise = supabase
              .from('technical_personnel')
              .select('*')
              .or(`username.ilike.${trimmedIdentifier},registered_email.eq.${trimmedIdentifier}`)
              .maybeSingle();
            const tpTimeout = new Promise((_, reject) =>
              setTimeout(() => reject(new Error('TIMEOUT')), 2000)
            );
            const { data: tpData } = await Promise.race([tpPromise, tpTimeout]);
            tpRecord = tpData;
            if (tpRecord?.registered_email) {
              authEmail = tpRecord.registered_email;
            }
          } catch (tpErr) {
            console.warn('TP username lookup note:', tpErr);
          }
        }
      }

      // If neither a student nor technical personnel record was matched, reject
      if (!studentRecord && !tpRecord && !isAdminAlias) {
        setInfoMessage('Invalid Student ID/Username or Password. Please check your credentials.');
        return;
      }

      // 2. STUDENT AUTHENTICATION FLOW
      if (studentRecord) {
        let isStudentPasswordCorrect = false;

        // Verify password against student's bcrypt password_hash
        if (studentRecord.password_hash) {
          try {
            isStudentPasswordCorrect = bcrypt.compareSync(password, studentRecord.password_hash);
          } catch (cmpErr) {
            console.warn('Student bcrypt compare error:', cmpErr);
          }
        }

        // Secondary check against Supabase Auth (if student is in auth.users)
        if (!isStudentPasswordCorrect && authEmail) {
          try {
            const authPromise = supabase.auth.signInWithPassword({
              email: authEmail,
              password,
            });
            const timeoutPromise = new Promise((_, reject) =>
              setTimeout(() => reject(new Error('TIMEOUT')), 3000)
            );
            const { data: authData, error: authErr } = await Promise.race([authPromise, timeoutPromise]);
            if (!authErr && authData?.user) {
              isStudentPasswordCorrect = true;
            }
          } catch {}
        }

        // WRONG PASSWORD: strictly reject and stop execution
        if (!isStudentPasswordCorrect) {
          setInfoMessage('Invalid Student ID/Username or Password. Please check your credentials.');
          return;
        }

        // Password is correct: verify account active status
        if (studentRecord.status === 'deactivated' || studentRecord.status === 'disabled') {
          setInfoMessage('Your account has been deactivated and can no longer log in. Please contact Technical Personnel or the ICT Office.');
          return;
        }

        // Active student with correct credentials -> successfully login
        const studentProfile = {
          id: studentRecord.id,
          username: studentRecord.student_id,
          student_id: studentRecord.student_id,
          email: studentRecord.email,
          full_name: studentRecord.name || `${studentRecord.first_name || ''} ${studentRecord.last_name || ''}`.trim(),
          name: studentRecord.name || `${studentRecord.first_name || ''} ${studentRecord.last_name || ''}`.trim(),
          first_name: studentRecord.first_name,
          middle_name: studentRecord.middle_name,
          last_name: studentRecord.last_name,
          role: 'student',
          year_block: studentRecord.year_block,
          date_registered: studentRecord.date_registered || studentRecord.created_at,
          email_last_updated: studentRecord.email_last_updated,
          is_setup_complete: !studentRecord.must_change_password,
          must_change_password: studentRecord.must_change_password,
          status: studentRecord.status,
          profile_photo: studentRecord.profile_photo,
          avatar: getStudentAvatar(studentRecord),
        };

        setCurrentUser({ id: studentRecord.id, email: studentRecord.email });
        setUserProfile(studentProfile);
        try {
          sessionStorage.setItem('fixie_authenticated_student', JSON.stringify(studentProfile));
        } catch {}
        // Optimistically prefetch student reports in the background so dashboard data loads instantly
        fetchStudentReportsAndStats(studentProfile).catch(() => {});
        setIdentifier('');
        setPassword('');
        return;
      }

      // 3. TECHNICAL PERSONNEL AUTHENTICATION FLOW
      let isTpPasswordCorrect = false;
      let authUser = null;

      try {
        const authPromise = supabase.auth.signInWithPassword({
          email: authEmail || 'angellaemrtnz@gmail.com',
          password,
        });
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('TIMEOUT')), 4000)
        );
        const { data: authData, error: authErr } = await Promise.race([authPromise, timeoutPromise]);
        if (!authErr && authData?.user) {
          isTpPasswordCorrect = true;
          authUser = authData.user;
        }
      } catch {}

      // Fallback check against technical_personnel password_hash
      if (!isTpPasswordCorrect && tpRecord?.password_hash) {
        try {
          if (bcrypt.compareSync(password, tpRecord.password_hash)) {
            isTpPasswordCorrect = true;
          }
        } catch {}
      }

      if (!isTpPasswordCorrect) {
        setInfoMessage('Invalid Student ID/Username or Password. Please check your credentials.');
        return;
      }

      const tpProfile = {
        id: tpRecord?.id || authUser?.id || '46d7fbd7-fe61-4365-962f-2155820a0fd5',
        username: tpRecord?.username || 'ict-admin',
        email: tpRecord?.registered_email || authEmail || 'angellaemrtnz@gmail.com',
        full_name: 'Technical Personnel',
        role: 'admin',
        is_setup_complete: tpRecord ? tpRecord.is_setup_complete : true,
        must_change_password: tpRecord ? !tpRecord.is_setup_complete : false,
        status: 'active',
      };

      setCurrentUser(authUser || { id: tpProfile.id, email: tpProfile.email });
      setUserProfile(tpProfile);
      try {
        sessionStorage.setItem('fixie_authenticated_tech', JSON.stringify(tpProfile));
        sessionStorage.removeItem('fixie_authenticated_student');
      } catch {}
      setIdentifier('');
      setPassword('');
      return;

    } catch (err) {
      setInfoMessage(err.message || 'An unexpected error occurred during authentication.');
    } finally {
      setIsLoading(false);
    }
  };

  const confirmSignOut = async () => {
    setIsLoading(true);
    try {
      await supabase.auth.signOut();
      try {
        sessionStorage.removeItem('fixie_authenticated_student');
        sessionStorage.removeItem('fixie_authenticated_tech');
      } catch {}
      setCurrentUser(null);
      setUserProfile(null);
      setIdentifier('');
      setPassword('');
      setIdentifierError('');
      setPasswordError('');
      setInfoMessage('');
      setIsSignOutModalOpen(false);
    } catch (err) {
      setInfoMessage(err.message || 'Error signing out.');
    } finally {
      setIsLoading(false);
    }
  };

  // ----------------------------------------------------
  // View 1: First-Time Onboarding / Change Password
  // ----------------------------------------------------
  if (currentUser && userProfile && (userProfile.must_change_password || userProfile.is_setup_complete === false)) {
    // Phase 02 Screen 3: Dedicated Technical Personnel Account Setup
    if (userProfile.role === 'admin' || userProfile.role === 'technical_personnel') {
      return (
        <TechnicalPersonnelSetup
          currentUser={currentUser}
          userProfile={userProfile}
          onSuccess={(updatedProfile) => {
            // User clicked "Continue to Dashboard" -> switch directly to View 2
            setUserProfile(
              updatedProfile || {
                ...userProfile,
                is_setup_complete: true,
                must_change_password: false,
              }
            );
          }}
          onReturnToLogin={() => {
            // User clicked "Return to Login" -> reset auth state and display login screen instantly
            setCurrentUser(null);
            setUserProfile(null);
            setIdentifier('');
            setPassword('');
            setIsLoading(false);
          }}
          onSignOut={() => {
            setCurrentUser(null);
            setUserProfile(null);
            setIdentifier('');
            setPassword('');
            setIsLoading(false);
          }}
        />
      );
    }

    // Phase 02 Screen 4: Student First-Login Password Update (matching Technical Personnel layout)
    return (
      <StudentAccountSetup
        currentUser={currentUser}
        userProfile={userProfile}
        onSuccess={(updatedProfile) => {
          // User clicked "Continue to Dashboard" -> switch directly to View 2
          setUserProfile(
            updatedProfile || {
              ...userProfile,
              is_setup_complete: true,
              must_change_password: false,
            }
          );
        }}
        onReturnToLogin={() => {
          // User clicked "Return to Login" -> reset auth state and display login screen instantly
          setCurrentUser(null);
          setUserProfile(null);
          setIdentifier('');
          setPassword('');
          setIsLoading(false);
        }}
        onSignOut={() => {
          setCurrentUser(null);
          setUserProfile(null);
          setIdentifier('');
          setPassword('');
          setIsLoading(false);
        }}
      />
    );
  }


  // ----------------------------------------------------
  // View 2: Authenticated Dashboard (Admin / Student)
  // ----------------------------------------------------
  if (currentUser && userProfile && !userProfile.must_change_password) {
    if (userProfile.role === 'admin') {
      return (
        <AdminDashboard
          currentUser={currentUser}
          userProfile={userProfile}
          onSignOut={confirmSignOut}
        />
      );
    }

    // Student Dashboard View (Phase 2 @Frontend Design)
    return (
      <StudentDashboard
        currentUser={currentUser}
        userProfile={userProfile}
        onSignOut={confirmSignOut}
        onAccountDisabled={(msg) => {
          supabase.auth.signOut().catch(() => {});
          setCurrentUser(null);
          setUserProfile(null);
          setIdentifier('');
          setPassword('');
          setInfoMessage(msg || 'Your account has been disabled because you have already graduated or transferred.');
        }}
      />
    );
  }

  // ----------------------------------------------------
  // View 3: Phase 2 Login Screen (Exact match to screenshot)
  // ----------------------------------------------------
  return (
    <div className="login-root-container">
      {/* Top Navbar Header */}
      <Header />

      {/* Main Viewport Container */}
      <main className="login-main-viewport">
        <div className="login-two-column-layout">
          {/* Left Column: Mascot, Serif Typography & 2x2 Feature Cards */}
          <section className="hero-section-col">
            {/* Top Row: Mascot + Headline */}
            <div className="hero-banner-row">
              <div className="mascot-img-wrapper">
                <img
                  src={fixieMascotImg}
                  alt="Fixie Fox Mascot wearing safety helmet"
                  className="hero-fixie-mascot"
                />
              </div>

              <div className="hero-typography-block">
                <h1 className="hero-serif-title">
                  Report <br />
                  Laboratory Issues
                </h1>
                <p className="hero-emerald-subtitle">
                  Stay informed. Keep your lab ready.
                </p>
                <p className="hero-body-description">
                  Report any equipment or software<br />
                  problems, and the technical personnel will<br />
                  be informed immediately.
                </p>
              </div>
            </div>

            {/* Bottom Row: 2x2 Feature Cards Grid */}
            <div className="feature-cards-grid-2x2">
              {/* Card 1 */}
              <div className="feature-grid-card">
                <div className="feature-card-badge badge-light-red">
                  <Wrench size={18} className="icon-red" />
                </div>
                <p className="feature-grid-text">
                  Report broken hardware (PCs, displays, keyboards, mice)
                </p>
              </div>

              {/* Card 2 */}
              <div className="feature-grid-card">
                <div className="feature-card-badge badge-light-indigo">
                  <GitFork size={18} className="icon-indigo" />
                </div>
                <p className="feature-grid-text">
                  Track real-time status of your submitted incident reports
                </p>
              </div>

              {/* Card 3 */}
              <div className="feature-grid-card">
                <div className="feature-card-badge badge-light-gray">
                  <Cable size={18} className="icon-gray" />
                </div>
                <p className="feature-grid-text">
                  Flag network, patch cable, or LAN packet drops instantly
                </p>
              </div>

              {/* Card 4 */}
              <div className="feature-grid-card">
                <div className="feature-card-badge badge-solid-green">
                  <BookMarked size={18} className="icon-white" />
                </div>
                <p className="feature-grid-text">
                  Read lab rules, how-tos, and reminders anytime
                </p>
              </div>
            </div>
          </section>

          {/* Right Column: Dark Forest Green Login Card */}
          <section className="auth-card-col">
            <div className="dark-login-card">
              {/* Top-Right Decorative Corner Cutout */}
              <div className="card-corner-accent-tr" aria-hidden="true" />

              <div className="dark-card-inner">
                <h2 className="dark-card-heading">
                  Sign in to your Account
                </h2>
                <p className="dark-card-subheading">
                  Enter your assigned Student ID/username and password to proceed to the Fixie portal.
                </p>

                {/* Server / Auth Alerts */}
                {infoMessage && (
                  <div className="login-feedback-banner banner-error" role="alert">
                    <AlertCircle size={18} className="flex-shrink-0" />
                    <span>{infoMessage}</span>
                  </div>
                )}

                {/* Authentication Form */}
                <form onSubmit={handleSubmit} noValidate className="auth-form-wrapper">
                  {/* Field 1: Student ID / Username */}
                  <div className="auth-field-group">
                    <label htmlFor="identifier" className="auth-label-light">
                      STUDENT ID / USERNAME
                    </label>
                    <div className={`auth-input-container-light ${identifierError ? 'has-field-error' : ''}`}>
                      <svg
                        className="auth-left-icon-dark"
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <rect x="4" y="3" width="16" height="18" rx="2" />
                        <rect x="9" y="1" width="6" height="3" rx="1" fill="currentColor" stroke="none" />
                        <circle cx="12" cy="10" r="3" />
                        <path d="M7 19c0-2.5 2.2-4 5-4s5 1.5 5 4" />
                      </svg>
                      <input
                        id="identifier"
                        type="text"
                        className="auth-input-light"
                        placeholder="Enter student ID or username"
                        value={identifier}
                        onChange={(e) => {
                          setIdentifier(e.target.value);
                          if (identifierError) setIdentifierError('');
                        }}
                        disabled={isLoading}
                        autoComplete="username"
                      />
                    </div>
                    {identifierError && (
                      <p className="auth-inline-error" role="alert">
                        {identifierError}
                      </p>
                    )}
                  </div>

                  {/* Field 2: Password */}
                  <div className="auth-field-group">
                    <label htmlFor="password" className="auth-label-light">
                      PASSWORD
                    </label>
                    <div className={`auth-input-container-light ${passwordError ? 'has-field-error' : ''}`}>
                      <Lock className="auth-left-icon-dark" size={18} aria-hidden="true" />
                      <input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        className="auth-input-light auth-password-padding"
                        placeholder="Enter password"
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          if (passwordError) setPasswordError('');
                        }}
                        disabled={isLoading}
                        autoComplete="current-password"
                      />
                      <button
                        type="button"
                        className="auth-eye-toggle-btn-dark"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        disabled={isLoading}
                      >
                        {showPassword ? (
                          <Eye size={18} aria-hidden="true" />
                        ) : (
                          <EyeOff size={18} aria-hidden="true" />
                        )}
                      </button>
                    </div>
                    {passwordError && (
                      <p className="auth-inline-error" role="alert">
                        {passwordError}
                      </p>
                    )}
                  </div>

                  {/* Forgot Password Link */}
                  <div className="forgot-password-container">
                    <button
                      type="button"
                      className="forgot-password-link-white"
                      onClick={() => {
                        window.location.hash = '#forgot-password';
                      }}
                    >
                      Forgot Password?
                    </button>
                  </div>

                  {/* Sign In CTA Button */}
                  <button
                    type="submit"
                    className="auth-submit-btn-mint"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <span className="btn-loading-content">
                        <Loader2 size={18} className="spinner-icon" />
                        Signing in...
                      </span>
                    ) : (
                      'Sign in'
                    )}
                  </button>
                </form>

                {/* Divider: NOT REGISTERED YET? */}
                <div className="auth-divider-block-dark">
                  <span className="divider-line-dark" />
                  <span className="divider-text-white">
                    NOT REGISTERED YET?
                  </span>
                  <span className="divider-line-dark" />
                </div>

                {/* White Notification Card */}
                <div className="authorized-notice-card-white">
                  <div className="notice-icon-circle-badge" aria-hidden="true">
                    <span className="notice-symbol">!</span>
                  </div>
                  <p className="notice-card-text-dark">
                    Accounts are set up by authorized personnel. <strong>Students</strong>, visit the ICT Room and bring your school ID. <strong>Technical Personnel</strong>, use the credentials provided by the developer.
                  </p>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* Bottom Footer */}
      <Footer />

      {/* Security & Lifecycle Modals */}
      <ForgotPasswordModal
        isOpen={isForgotModalOpen}
        onClose={() => setIsForgotModalOpen(false)}
      />

      <SignOutModal
        isOpen={isSignOutModalOpen}
        onConfirm={confirmSignOut}
        onCancel={() => setIsSignOutModalOpen(false)}
        isLoading={isLoading}
      />
    </div>
  );
}