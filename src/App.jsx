import { useState, useEffect } from 'react';
import LoginPage from './components/LoginPage';
import TechnicalPersonnelSetup from './components/TechnicalPersonnelSetup';
import StudentAccountSetup from './components/StudentAccountSetup';
import PasswordUpdatedCard from './components/PasswordUpdatedCard';
import ForgotPasswordPage from './components/ForgotPasswordPage';
import AdminDashboard from './components/AdminDashboard';
import StudentDashboard from './components/StudentDashboard';
import SignOutModal from './components/SignOutModal';
import ChangePasswordCard from './components/ChangePasswordCard';
import angelAvatar from './assets/avatars/angel.png';
import { getStudentAvatar } from './lib/studentAvatarUtils';
import Header from './components/Header';
import Footer from './components/Footer';
import ReportDetailsModal from './components/ReportDetailsModal';
import StudentProfileModal from './components/StudentProfileModal';
import TechnicalAccountModal from './components/TechnicalAccountModal';
import { clearAdminDashboardCache } from './lib/adminDashboardService';
import './App.css';


function App() {
  const [currentHash, setCurrentHash] = useState(window.location.hash);

  useEffect(() => {
    const handleHashChange = () => {
      setCurrentHash(window.location.hash);
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Screen: Direct Preview of Sign Out Confirmation Modal (#signout or #signout-modal)
  if (currentHash === '#signout' || currentHash === '#signout-modal') {
    return (
      <div style={{ height: '100vh', backgroundColor: '#072617', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'auto' }}>
        <SignOutModal
          isOpen={true}
          onConfirm={() => {
            window.location.hash = '';
          }}
          onCancel={() => {
            window.location.hash = '#dashboard';
          }}
        />
      </div>
    );
  }

  // Screen: Direct Preview of Student Profile Modal - Image 1 (Before update) (#student-profile-modal, #student-info-modal)
  if (currentHash === '#student-profile-modal' || currentHash === '#student-info-modal') {
    let sessionStudent = null;
    try {
      const stored = sessionStorage.getItem('fixie_authenticated_student');
      if (stored) sessionStudent = JSON.parse(stored);
    } catch {}

    const modalData = sessionStudent ? {
      firstName: sessionStudent.first_name || (sessionStudent.full_name ? sessionStudent.full_name.split(' ')[0] : 'Angel Lae'),
      middleName: sessionStudent.middle_name || '',
      lastName: sessionStudent.last_name || (sessionStudent.full_name ? sessionStudent.full_name.split(' ').slice(1).join(' ') : 'Martinez'),
      yearBlock: sessionStudent.year_block || '3rd year, BLK 2',
      studentId: sessionStudent.student_id || '24-0041-147',
      email: sessionStudent.email || 'martinezangellaewup@gmail.com',
      emailLastUpdated: sessionStudent.email_last_updated || null,
    } : {
      firstName: 'Angel Lae',
      middleName: 'Sison',
      lastName: 'Martinez',
      yearBlock: '3rd year, Block 2',
      studentId: '24-0041-147',
      email: 'martinezangellaewup@gmail.com',
      emailLastUpdated: null,
    };

    return (
      <div style={{ height: '100vh', backgroundColor: '#072617', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', overflow: 'auto' }}>
        <StudentProfileModal
          isOpen={true}
          onClose={() => {
            window.location.hash = '#student-settings';
          }}
          studentData={modalData}
        />
      </div>
    );
  }

  // Screen: Direct Preview of Student Profile Modal - Image 2 (After Technical Personnel Update) (#student-profile-updated, #student-info-updated)
  if (currentHash === '#student-profile-updated' || currentHash === '#student-info-updated') {
    return (
      <div style={{ height: '100vh', backgroundColor: '#072617', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', overflow: 'auto' }}>
        <StudentProfileModal
          isOpen={true}
          onClose={() => {
            window.location.hash = '#student-settings';
          }}
          studentData={{
            firstName: 'Angel Lae',
            middleName: 'Sison',
            lastName: 'Martinez',
            yearBlock: '3rd year, Block 2',
            studentId: '24-0041-147',
            email: 'martinezangellaewup@gmail.com',
            emailLastUpdated: 'Oct 9, 2026',
          }}
          isUpdatedPreview={true}
        />
      </div>
    );
  }

  // Screen: Direct Preview of Technical Personnel Account Information Modal (#tech-account-modal, #tech-info-modal, #tech-profile-modal, #account-info-modal)
  if (
    currentHash === '#tech-account-modal' ||
    currentHash === '#tech-info-modal' ||
    currentHash === '#tech-profile-modal' ||
    currentHash === '#account-info-modal'
  ) {
    return (
      <div style={{ height: '100vh', backgroundColor: '#072617', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', overflow: 'auto' }}>
        <TechnicalAccountModal
          isOpen={true}
          onClose={() => {
            window.location.hash = '#settings';
          }}
          techData={{
            username: 'ict-admin',
            role: 'Technical Personnel',
            accountType: 'Shared Account',
            email: 'angellaemrtnz@gmail.com',
          }}
        />
      </div>
    );
  }

  // Screen: Direct Preview of Student Report Details Modal - Submitted State (#student-report-modal, #student-modal, #report-modal)

  if (
    currentHash === '#student-report-modal' ||
    currentHash === '#student-modal' ||
    currentHash === '#report-modal'
  ) {
    return (
      <div style={{ height: '100vh', backgroundColor: '#072617', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', overflow: 'auto' }}>
        <ReportDetailsModal
          report={{
            id: 'LR-12',
            report_id: 'LR-12',
            unitNumber: 'PC-#14',
            unit_number: 'PC-#14',
            equipment: 'Monitor',
            locationCenter: '5',
            location_center: '5',
            locationRoom: 'Room 204',
            location_room: 'Room 204',
            submittedDate: 'Oct 17, 2026',
            submitted_date: 'Oct 17, 2026',
            submittedTime: '3:45 PM',
            submitted_time: '3:45 PM',
            status: 'Under Review',
            displayStatus: 'UNDER REVIEW',
            description: 'Screen flickers every few seconds and shows horizontal lines.',
            attachment: {
              name: 'pc014_monitor_display.jpg',
              size: '1.4MB',
            },
          }}
          isStudent={true}
          onClose={() => {
            window.location.hash = '#my-reports';
          }}
        />
      </div>
    );
  }

  // Screen: Direct Preview of Student Report Details Modal - Reviewed State (#student-report-modal-reviewed, #reviewed-modal, #report-reviewed)
  if (
    currentHash === '#student-report-modal-reviewed' ||
    currentHash === '#reviewed-modal' ||
    currentHash === '#report-reviewed'
  ) {
    return (
      <div style={{ height: '100vh', backgroundColor: '#072617', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', overflow: 'auto' }}>
        <ReportDetailsModal
          report={{
            id: 'LR-12',
            report_id: 'LR-12',
            unitNumber: 'PC-#14',
            unit_number: 'PC-#14',
            equipment: 'Monitor',
            locationCenter: '5',
            location_center: '5',
            locationRoom: 'Room 204',
            location_room: 'Room 204',
            submittedDate: 'Oct 17, 2026',
            submitted_date: 'Oct 17, 2026',
            submittedTime: '3:45 PM',
            submitted_time: '3:45 PM',
            status: 'Reviewed',
            displayStatus: 'REVIEWED',
            description: 'Screen flickers every few seconds and shows horizontal lines.',
            attachment: {
              name: 'pc014_monitor_display.jpg',
              size: '1.4MB',
            },
            history: [
              { action: 'Reviewed', time: 'Oct 17, 3:56 PM' },
              { action: 'Submitted by Angel Lae Martinez', time: 'Oct 17, 3:45 PM' },
            ],
          }}
          isStudent={true}
          onClose={() => {
            window.location.hash = '#my-reports';
          }}
        />
      </div>
    );
  }

  // Screen: Direct Preview of Student Report Details Modal - Under Repair State (#student-report-modal-repair, #under-repair-modal, #student-repair)
  if (
    currentHash === '#student-report-modal-repair' ||
    currentHash === '#student-report-modal-under-repair' ||
    currentHash === '#under-repair-modal' ||
    currentHash === '#repair-modal' ||
    currentHash === '#under-repair' ||
    currentHash === '#student-repair' ||
    currentHash === '#student-repair-modal' ||
    currentHash === '#student-under-repair' ||
    currentHash === '#student-under-repair-modal'
  ) {
    return (
      <div style={{ height: '100vh', backgroundColor: '#072617', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', overflow: 'auto' }}>
        <ReportDetailsModal
          report={{
            id: 'LR-12',
            report_id: 'LR-12',
            unitNumber: 'PC-#14',
            unit_number: 'PC-#14',
            equipment: 'Monitor',
            locationCenter: '5',
            location_center: '5',
            locationRoom: 'Room 204',
            location_room: 'Room 204',
            submittedDate: 'Oct 17, 2026',
            submitted_date: 'Oct 17, 2026',
            submittedTime: '3:45 PM',
            submitted_time: '3:45 PM',
            status: 'Under Repair',
            displayStatus: 'UNDER REPAIR',
            description: 'Screen flickers every few seconds and shows horizontal lines.',
            attachment: {
              name: 'pc014_monitor_display.jpg',
              size: '1.4MB',
            },
            history: [
              { action: 'Under repair', time: 'Oct 17, 4:01 PM' },
              { action: 'Reviewed', time: 'Oct 17, 3:56 PM' },
              { action: 'Submitted by Angel Lae Martinez', time: 'Oct 17, 3:45 PM' },
            ],
          }}
          isStudent={true}
          onClose={() => {
            window.location.hash = '#my-reports';
          }}
        />
      </div>
    );
  }

  // Screen: Direct Preview of Student Report Details Modal - LR-11 (#modal-lr11, #student-report-lr11)
  if (currentHash === '#modal-lr11' || currentHash === '#student-report-lr11') {
    return (
      <div style={{ height: '100vh', backgroundColor: '#072617', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', overflow: 'auto' }}>
        <ReportDetailsModal
          report={{
            id: 'LR-11',
            report_id: 'LR-11',
            unitNumber: 'PC-#10',
            unit_number: 'PC-#10',
            equipment: 'Network/Internet',
            locationCenter: '5',
            location_center: '5',
            locationRoom: 'Room 204',
            location_room: 'Room 204',
            submittedDate: 'Oct 17, 2026',
            submitted_date: 'Oct 17, 2026',
            submittedTime: '3:45 PM',
            submitted_time: '3:45 PM',
            status: 'Under Repair',
            displayStatus: 'UNDER REPAIR',
            description: 'PC not connecting to internet gateway; LAN port link LED off.',
            history: [
              { action: 'Under repair', time: 'Oct 17, 4:05 PM' },
              { action: 'Reviewed', time: 'Oct 17, 3:56 PM' },
              { action: 'Submitted by Angel Lae Martinez', time: 'Oct 17, 3:45 PM' },
            ],
          }}
          isStudent={true}
          onClose={() => {
            window.location.hash = '#my-reports';
          }}
        />
      </div>
    );
  }


  // Screen: Direct Preview of Student Report Details Modal - Resolved State (#student-report-modal-resolved, #resolved-modal, #report-resolved, #student-resolved)
  if (
    currentHash === '#student-report-modal-resolved' ||
    currentHash === '#resolved-modal' ||
    currentHash === '#report-resolved' ||
    currentHash === '#student-resolved' ||
    currentHash === '#resolved' ||
    currentHash === '#student-resolved-modal'
  ) {
    return (
      <div style={{ height: '100vh', backgroundColor: '#072617', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', overflow: 'auto' }}>
        <ReportDetailsModal
          report={{
            id: 'LR-12',
            report_id: 'LR-12',
            unitNumber: 'PC-#14',
            unit_number: 'PC-#14',
            equipment: 'Monitor',
            locationCenter: '5',
            location_center: '5',
            locationRoom: 'Room 204',
            location_room: 'Room 204',
            submittedDate: 'Oct 17, 2026',
            submitted_date: 'Oct 17, 2026',
            submittedTime: '3:45 PM',
            submitted_time: '3:45 PM',
            status: 'Resolved',
            displayStatus: 'RESOLVED',
            remarks: 'Replace Monitor',
            description: 'Screen flickers every few seconds and shows horizontal lines.',
            attachment: {
              name: 'pc014_monitor_display.jpg',
              size: '1.4MB',
            },
            history: [
              {
                action: 'Resolved',
                time: 'Oct 17, 4:10 PM',
                remarksText: 'Replace Monitor',
              },
              { action: 'Under repair', time: 'Oct 17, 4:01 PM' },
              { action: 'Reviewed', time: 'Oct 17, 3:56 PM' },
              { action: 'Submitted by Angel Lae Martinez', time: 'Oct 17, 3:45 PM' },
            ],
          }}
          isStudent={true}
          onClose={() => {
            window.location.hash = '#my-reports';
          }}
        />
      </div>
    );
  }

  // Screen: Admin Dashboard, Students, Reports, Guides & Settings Direct Preview (#dashboard, #admin, #students, #reports, #guides, #settings)
  if (
    currentHash === '#dashboard' ||
    currentHash === '#admin' ||
    currentHash === '#admin-dashboard' ||
    currentHash === '#overview' ||
    currentHash === '#students' ||
    currentHash === '#registered-students' ||
    currentHash === '#register-student' ||
    currentHash === '#register' ||
    currentHash === '#reports' ||
    currentHash === '#reports-management' ||
    currentHash === '#reports-on-hold' ||
    currentHash === '#reports/on-hold' ||
    currentHash === '#on-hold' ||
    currentHash === '#guides' ||
    currentHash === '#laboratory-guides' ||
    currentHash === '#lab-guides' ||
    currentHash === '#settings' ||
    currentHash === '#settings-privacy' ||
    currentHash === '#privacy' ||
    currentHash === '#account-settings'
  ) {
    let initialNav = 'Dashboard';
    if (
      currentHash === '#students' ||
      currentHash === '#registered-students' ||
      currentHash === '#register-student' ||
      currentHash === '#register'
    ) {
      initialNav = 'Students';
    } else if (
      currentHash === '#reports' ||
      currentHash === '#reports-management' ||
      currentHash === '#reports-on-hold' ||
      currentHash === '#reports/on-hold' ||
      currentHash === '#on-hold'
    ) {
      initialNav = 'Reports';
    } else if (
      currentHash === '#guides' ||
      currentHash === '#laboratory-guides' ||
      currentHash === '#lab-guides'
    ) {
      initialNav = 'Laboratory Guides';
    } else if (
      currentHash === '#settings' ||
      currentHash === '#settings-privacy' ||
      currentHash === '#privacy' ||
      currentHash === '#account-settings'
    ) {
      initialNav = 'Settings';
    }

    let sessionTech = null;
    let sessionStudent = null;
    try {
      const stored = sessionStorage.getItem('fixie_authenticated_tech');
      if (stored) {
        sessionTech = JSON.parse(stored);
      }
      const sStored = sessionStorage.getItem('fixie_authenticated_student');
      if (sStored) {
        sessionStudent = JSON.parse(sStored);
      }
    } catch {}

    // Safeguard: If authenticated session belongs to a student and not technical personnel,
    // prevent hash routing from opening Technical Personnel AdminDashboard
    if (sessionStudent && !sessionTech && (currentHash === '#reports' || currentHash === '#reports-management')) {
      return (
        <StudentDashboard
          initialNav="My Reports"
          currentUser={{ id: sessionStudent.id, email: sessionStudent.email }}
          userProfile={sessionStudent}
          onSignOut={() => {
            try {
              sessionStorage.removeItem('fixie_authenticated_student');
              localStorage.removeItem('fixie_authenticated_student');
            } catch {}
            window.location.hash = '';
          }}
        />
      );
    }

    const effectiveTech = sessionTech || {
      id: 'preview-admin',
      username: 'ict-admin',
      full_name: 'Technical Personnel',
      role: 'admin',
      is_setup_complete: true,
      must_change_password: false,
    };

    return (
      <AdminDashboard
        initialNav={initialNav}
        currentUser={{ id: effectiveTech.id, email: effectiveTech.email || 'angellaemrtnz@gmail.com' }}
        userProfile={effectiveTech}
        onSignOut={() => {
          try {
            sessionStorage.removeItem('fixie_authenticated_tech');
          } catch {}
          clearAdminDashboardCache();
          window.location.hash = '';
        }}
      />
    );
  }

  const cleanHash = decodeURIComponent(currentHash || '').toLowerCase().trim();

  // Screen: Student Dashboard Direct Preview (#student-dashboard, #student, #student-overview, #my-reports, #student-reports, #submitted-reports, #report-problem, #student-guides, #student-guide-modal, #student-settings)
  if (
    currentHash === '#student-dashboard' ||
    currentHash === '#student' ||
    currentHash === '#student-overview' ||
    currentHash === '#my-reports' ||
    cleanHash === '#my reports' ||
    cleanHash === '#my-reports' ||
    currentHash === '#student-reports' ||
    currentHash === '#submitted-reports' ||
    currentHash === '#report-problem' ||
    currentHash === '#student-guides' ||
    currentHash === '#student-lab-guides' ||
    currentHash === '#student-laboratory-guides' ||
    currentHash === '#student-resources' ||
    currentHash === '#student-guide-modal' ||
    currentHash === '#guide-modal' ||
    currentHash === '#student-settings' ||
    currentHash === '#student-privacy' ||
    currentHash === '#student-account-settings' ||
    currentHash === '#student-change-password' ||
    currentHash === '#change-password' ||
    currentHash === '#student-password-updated' ||
    currentHash === '#password-updated'
  ) {
    let initialNav = 'Dashboard';
    if (
      currentHash === '#my-reports' ||
      cleanHash === '#my reports' ||
      cleanHash === '#my-reports' ||
      currentHash === '#student-reports' ||
      currentHash === '#submitted-reports'
    ) {
      initialNav = 'My Reports';
    } else if (currentHash === '#report-problem') {
      initialNav = 'Report a Problem';
    } else if (
      currentHash === '#student-guides' ||
      currentHash === '#student-lab-guides' ||
      currentHash === '#student-laboratory-guides' ||
      currentHash === '#student-resources' ||
      currentHash === '#student-guide-modal' ||
      currentHash === '#guide-modal'
    ) {
      initialNav = 'Laboratory Guides';
    } else if (
      currentHash === '#student-settings' ||
      currentHash === '#student-privacy' ||
      currentHash === '#student-account-settings' ||
      currentHash === '#student-change-password' ||
      currentHash === '#change-password' ||
      currentHash === '#student-password-updated' ||
      currentHash === '#password-updated'
    ) {
      initialNav = 'Settings';
    }

    let sessionStudent = null;
    try {
      const stored = sessionStorage.getItem('fixie_authenticated_student');
      if (stored) {
        sessionStudent = JSON.parse(stored);
      }
    } catch {}

    const effectiveStudent = sessionStudent || {
      id: '9002d8e6-bc03-4070-8aae-299147dead9a',
      student_id: '24-0041-147',
      username: '24-0041-147',
      full_name: 'Angel Lae Martinez',
      name: 'Angel Lae Martinez',
      year_block: '3rd year, BLK 2',
      email: 'martinezangellaewup@gmail.com',
      role: 'student',
      avatar: getStudentAvatar({ student_id: '24-0041-147' }),
    };

    return (
      <StudentDashboard
        initialNav={initialNav}
        currentUser={{ id: effectiveStudent.id, email: effectiveStudent.email }}
        userProfile={effectiveStudent}
        onSignOut={() => {
          try {
            sessionStorage.removeItem('fixie_authenticated_student');
            localStorage.removeItem('fixie_authenticated_student');
          } catch {}
          window.location.hash = '';
        }}
      />
    );
  }

  // Screen 2: Forgot Password Flow (#forgot-password or #forgot)
  if (
    currentHash === '#forgot-password' ||
    currentHash === '#forgot' ||
    currentHash.startsWith('#forgot-step')
  ) {
    let initialStep = 1;
    if (currentHash === '#forgot-step-2') initialStep = 2;
    if (currentHash === '#forgot-step-3') initialStep = 3;
    if (currentHash === '#forgot-step-4') initialStep = 4;

    return (
      <ForgotPasswordPage
        initialStep={initialStep}
        onReturnToLogin={() => {
          window.location.hash = '';
        }}
      />
    );
  }

  // Screen 3 Modal Confirmation Direct Preview (#modal or #confirmation)
  if (currentHash === '#modal' || currentHash === '#confirmation' || currentHash === '#setup-modal') {
    return (
      <div className="setup-page-root">
        <Header
          showUser={true}
          userName="Technical Personnel"
          userRole="ICT-Admin"
          avatarText="TP"
          actionButtonLabel="Exit"
          onExit={() => {
            window.location.hash = '';
          }}
        />
        <main className="setup-main-viewport">
          <div className="modal-backdrop-overlay">
            <PasswordUpdatedCard
              updatedProfile={{ username: 'tech-admin', role: 'admin' }}
              onReturnToLogin={() => {
                window.location.hash = '';
              }}
              onContinueToDashboard={() => {
                window.location.hash = '#dashboard';
              }}
            />
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Screen 3 Account Setup Page Direct Preview (#setup or #tech-setup)
  if (currentHash === '#setup' || currentHash === '#tech-setup') {
    return (
      <TechnicalPersonnelSetup
        currentUser={{ id: 'preview-admin', email: 'angellaemrtnz@gmail.com' }}
        userProfile={{ username: '', role: 'admin', is_setup_complete: false }}
        onSuccess={() => {
          window.location.hash = '#dashboard';
        }}
        onReturnToLogin={() => {
          window.location.hash = '';
        }}
        onSignOut={() => {
          window.location.hash = '';
        }}
      />
    );
  }

  // Screen 4: Student First-Time Login Password Update Direct Preview (#student-setup, #student-first-login, #student-password, #update-password)
  if (
    currentHash === '#student-setup' ||
    currentHash === '#student-first-login' ||
    currentHash === '#student-password' ||
    currentHash === '#update-password'
  ) {
    return (
      <StudentAccountSetup
        currentUser={{ id: 'preview-student-id', email: 'martinezangellaewup@gmail.com' }}
        userProfile={{
          id: 'preview-student-id',
          student_id: '24-0041-147',
          username: '24-0041-147',
          full_name: 'Angel Lae Martinez',
          role: 'student',
          year_block: '3rd year, BLK 2',
          must_change_password: true,
          is_setup_complete: false,
        }}
        onSuccess={() => {
          window.location.hash = '#student-dashboard';
        }}
        onReturnToLogin={() => {
          window.location.hash = '';
        }}
        onSignOut={() => {
          window.location.hash = '';
        }}
      />
    );
  }

  return <LoginPage />;
}

export default App;



