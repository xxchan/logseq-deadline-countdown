const SETTINGS_SCHEMA = [
  {
    key: 'show-future',
    type: 'boolean',
    title: 'Future',
    description: 'Add annotation for events in the future',
    default: true,
  },
  {
    key: 'show-past',
    type: 'boolean',
    title: 'Past',
    description: 'Add annotation for events in the past',
    default: true,
  },
  {
    key: 'minimum-interval',
    type: 'enum',
    title: 'Minimum interval',
    enumPicker: 'select',
    enumChoices: ['days', 'hours', 'minutes', 'seconds'],
    description: 'If set to hours, the annotation will only be shown if the interval is at least an hour.',
    default: 'hours',
  },
  {
    key: 'update-on-edit',
    type: 'boolean',
    title: 'Update on edit',
    description: 'Dynamically updates annotations when the time is edited. Requires a page refresh to apply. Note: May have a noticeable performance impact on pages with many schedule/deadline entries.',
    default: true,
  },
  {
    key: 'update-interval',
    type: 'number',
    title: 'Update interval',
    description: 'Update annotations at this interval (seconds). Any value below 1 disables this feature. Note: Updates have a performance cost. Setting the value lower than 600 (10 minutes) is not recommended.',
    default: 0,
  },
];


const INTERVALS = [
  ['d', 86400],
  ['h', 3600],
  ['m', 60],
  ['s', 1],
];


const INTERVALS_LOOKUP = Object.fromEntries(INTERVALS);


let cfgShowFuture = true, cfgShowPast = true, cfgMinInterval = 60, cfgUpdateOnEdit = true, cfgUpdateInterval = null;

let updateTimer = null;


function settingsHandler(newSettings, _oldSettings) {
  cfgShowFuture = newSettings['show-future'] !== false;
  cfgShowPast = newSettings['show-past'] !== false;
  cfgUpdateOnEdit = newSettings['update-on-edit'] !== false;
  cfgMinInterval = INTERVALS_LOOKUP[(newSettings['minimum-interval'] || 'm')[0]];
  if (updateTimer) {
    clearTimeout(updateTimer);
    updateTimer = null;
  }
  cfgUpdateInterval = newSettings['update-interval'];
  if (isNaN(cfgUpdateInterval) || cfgUpdateInterval < 1) {
    cfgUpdateInterval = null;
  } else {
    updateTimer = setTimeout(deadlineTimer, cfgUpdateInterval * 1000);
  }
}


function prettyTimeDifference(sec, minSec) {
  minSec = minSec === undefined ? 60 : minSec;
  let result = [];
  for (const [label, interval] of INTERVALS) {
    if (sec < minSec) break;
    if (sec < interval) continue;
    const count = Math.trunc(sec / interval);
    sec -= interval * count;
    result.push(`${count}${label}`);
  }
  return result.join(' ');
}


function updateDeadline(dcEl) {
  const now = Math.trunc((new Date()).valueOf() / 1000);
  const then = parseInt(dcEl.getAttribute('data-timestamp'));
  const isFuture = then >= now;
  const isHidden = (isFuture && !cfgShowFuture) || (!isFuture && !cfgShowPast);

  dcEl.classList.remove(isFuture ? 'lsp-deadline-countdown-past' : 'lsp-deadline-countdown-future');
  dcEl.classList.add(isFuture ? 'lsp-deadline-countdown-future' : 'lsp-deadline-countdown-past');
  isHidden ? dcEl.classList.add('hidden') : dcEl.classList.remove('hidden');
  if (isHidden) {
    dcEl.textContent = '';
    return;
  }

  const diff = Math.abs(then - now);
  const prettyDiff = prettyTimeDifference(diff, cfgMinInterval);
  if (prettyDiff === '') {
    dcEl.textContent = '';
    return;
  }
  dcEl.textContent = ` (${then >= now ? 'in' : 'past'} ${prettyDiff})`;
}


function renderCountdown(timeEl) {
  if (!timeEl) return;
  const timeText = timeEl.textContent, now = new Date();
  const timeTextParts = timeText.split(' ');
  const timePart = timeTextParts[2] && !isNaN(timeTextParts[2][0]) ? timeTextParts[2] : '';
  const then = new Date(timeTextParts[0].concat(' ', timePart));
  if (isNaN(then.valueOf())) return;

  let dcEl = timeEl.parentElement.querySelector('time ~ .lsp-deadline-countdown');
  if (!dcEl) {
    dcEl = parent.document.createElement('span');
    dcEl.classList.add('lsp-deadline-countdown');
    timeEl.insertAdjacentElement('afterend', dcEl);
    if (cfgUpdateOnEdit) {
      const observer = new MutationObserver(mutationList => mutationList.forEach(
        mutation => mutation.type === 'characterData' ? renderCountdown(mutation.target.parentElement) : undefined
      ));
      // Note: Disconnect shouldn't be necessary here as the observer will be GCed when the element is deleted.
      observer.observe(timeEl, { characterData: true, subtree: true });
    }
  }
  dcEl.setAttribute('data-timestamp', Math.trunc(then.valueOf() / 1000));
  updateDeadline(dcEl);
}


function deadlineTimer() {
  parent.document.querySelectorAll('.lsp-deadline-countdown').forEach(updateDeadline);
  updateTimer = cfgUpdateInterval ? setTimeout(deadlineTimer, cfgUpdateInterval * 1000) : null;
}


async function main() {
  logseq.onSettingsChanged(settingsHandler);
  logseq.useSettingsSchema(SETTINGS_SCHEMA);
  const pluginId = logseq.baseInfo.id
  console.info(`#${pluginId}: MAIN`)

  const timestampSelector = '.timestamp time';
  const observer = new MutationObserver(mutationList => mutationList.forEach(mutation => mutation.addedNodes.forEach(
    node => node.querySelectorAll ? node.querySelectorAll(timestampSelector).forEach(renderCountdown) : undefined
  )));
  observer.observe(parent.document.body, {
    subtree: true,
    childList: true,
  });
  logseq.beforeunload(async () => {
    observer.disconnect();
    if (updateTimer) {
      clearTimeout(updateTimer);
      updateTimer = null;
    }
  });
}

// bootstrap
logseq.ready(main).catch(console.error);
