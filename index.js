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
    description: 'If set to hours, the annotation will only be added if the interval is at least an hour. Note: Annotations are only generated when the page loads and do not update in real time.',
    default: 'hours',
  },
];


const INTERVALS = [
  ['d', 86400],
  ['h', 3600],
  ['m', 60],
  ['s', 1],
];


const INTERVALS_LOOKUP = Object.fromEntries(INTERVALS);


let cfgShowFuture = true, cfgShowPast = true, cfgMinInterval = 60;


function settingsHandler(newSettings, _oldSettings) {
  cfgShowFuture = newSettings['show-future'] !== false;
  cfgShowPast = newSettings['show-past'] !== false;
  cfgMinInterval = INTERVALS_LOOKUP[(newSettings['minimum-interval'] || 'm')[0]];
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

function prettyDiff(then, now, minInterval) {
  if (then < now && !cfgShowPast) return;
  if (then > now && !cfgShowFuture) return;

  let diff;
  if (minInterval == INTERVALS_LOOKUP['d']) {
    // When "Minimum Interval" option is set to "days", 
    // diff should be calculated by date difference,
    // ignoring hours.
    const diffDays = Math.round(Math.abs(then.setHours(12) - now.setHours(12)) / 8.64e7);
    diff = `${diffDays}d`;
  } else {
    diff = prettyTimeDifference(Math.floor(Math.abs(then - now) / 1000), minInterval);
  }

  return diff;
}

function renderCountdown(el) {
  const time = el.querySelector("time");
  if (!time) return;
  // timeText is like: 2022-08-28 Sun 13:25
  const timeText = time.textContent, now = new Date();
  const timeTextParts = timeText.split(' ');
  const timePart = timeTextParts[2] && !isNaN(timeTextParts[2][0]) ? timeTextParts[2] : '';
  const then = new Date(timeTextParts[0].concat(' ', timePart));

  const diff = prettyDiff(then, now, cfgMinInterval);
  if (diff === '') return;
  if (diff === '0d') {
    time.textContent = `${timeText} (today)`;
  } else {
    time.textContent = `${timeText} (${then >= now ? 'in' : 'past'} ${diff})`;
  }
}

function tests() {
  function assertEq(expected, actual) {
    if (!(expected === actual)) {
      console.error(`expected: ${expected}, actual: ${actual}`);
    }
  }

  assertEq("1d", prettyDiff(new Date("2022-08-28 23:59"), new Date("2022-08-29 00:00"), INTERVALS_LOOKUP['d']));
  assertEq("", prettyDiff(new Date("2022-08-28 23:59"), new Date("2022-08-29 00:00"), INTERVALS_LOOKUP['h']));

  assertEq("1d", prettyDiff(new Date("2022-08-28 00:00"), new Date("2022-08-29 23:59"), INTERVALS_LOOKUP['d']));
  assertEq("1d 23h", prettyDiff(new Date("2022-08-28 00:00"), new Date("2022-08-29 23:59"), INTERVALS_LOOKUP['h']));

  assertEq("2d", prettyDiff(new Date("2022-08-28 12:00"), new Date("2022-08-30 11:00"), INTERVALS_LOOKUP['d']));
  assertEq("1d 23h", prettyDiff(new Date("2022-08-28 12:00"), new Date("2022-08-30 11:00"), INTERVALS_LOOKUP['h']));

  assertEq("", prettyDiff(new Date("2022-08-29 00:00"), new Date("2022-08-29 23:59"), INTERVALS_LOOKUP['d']));
  assertEq("23h", prettyDiff(new Date("2022-08-29 00:00"), new Date("2022-08-29 23:59"), INTERVALS_LOOKUP['h']));
}

// uncomment to test
// tests()

async function main() {
  logseq.onSettingsChanged(settingsHandler);
  logseq.useSettingsSchema(SETTINGS_SCHEMA);
  const pluginId = logseq.baseInfo.id
  console.info(`#${pluginId}: MAIN`)

  const observer = new MutationObserver((mutationList) => {
    for (const mutation of mutationList) {
      for (const node of mutation.addedNodes) {
        if (node.querySelectorAll) {
          const nodes = node.querySelectorAll(".timestamp")
          for (const n of nodes) {
            renderCountdown(n)
          }
        }
      }
    }
  })
  observer.observe(parent.document.body, {
    subtree: true,
    childList: true,
  })
  logseq.beforeunload(async () => {
    observer.disconnect()
  })
}

// bootstrap
logseq.ready(main).catch(console.error);
