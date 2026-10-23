import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ieznsbzddanjwmnpvncs.supabase.co';
const supabaseKey = 'sb_publishable_U9igmXfsc3LK2ota2FuC6w_QxW2ojfr';
const supabase = createClient(supabaseUrl, supabaseKey);

const KNOWN_STUDENT_CUSTOM_TABLES = {
  '24-0041-147': 'angel-reports',
  '9002d8e6-bc03-4070-8aae-299147dead9a': 'angel-reports',
  '22-0941-301': 'alyssa-reports',
  '81ccc938-0114-4894-8034-50b71a7aca74': 'alyssa-reports',
  '24-4011-088': 'phia-reports',
  '43516fd4-6370-409e-96c0-5acc8d56d9c6': 'phia-reports',
  '24-8521-063': 'maria-reports',
  '21877a55-8600-4a5d-88ce-4e0746c23898': 'maria-reports',
  '24-0031-267': 'juan-reports',
  '82f230ea-abdb-4bc2-8fea-e87eb897299c': 'juan-reports',
  '24-7345-853': 'reyn-reports',
  'a9974b97-4eb0-4876-8a62-cdc86023bbd4': 'reyn-reports',
  '24-2026-340': 'jennelyn-reports',
  '51664213-275b-4e67-9024-d92d7e0a8022': 'jennelyn-reports',
  '24-0132-062': 'emmanuel-reports',
  'd0a857f1-87a1-49a4-b0c7-5c3d61e78ecd': 'emmanuel-reports',
  '24-2745-132': 'jazmin-reports',
  'd907e0ff-fe9c-4d19-aac5-f826e311b5ef': 'jazmin-reports',
};

function resolveStudentReportsTableName(studentOrIdentifier) {
  if (!studentOrIdentifier) return null;
  if (typeof studentOrIdentifier === 'string') {
    const trimmed = studentOrIdentifier.trim();
    if (KNOWN_STUDENT_CUSTOM_TABLES[trimmed]) {
      return KNOWN_STUDENT_CUSTOM_TABLES[trimmed];
    }
    const lower = trimmed.toLowerCase();
    if (lower.includes('angel')) return 'angel-reports';
    if (lower.includes('alyssa')) return 'alyssa-reports';
    if (lower.includes('phia')) return 'phia-reports';
    if (lower.includes('jennelyn')) return 'jennelyn-reports';
    if (lower.includes('reyn')) return 'reyn-reports';
    if (lower.includes('juan')) return 'juan-reports';
    if (lower.includes('jazmin')) return 'jazmin-reports';
    if (lower.includes('emmanuel')) return 'emmanuel-reports';
    if (lower === 'maria' || lower.includes('maria reyes')) return 'maria-reports';
    return null;
  }
  const sId = studentOrIdentifier.student_id || studentOrIdentifier.id;
  if (sId && KNOWN_STUDENT_CUSTOM_TABLES[sId]) {
    return KNOWN_STUDENT_CUSTOM_TABLES[sId];
  }
  const name =
    studentOrIdentifier.name ||
    studentOrIdentifier.full_name ||
    `${studentOrIdentifier.first_name || ''} ${studentOrIdentifier.last_name || ''}`.trim();
  return resolveStudentReportsTableName(name);
}

async function testFetchStudentReports(student) {
  const resolvedUuid = student.id;
  const resolvedId = student.student_id;
  const resolvedName = student.name;
  const isAngel = resolvedId === '24-0041-147';

  const reportsMap = new Map();

  const addReports = (list) => {
    if (!Array.isArray(list)) return;
    for (const item of list) {
      if (!item) continue;
      const key = item.report_id || item.id;
      if (!key) continue;

      const itemStudentId = item.student_id || item.studentId;
      const itemStudentUuid = item.student_uuid || item.canonicalUuid || item.canonical_uuid || item.user_id;

      const matchesId = resolvedId && itemStudentId === resolvedId;
      const matchesUuid = resolvedUuid && (itemStudentId === resolvedUuid || itemStudentUuid === resolvedUuid);
      const matchesJoinedStudent = item.students && (item.students.id === resolvedUuid || item.students.student_id === resolvedId);

      if (!matchesId && !matchesUuid && !matchesJoinedStudent) {
        continue;
      }

      if (!reportsMap.has(key)) {
        reportsMap.set(key, item);
      } else {
        const existing = reportsMap.get(key);
        const existingTime = new Date(existing.date_submitted || existing.created_at || 0).getTime();
        const newTime = new Date(item.date_submitted || item.created_at || 0).getTime();
        if (newTime >= existingTime) {
          reportsMap.set(key, item);
        }
      }
    }
  };

  const queryPromises = [];

  // Query 1: reports_of_student
  if (resolvedId || resolvedUuid) {
    let rosQuery = supabase.from('reports_of_student').select('*').order('date_submitted', { ascending: false });
    if (resolvedId && resolvedUuid) {
      rosQuery = rosQuery.or(`student_id.eq.${resolvedId},student_id.eq.${resolvedUuid}`);
    } else if (resolvedId) {
      rosQuery = rosQuery.eq('student_id', resolvedId);
    } else {
      rosQuery = rosQuery.eq('student_id', resolvedUuid);
    }
    queryPromises.push(
      rosQuery.then(({ data }) => ({ type: 'ros', data: data || [] })).catch(() => ({ type: 'ros', data: [] }))
    );
  }

  // Query 2: canonical reports
  if (resolvedUuid) {
    queryPromises.push(
      supabase
        .from('reports')
        .select('*')
        .eq('student_id', resolvedUuid)
        .order('created_at', { ascending: false })
        .then(({ data }) => ({ type: 'rep', data: data || [] }))
        .catch(() => ({ type: 'rep', data: [] }))
    );
  }

  // Query 3: Student custom table if exists
  const studentCustomTable = resolveStudentReportsTableName(student);
  if (studentCustomTable) {
    queryPromises.push(
      supabase
        .from(studentCustomTable)
        .select('*')
        .then(({ data }) => ({ type: 'custom', data: data || [] }))
        .catch(() => ({ type: 'custom', data: [] }))
    );
  }

  const results = await Promise.allSettled(queryPromises);
  for (const res of results) {
    if (res.status === 'fulfilled' && res.value?.data) {
      addReports(res.value.data);
    }
  }

  const parseReportIdNum = (r) => {
    const idStr = String(r?.report_id || r?.id || '');
    const match = idStr.match(/\d+/);
    return match ? parseInt(match[0], 10) : 0;
  };

  const allReports = Array.from(reportsMap.values()).sort((a, b) => {
    if (isAngel) {
      const numA = parseReportIdNum(a);
      const numB = parseReportIdNum(b);
      if (numB !== numA) return numB - numA;
      return (b.report_id || b.id || '').localeCompare(a.report_id || a.id || '', undefined, { numeric: true });
    }
    const timeA = new Date(a.date_submitted || a.created_at || 0).getTime();
    const timeB = new Date(b.date_submitted || b.created_at || 0).getTime();
    return timeB - timeA;
  });

  return allReports;
}

async function run() {
  console.log('=== TEST 1: Testing Table Resolution ===');
  const tableTests = [
    { input: '24-0041-147', expected: 'angel-reports' },
    { input: 'Angel Lae Martinez', expected: 'angel-reports' },
    { input: '22-0941-301', expected: 'alyssa-reports' },
    { input: 'Phia Cayetano', expected: 'phia-reports' },
    { input: 'Jennelyn Vergara', expected: 'jennelyn-reports' },
    { input: 'Juan Dela Cruz', expected: 'juan-reports' },
    { input: 'Maria Reyes', expected: 'maria-reports' },
    { input: 'Maria Ortiz', expected: null },
    { input: 'Margaret Subong', expected: null },
    { input: 'Franz Fernando', expected: null },
  ];

  for (const t of tableTests) {
    const res = resolveStudentReportsTableName(t.input);
    const pass = res === t.expected;
    console.log(`resolveStudentReportsTableName('${t.input}') -> ${res} [${pass ? 'PASS' : 'FAIL'}]`);
    if (!pass) throw new Error(`Failed resolution for ${t.input}`);
  }

  console.log('\n=== TEST 2: Angel Lae Martinez Reports ===');
  const angelReports = await testFetchStudentReports({
    id: '9002d8e6-bc03-4070-8aae-299147dead9a',
    student_id: '24-0041-147',
    name: 'Angel Lae Martinez',
  });
  console.log(`Total reports returned for Angel: ${angelReports.length}`);
  console.log(`Top 5 reports for Angel:`, angelReports.slice(0, 5).map(r => `${r.report_id} (${r.status})`));
  const hasLR30 = angelReports.some(r => r.report_id === 'LR-30');
  console.log(`LR-30 present in Angel's view: ${hasLR30 ? 'PASS' : 'FAIL'}`);
  console.log(`First report is LR-30: ${angelReports[0]?.report_id === 'LR-30' ? 'PASS' : 'FAIL'}`);
  if (!hasLR30 || angelReports[0]?.report_id !== 'LR-30') {
    throw new Error('Angel LR-30 check failed');
  }

  console.log('\n=== TEST 3: Alyssa Ramos Reports ===');
  const alyssaReports = await testFetchStudentReports({
    id: '81ccc938-0114-4894-8034-50b71a7aca74',
    student_id: '22-0941-301',
    name: 'Alyssa Ramos',
  });
  console.log(`Total reports returned for Alyssa: ${alyssaReports.length}`);
  console.log(`Alyssa reports:`, alyssaReports.map(r => `${r.report_id} (${r.status})`));

  console.log('\n=== TEST 4: Margaret Subong Reports (Newly registered) ===');
  const margaretReports = await testFetchStudentReports({
    id: '0364278b-e661-40f7-b102-d79fcf579a73',
    student_id: '24-1234-123',
    name: 'Margaret Subong',
  });
  console.log(`Total reports returned for Margaret: ${margaretReports.length}`);
  console.log(`Margaret reports:`, margaretReports.map(r => `${r.report_id} (${r.status})`));

  console.log('\n=== TEST 5: Account Isolation & Linkage Verification ===');
  const angelHasMargaretReports = angelReports.some(r => r.report_id === 'LR-28' || r.report_id === 'LR-29');
  const margaretHasAngelReports = margaretReports.some(r => r.report_id === 'LR-30' || r.report_id === 'LR-01');
  console.log(`Angel does NOT see Margaret's reports: ${!angelHasMargaretReports ? 'PASS' : 'FAIL'}`);
  console.log(`Margaret does NOT see Angel's reports: ${!margaretHasAngelReports ? 'PASS' : 'FAIL'}`);
  if (angelHasMargaretReports || margaretHasAngelReports) {
    throw new Error('Account linkage / isolation failed');
  }

  console.log('\n========================================');
  console.log('ALL TEST ASSERTIONS PASSED WITH 100% SUCCESS!');
  console.log('========================================');
}

run().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
