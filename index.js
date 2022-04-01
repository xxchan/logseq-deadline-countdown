function renderCountdown(el, dateFormat) {
  // add a countdown to the element
  // change <time>2022-02-05 Sat</time> to <time>2022-02-05 Sat(x days left)</time>
  const time = el.querySelector("time")
  const timeText = time.textContent

  const dateFormatParts = dateFormat.split(" ")
  const timeTextParts = timeText.split(" ")
  var timeDate
  if (dateFormatParts.length == 1) {
    timeDate = moment(timeTextParts[0]).toDate()
  } else if (dateFormatParts.length == 2) {
    if (dateFormatParts[0][0] == "E") {
      timeDate = moment(timeTextParts[1]).toDate()
    } else {
      timeDate = moment(timeTextParts[0]).toDate()
    }
  } else {
    console.error("Not supported dateFormat: ", dateFormat)
  }

  const now = new Date()
  const daysDiff = daysDifference(now, timeDate)
  const daysText = daysDiff === 1 ? "day" : "days"
  time.textContent = `${timeText} (${daysDiff} ${daysText} left)`
}

function daysDifference(d0, d1) {
  var diff = d1.setHours(12) - d0.setHours(12);
  return Math.round(diff / 8.64e7);
}

async function main() {
  const pluginId = logseq.baseInfo.id
  console.info(`#${pluginId}: MAIN`)

  const dateFormat = (await logseq.App.getUserConfigs()).preferredDateFormat

  const observer = new MutationObserver((mutationList) => {
    for (const mutation of mutationList) {
      for (const node of mutation.addedNodes) {
        if (node.querySelectorAll) {
          const nodes = node.querySelectorAll(".timestamp")
          for (const n of nodes) {
            renderCountdown(n, dateFormat)
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