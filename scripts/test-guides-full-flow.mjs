import { createClient } from '@supabase/supabase-js';
import { formatGuideDateDisplay, getGuideSortTime, formatDate } from '../src/lib/guideDateUtils.js';

const supabaseUrl = 'https://ieznsbzddanjwmnpvncs.supabase.co';
const supabaseKey = 'sb_publishable_U9igmXfsc3LK2ota2FuC6w_QxW2ojfr';
const supabase = createClient(supabaseUrl, supabaseKey);

let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passedTests++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failedTests++;
  }
}

async function runTests() {
  console.log('====================================================');
  console.log('🧪 RUNNING LABORATORY GUIDES COMPREHENSIVE TESTS');
  console.log('====================================================\n');

  // TEST 1: Date formatting for newly published guide
  console.log('Test 1: Newly published guide date display');
  const newGuide = {
    id: 'test-new-1',
    category: 'Rules',
    title: 'New Guide Test',
    created_at: '2026-10-23T12:00:00.000Z',
    updated_at: '2026-10-23T12:00:00.000Z'
  };
  const newDisplay = formatGuideDateDisplay(newGuide);
  assert(newDisplay === 'Published Oct 23, 2026', `New guide displays "${newDisplay}" (expected "Published Oct 23, 2026")`);

  // TEST 2: Date formatting for edited guide
  console.log('\nTest 2: Previously published guide that has been edited');
  const editedGuide = {
    id: 'test-edited-1',
    category: 'Rules',
    title: 'Edited Guide Test',
    created_at: '2026-09-01T08:00:00.000Z',
    updated_at: '2026-10-23T12:30:00.000Z'
  };
  const editedDisplay = formatGuideDateDisplay(editedGuide);
  assert(
    editedDisplay === 'Published Sep 01, 2026 • Update Oct 23, 2026',
    `Edited guide displays "${editedDisplay}" (expected "Published Sep 01, 2026 • Update Oct 23, 2026")`
  );

  // TEST 3: Sorting order preserves position on edit, puts newly published at top
  console.log('\nTest 3: Sorting behavior');
  const existingGuideA = { id: 'a', created_at: '2026-09-01T08:00:00.000Z', updated_at: '2026-09-01T08:00:00.000Z' };
  const existingGuideB = { id: 'b', created_at: '2026-09-15T09:00:00.000Z', updated_at: '2026-09-15T09:00:00.000Z' };
  const newlyPublishedGuide = { id: 'c', created_at: '2026-10-23T14:00:00.000Z', updated_at: '2026-10-23T14:00:00.000Z' };

  let list = [existingGuideA, existingGuideB, newlyPublishedGuide].sort((a, b) => getGuideSortTime(b) - getGuideSortTime(a));
  assert(list[0].id === 'c', 'Newly published guide (c) is placed at the very top of the list');
  assert(list[1].id === 'b' && list[2].id === 'a', 'Previous guides maintain created_at descending order');

  // Now simulate editing existingGuideA (updating its updated_at to today)
  const editedGuideA = { ...existingGuideA, updated_at: '2026-10-23T15:00:00.000Z' };
  list = [editedGuideA, existingGuideB, newlyPublishedGuide].sort((a, b) => getGuideSortTime(b) - getGuideSortTime(a));
  assert(list[0].id === 'c', 'Newly published guide remains at top after another guide is edited');
  assert(list[2].id === 'a', 'Edited guide (a) keeps its chronological position based on created_at and does NOT jump to top');

  // TEST 4: Supabase insert, update, check constraints, and clean up
  console.log('\nTest 4: Supabase persistence and constraint compliance');
  const testIso = new Date().toISOString();
  const testTitle = 'Automated Verification Guide ' + Date.now();
  const insertPayload = {
    category: 'How-to',
    title: testTitle,
    content: '<p>Testing guide content persistence.</p>',
    created_at: testIso,
    updated_at: testIso
  };

  const { data: inserted, error: insErr } = await supabase
    .from('guides')
    .insert([insertPayload])
    .select()
    .single();

  assert(!insErr && inserted?.id, `Guide published and saved to Supabase (id: ${inserted?.id})`);
  assert(inserted?.category === 'How-to', `Category saved as "How-to"`);
  assert(new Date(inserted?.created_at).getTime() === new Date(testIso).getTime(), `Original created_at saved correctly`);

  if (inserted?.id) {
    // Wait briefly and edit the guide
    const updateIso = new Date(Date.now() + 5000).toISOString();
    const updatedTitle = testTitle + ' (Edited)';
    const { data: updated, error: updErr } = await supabase
      .from('guides')
      .update({
        title: updatedTitle,
        category: 'Reminder',
        updated_at: updateIso
      })
      .eq('id', inserted.id)
      .select()
      .single();

    assert(!updErr, `Guide successfully edited and saved to Supabase`);
    assert(updated?.title === updatedTitle, `Updated title persisted: "${updated?.title}"`);
    assert(updated?.category === 'Reminder', `Updated category persisted as "Reminder"`);
    assert(new Date(updated?.created_at).getTime() === new Date(testIso).getTime(), `Original created_at preserved unchanged in Supabase`);
    assert(new Date(updated?.updated_at).getTime() === new Date(updateIso).getTime(), `New updated_at timestamp recorded in Supabase`);

    const formattedAfterEdit = formatGuideDateDisplay(updated);
    const expectedPub = formatDate(testIso);
    const expectedUpd = formatDate(updateIso);
    assert(
      formattedAfterEdit === `Published ${expectedPub} • Update ${expectedUpd}`,
      `Formatted date after edit is "${formattedAfterEdit}"`
    );

    // Clean up test record
    const { error: delErr } = await supabase.from('guides').delete().eq('id', inserted.id);
    assert(!delErr, `Test record cleaned up from Supabase`);
  }

  // Summary
  console.log('\n====================================================');
  console.log(`TOTAL PASSED: ${passedTests}`);
  console.log(`TOTAL FAILED: ${failedTests}`);
  console.log('====================================================');

  if (failedTests > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests();
