function renderCountdown(el) {
  // add a countdown to the element
  // change <time>2022-02-05 Sat</time> to <time>2022-02-05 Sat(x days left)</time>
  const time = el.querySelector("time")
  const timeText = time.textContent

  const timeTextParts = timeText.split(" ")
  const timeDate = moment(timeTextParts[0]).toDate()

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