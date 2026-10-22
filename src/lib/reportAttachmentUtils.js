import pc014Monitor from '../assets/report-photos/pc014_monitor_display.jpg';
import pc010Lan from '../assets/report-photos/pc010_network_lan.jpg';
import pc013Power from '../assets/report-photos/pc013_power_unit.jpg';
import pc013Keyboard from '../assets/report-photos/pc013_keyboard.jpg';
import pc004Mouse from '../assets/report-photos/pc004_mouse.jpg';

export const LOCAL_REPORT_PHOTOS = {
  'pc014_monitor_display.jpg': pc014Monitor,
  'pc010_network_lan.jpg': pc010Lan,
  'pc013_power_unit.jpg': pc013Power,
  'pc013_keyboard.jpg': pc013Keyboard,
  'pc004_mouse.jpg': pc004Mouse,
};

/**
 * Utility to resolve accurate and authentic report attachment metadata.
 * Ensures the attachment filename precisely matches the report's PC Unit Number
 * and reported Equipment / Problem.
 *
 * If a report has no photo_url and no attachment, returns null so a clean placeholder is shown.
 */
export function getReportAttachment(report) {
  if (!report) return null;

  const rawUrl = report.photo_url || report.photoUrl || report.attachment?.url || null;
  const rawAtt = report.attachment;

  // If there is strictly no photo_url and no attachment metadata, return null
  if (!rawUrl && !rawAtt) {
    return null;
  }

  // 1. Extract Unit Number (e.g. PC-#10 -> pc010, PC-14 -> pc014)
  const unitRaw = String(report.unit_number || report.unitNumber || 'PC-14');
  const unitMatch = unitRaw.match(/\d+/);
  const pcPrefix = unitMatch ? `pc${unitMatch[0].padStart(3, '0')}` : 'pc014';

  let rawName = null;
  let rawSize = report.attachment_size || report.attachmentSize || '1.4MB';

  if (rawAtt) {
    if (typeof rawAtt === 'string') {
      rawName = rawAtt.split('/').pop() || rawAtt;
    } else if (rawAtt.name) {
      rawName = rawAtt.name;
      if (rawAtt.size) rawSize = rawAtt.size;
    }
  }

  // If photo_url is provided, extract filename if possible
  if (!rawName && rawUrl && typeof rawUrl === 'string') {
    try {
      const urlObj = new URL(rawUrl);
      rawName = decodeURIComponent(urlObj.pathname.split('/').pop() || '');
    } catch {
      rawName = rawUrl.split('/').pop();
    }
  }

  const isOldPlaceholder =
    !rawName ||
    rawName === 'pc014_power_unit.jpg' ||
    rawName === 'attached_photo.jpg' ||
    rawName === 'photo.jpg';

  // If custom authentic filename is present:
  if (!isOldPlaceholder && rawName) {
    const namePcMatch = rawName.match(/^pc\d{3}/i);
    if (!namePcMatch || namePcMatch[0].toLowerCase() === pcPrefix.toLowerCase()) {
      return {
        name: rawName,
        size: rawSize || '1.4MB',
        url: rawUrl || LOCAL_REPORT_PHOTOS[rawName] || null,
        fallbackUrl: LOCAL_REPORT_PHOTOS[rawName] || null,
      };
    }
  }

  // 2. Derive problem/equipment slug matching the actual reported problem and equipment
  const equip = String(report.equipment || '').toLowerCase();
  const desc = String(report.description || '').toLowerCase();

  let issueSlug;
  if (
    equip.includes('network') ||
    equip.includes('internet') ||
    desc.includes('lan') ||
    desc.includes('internet') ||
    desc.includes('rj45') ||
    desc.includes('rj-45') ||
    desc.includes('connection')
  ) {
    issueSlug = 'network_lan';
  } else if (
    equip.includes('monitor') ||
    desc.includes('flicker') ||
    desc.includes('screen') ||
    desc.includes('display') ||
    desc.includes('hdmi') ||
    desc.includes('horizontal lines')
  ) {
    issueSlug = 'monitor_display';
  } else if (
    equip.includes('keyboard') ||
    desc.includes('spacebar') ||
    desc.includes('key')
  ) {
    issueSlug = 'keyboard';
  } else if (
    equip.includes('mouse') ||
    desc.includes('tracking') ||
    desc.includes('sensor') ||
    desc.includes('mousepad') ||
    desc.includes('cursor')
  ) {
    issueSlug = 'mouse';
  } else if (
    desc.includes('power supply') ||
    desc.includes('fan') ||
    desc.includes('rattling') ||
    (equip.includes('power') && !equip.includes('avr') && !equip.includes('ups'))
  ) {
    issueSlug = 'power_unit';
  } else if (
    equip.includes('avr') ||
    equip.includes('ups') ||
    desc.includes('avr') ||
    desc.includes('ups')
  ) {
    issueSlug = 'avr_power';
  } else if (
    equip.includes('system unit') ||
    equip.includes('cpu') ||
    desc.includes('beep') ||
    desc.includes('ram')
  ) {
    issueSlug = 'system_unit';
  } else if (
    equip.includes('software') ||
    equip.includes('os') ||
    desc.includes('compiler') ||
    desc.includes('operating system') ||
    desc.includes('blue screen') ||
    desc.includes('bsod')
  ) {
    issueSlug = 'software_error';
  } else if (
    equip.includes('audio') ||
    equip.includes('headset') ||
    equip.includes('headphone')
  ) {
    issueSlug = 'audio_headset';
  } else if (equip.includes('printer')) {
    issueSlug = 'printer';
  } else {
    const cleanEquip = equip.replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    issueSlug = cleanEquip || 'hardware';
  }

  const generatedName = `${pcPrefix}_${issueSlug}.jpg`;
  const resolvedUrl = rawUrl || LOCAL_REPORT_PHOTOS[generatedName] || null;

  return {
    name: generatedName,
    size: rawSize || '1.4MB',
    url: resolvedUrl,
    fallbackUrl: LOCAL_REPORT_PHOTOS[generatedName] || null,
  };
}
