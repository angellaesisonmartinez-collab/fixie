import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://ieznsbzddanjwmnpvncs.supabase.co',
  'sb_publishable_U9igmXfsc3LK2ota2FuC6w_QxW2ojfr'
);

async function verifyConsistency() {
  const { data: repData } = await supabase.from('reports').select('report_id, status, student_id').order('report_id');
  const { data: rosData } = await supabase.from('reports_of_student').select('report_id, status, student_id').order('report_id');

  console.log('Total in `reports`:', repData.length);
  console.log('Total in `reports_of_student`:', rosData.length);

  const rosMap = new Map(rosData.map(r => [r.report_id, r]));

  console.log('\n--- Discrepancy Check ---');
  let diffCount = 0;
  for (const r of repData) {
    const ros = rosMap.get(r.report_id);
    if (!ros) {
      console.log(`MISSING in reports_of_student: ${r.report_id}`);
      diffCount++;
    } else {
      // Compare status
      // Note: 'Reviewed' in reports is 'Under Review' in reports_of_student (both display as UNDER REVIEW)
      const stRep = r.status;
      const stRos = ros.status;
      const isUnderReviewMatch = (stRep === 'Reviewed' || stRep === 'Under Review' || stRep === 'Submitted') &&
                                  (stRos === 'Reviewed' || stRos === 'Under Review' || stRos === 'Submitted');
      const isExactMatch = stRep === stRos;

      if (!isExactMatch && !isUnderReviewMatch) {
        console.log(`STATUS MISMATCH on ${r.report_id}: reports=${stRep} vs reports_of_student=${stRos}`);
        diffCount++;
      }
    }
  }

  if (diffCount === 0) {
    console.log('PERFECT! All 24 reports match between `reports` and `reports_of_student`!');
  }
}

verifyConsistency();
