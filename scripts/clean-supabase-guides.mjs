import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ieznsbzddanjwmnpvncs.supabase.co';
const supabaseKey = 'sb_publishable_U9igmXfsc3LK2ota2FuC6w_QxW2ojfr';

const supabase = createClient(supabaseUrl, supabaseKey);

function cleanHtml(raw) {
  if (!raw) return '';
  let cleaned = String(raw);
  // Unescape if escaped
  if (/&lt;(?:p|ul|ol|li|b|i|u|strong|em|div|span|br)[\s\/>]/i.test(cleaned)) {
    cleaned = cleaned
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'")
      .replace(/&amp;/gi, '&');
  }
  // Replace &nbsp; and \u00a0 with normal space
  cleaned = cleaned.replace(/&nbsp;/gi, ' ');
  cleaned = cleaned.replace(/&#160;/gi, ' ');
  cleaned = cleaned.replace(/\u00a0/g, ' ');

  // Clean leading spaces after opening tags
  cleaned = cleaned.replace(/(<(?:li|p|ol|ul|div|span|b|strong|i|em|u)[^>]*>)\s+/gi, '$1');
  // Clean trailing spaces before closing tags
  cleaned = cleaned.replace(/\s+(<\/(?:li|p|ol|ul|div|span|b|strong|i|em|u)>)/gi, '$1');

  // Collapse multiple spaces
  cleaned = cleaned.replace(/ {2,}/g, ' ');
  return cleaned.trim();
}

async function run() {
  console.log('Fetching all guides from Supabase...');
  const { data: guides, error } = await supabase.from('guides').select('*');
  if (error) {
    console.error('Error fetching guides:', error);
    process.exit(1);
  }

  let cleanedCount = 0;
  for (const g of guides) {
    const originalContent = g.content || '';
    const cleanedContent = cleanHtml(originalContent);
    const hasNbsp = originalContent.includes('&nbsp;') || originalContent.includes('\u00a0');
    const hasEscaped = /&lt;[a-z]/i.test(originalContent);

    if (hasNbsp || hasEscaped || originalContent !== cleanedContent) {
      console.log(`Cleaning guide: "${g.title}" (ID: ${g.id})`);
      console.log('  Before:', originalContent);
      console.log('  After: ', cleanedContent);

      // Preserve existing timestamps
      const { error: updateError } = await supabase
        .from('guides')
        .update({
          content: cleanedContent,
          updated_at: g.created_at, // Ensure updated_at is not changed on first publish
        })
        .eq('id', g.id);

      if (updateError) {
        console.error('  Update error:', updateError);
      } else {
        console.log('  ✅ Successfully cleaned and preserved updated_at == created_at.');
        cleanedCount++;
      }
    }
  }

  console.log(`\nFinished! Total cleaned guides: ${cleanedCount}`);
}

run();
