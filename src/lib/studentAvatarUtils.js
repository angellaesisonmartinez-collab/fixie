/**
 * Centralized Student Avatar Utility
 *
 * Ensures each student in Fixie has a distinct, authentic profile picture
 * sourced from Supabase `profile_photo` or local high-fidelity assets.
 * Strictly prevents one shared photo across different students.
 */

import { supabase } from './supabase';
import angelAvatar from '../assets/avatars/angel.png';
import jennelynAvatar from '../assets/avatars/jennelyn.png';
import reynAvatar from '../assets/avatars/reyn.png';
import juanAvatar from '../assets/avatars/juan.png';
import mariaAvatar from '../assets/avatars/maria.png';
import jeaneAvatar from '../assets/avatars/jeane.png';
import jazminAvatar from '../assets/avatars/jazmin.png';
import emmanuelAvatar from '../assets/avatars/emmanuel.png';
import phiaAvatar from '../assets/avatars/phia.png';
import biancaAvatar from '../assets/avatars/bianca.png';
import chryztelAvatar from '../assets/avatars/chryztel.png';
import lesterAvatar from '../assets/avatars/lester.png';
import kateAvatar from '../assets/avatars/kate.png';
import mariaOrtizAvatar from '../assets/avatars/maria_ortiz.png';
import alyssaAvatar from '../assets/avatars/alyssa.png';

export const STUDENT_AVATAR_ASSETS = {
  // 1. Angel Lae Martinez (3rd year, BLK 2)
  '24-0041-147': angelAvatar,
  'Angel Lae Martinez': angelAvatar,

  // 2. Jennelyn Vergara (3rd year, BLK 2)
  '24-2026-340': jennelynAvatar,
  'jennelynvergara@gmail.com': jennelynAvatar,
  'jennelyn@gmail.com': jennelynAvatar,
  'Jennelyn Vergara': jennelynAvatar,

  // 3. Jeane Kelly Mina (3rd year, BLK 2)
  '24-1003-101': jeaneAvatar,
  'jeanekellymina@gmail.com': jeaneAvatar,
  'jeanekelly@gmail.com': jeaneAvatar,
  'Jeane Kelly Mina': jeaneAvatar,

  // 4. Jazmin Bayudan (3rd year, BLK 2)
  '24-2745-132': jazminAvatar,
  'jazminbayudan@gmail.com': jazminAvatar,
  'jazmin@gmail.com': jazminAvatar,
  'Jazmin Bayudan': jazminAvatar,

  // 5. Phia Cayetano (4th year, BLK 1)
  '24-4011-088': phiaAvatar,
  'phia.cayetano@gmail.com': phiaAvatar,
  'Phia Cayetano': phiaAvatar,

  // 6. Juan Dela Cruz (2nd year, BLK 2)
  '24-0031-267': juanAvatar,
  'jualdelacruz@gmail.com': juanAvatar,
  'juan.delacruz@gmail.com': juanAvatar,
  'Juan Dela Cruz': juanAvatar,

  // 7. Maria Reyes (1st year, BLK 1)
  '24-8521-063': mariaAvatar,
  'mariareyes@gmail.com': mariaAvatar,
  'maria.reyes@gmail.com': mariaAvatar,
  'Maria Reyes': mariaAvatar,

  // 8. Emmanuel Gaspar (3rd year, BLK 1)
  '24-0132-062': emmanuelAvatar,
  'emmang@gmail.com': emmanuelAvatar,
  'Emmanuel Gaspar': emmanuelAvatar,

  // 9. Reyn Arahan (3rd year, BLK 1)
  '24-7345-853': reynAvatar,
  'reynarahan@gmail.com': reynAvatar,
  'reyn.arahan@gmail.com': reynAvatar,
  'Reyn Arahan': reynAvatar,

  // 10. Bianca Allyzon Antonio (3rd year, BLK 1) - Unique generated avatar
  '24-2026-106': biancaAvatar,
  'bianca@gmail.com': biancaAvatar,
  'Bianca Allyzon Antonio': biancaAvatar,

  // 11. Chryztel Geene Salvador (3rd year, BLK 1) - Unique generated avatar
  '24-2026-107': chryztelAvatar,
  'geene@gmail.com': chryztelAvatar,
  'Chryztel Geene Salvador': chryztelAvatar,

  // 12. John Lester Tan (3rd year, BLK 1) - Unique generated avatar
  '24-2026-108': lesterAvatar,
  'lester@gmail.com': lesterAvatar,
  'John Lester Tan': lesterAvatar,

  // 13. Justine Kate Abello (3rd year, BLK 2) - Unique generated avatar
  '24-2026-109': kateAvatar,
  'kate@gmail.com': kateAvatar,
  'Justine Kate Abello': kateAvatar,

  // 14. Maria Ortiz (3rd year, BLK 1) - Unique avatar distinct from Maria Reyes
  '24-0872-090': mariaOrtizAvatar,
  'maria.ortiz@gmail.com': mariaOrtizAvatar,
  'Maria Ortiz': mariaOrtizAvatar,
  'Maria Santos Ortiz': mariaOrtizAvatar,

  // 15. Alyssa Ramos (1st year, BLK 1) - Unique generated avatar
  '22-0941-301': alyssaAvatar,
  'alyssa.ramos@gmail.com': alyssaAvatar,
  'Alyssa Ramos': alyssaAvatar,
};

/**
 * Resolves initials as first name first letter + last name first letter.
 * E.g., 'Franz Fernando' -> 'FF'
 * E.g., 'Franz Santos Fernando' -> 'FF'
 */
export function getStudentInitials(studentOrName) {
  if (!studentOrName) return 'ST';

  let firstName = '';
  let lastName = '';

  if (typeof studentOrName === 'object') {
    firstName = (studentOrName.first_name || '').trim();
    lastName = (studentOrName.last_name || '').trim();
    if (firstName && lastName) {
      return `${firstName[0]}${lastName[0]}`.toUpperCase();
    }
    const nameStr = (studentOrName.name || studentOrName.full_name || '').trim();
    if (nameStr) {
      const parts = nameStr.split(/\s+/).filter(Boolean);
      if (parts.length >= 2) {
        return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
      }
      return nameStr.slice(0, 2).toUpperCase();
    }
    return 'ST';
  }

  const str = String(studentOrName).trim();
  const parts = str.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return str.slice(0, 2).toUpperCase();
}

/**
 * Returns a deterministic fallback SVG data URI with initials and distinct hue
 */
export function generateInitialsAvatar(studentOrName = '', id = '') {
  const initials = getStudentInitials(studentOrName);
  const nameStr = typeof studentOrName === 'object'
    ? (studentOrName?.name || studentOrName?.full_name || id || 'Student')
    : String(studentOrName || id || 'Student');

  let hash = 0;
  for (let i = 0; i < nameStr.length; i++) {
    hash = nameStr.charCodeAt(i) + ((hash << 5) - hash);
  }

  const palette = [
    { bg: '#234637', text: '#FFFFFF' }, // deep forest green
    { bg: '#1f5139', text: '#FFFFFF' }, // emerald dark green
    { bg: '#2b5a44', text: '#FFFFFF' }, // pine green
    { bg: '#173d2d', text: '#FFFFFF' }, // deep jade
    { bg: '#28533e', text: '#FFFFFF' }, // dark sage
  ];
  const color = palette[Math.abs(hash) % palette.length];

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
    <circle cx="32" cy="32" r="32" fill="${color.bg}"/>
    <text x="50%" y="54%" font-family="system-ui, -apple-system, sans-serif" font-size="24" font-weight="700" fill="${color.text}" text-anchor="middle" dominant-baseline="middle" letter-spacing="0.5">${initials}</text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/**
 * Resolves the appropriate avatar URL or bundled image for a student object or identifier.
 * Prioritizes Supabase `profile_photo`, then unique bundled avatar, then initials SVG.
 */
export function getStudentAvatar(student) {
  if (!student) return null;

  // 1. Direct profile_photo string from Supabase
  if (typeof student === 'string') {
    if (student.startsWith('http://') || student.startsWith('https://') || student.startsWith('data:')) {
      return student;
    }
    if (STUDENT_AVATAR_ASSETS[student]) {
      return STUDENT_AVATAR_ASSETS[student];
    }
    return generateInitialsAvatar(student);
  }

  if (typeof student === 'object') {
    // Check profile_photo field from Supabase
    if (student.profile_photo && typeof student.profile_photo === 'string') {
      const p = student.profile_photo.trim();
      if (p.startsWith('http://') || p.startsWith('https://') || p.startsWith('data:')) {
        return p;
      }
      // If it's a relative path like 'avatars/angel.png'
      const baseName = p.replace(/^avatars\//, '').replace(/\.png$/, '');
      for (const [key, asset] of Object.entries(STUDENT_AVATAR_ASSETS)) {
        if (key.toLowerCase().includes(baseName.toLowerCase())) {
          return asset;
        }
      }
      // If stored in Supabase storage avatars bucket
      try {
        const storagePath = p.replace(/^avatars\//, '');
        const { data } = supabase.storage.from('avatars').getPublicUrl(storagePath);
        if (data?.publicUrl) {
          return data.publicUrl;
        }
      } catch {}
    }

    // Match by student_id
    if (student.student_id && STUDENT_AVATAR_ASSETS[student.student_id]) {
      return STUDENT_AVATAR_ASSETS[student.student_id];
    }

    // Match by name
    const name = student.name || student.full_name;
    if (name && STUDENT_AVATAR_ASSETS[name]) {
      return STUDENT_AVATAR_ASSETS[name];
    }

    // Strictly Angel Lae Martinez (24-0041-147) gets angelAvatar
    if (
      student.student_id === '24-0041-147' ||
      name === 'Angel Lae Martinez'
    ) {
      return angelAvatar;
    }

    // Check direct avatar field if already attached and NOT angelAvatar
    if (student.avatar && typeof student.avatar === 'string' && student.avatar !== angelAvatar) {
      return student.avatar;
    }

    // Generate unique distinct SVG avatar with initials for unmapped new students (e.g. FF for Franz Fernando)
    return generateInitialsAvatar(student, student.student_id);
  }

  return generateInitialsAvatar(String(student));
}

export {
  angelAvatar,
  jennelynAvatar,
  reynAvatar,
  juanAvatar,
  mariaAvatar,
  jeaneAvatar,
  jazminAvatar,
  emmanuelAvatar,
  phiaAvatar,
  biancaAvatar,
  chryztelAvatar,
  lesterAvatar,
  kateAvatar,
  mariaOrtizAvatar,
  alyssaAvatar,
};
