// The banner that declares the archive frozen.
//
// Every page under curriculum/ carries this. The freeze has to be *declared*,
// not merely implied by neglect: a stranger arriving from a search result in
// 2029 needs to know at a glance that they are reading a record of something
// that finished, not a live site.
//
// The "All 20 days" link points at curriculum/index.html, so its relative path
// depends on how deep the page sits below the repo root:
//   depth 1  curriculum/handouts.html            -> ./
//   depth 2  curriculum/day-8-the-vote/index.html -> ../

const STYLE = 'background:#1C3743;color:#C7BCA0;padding:.7em 1em;text-align:center;font-size:.95em;border-bottom:2px solid #A9781F;';
const LINK_STYLE = 'color:#D8B25A;';

export function archiveNotice(depth = 2) {
  const home = depth <= 1 ? './' : '../'.repeat(depth - 1);
  return `<div class="archive-notice" style="${STYLE}">
This unit ran July 6 – August 6, 2026 at Collins Middle School, Salem MA. <b>Archived as taught.</b> Not maintained. <a href="${home}" style="${LINK_STYLE}">All 20 days</a>
</div>`;
}

// Inserts the notice directly after the opening <body> tag. Idempotent: a page
// that already carries one is returned unchanged, so re-running a generator
// never stacks two banners.
export function withArchiveNotice(html, depth = 2) {
  if (html.includes('class="archive-notice"')) return html;
  return html.replace(/(<body[^>]*>)/, `$1\n${archiveNotice(depth)}`);
}
