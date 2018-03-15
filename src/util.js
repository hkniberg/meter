const fs = require("fs")

/**
 * Takes an array like this:
 * ["blue", "green", "red", "yellow", "pink"]
 *
 * And if batchSize is 2 then it returns this:
 * [
 *  ["blue", "green"],
 *  ["red", "yellow"],
 *  ["pink"]
 * ]
 *
 * @param array
 * @param batchSize
 */
exports.batchArrayItems = function(array, batchSize) {
  console.assert(batchSize && (batchSize > 0), "batchSize must be given, and > 0. I got ", batchSize)

  if (!array) {
    return null
  }
  if (array.length == 0) {
    return []
  }

  const batches = [[]]
  array.forEach((item) => {
    const lastBatch = batches[batches.length - 1]
    if (lastBatch.length < batchSize) {
      //last batch is not full. Add this item to the last batch.
      lastBatch.push(item)
    } else {
      //last batch is full. Start a new batch
      batches.push([item])
    }
  })
  return batches
}

exports.makeDirIfMissing = function(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir)
    console.log("Created dir: " + dir)
  }
}

/*
   Returns a promise that executes the given tasks, in sequence.
   Resolves with an array of all results (I think).

   Each given task should be a function that returns a promise.

   The reason why we take that instead of just promises directly,
   is because promises start executing directly on creation.
   We don't want that. We want to execute them in sequence.
 */
exports.executeTasksInSequence = function(tasks) {
  //This icky code is explained here: https://decembersoft.com/posts/promises-in-serial-with-array-reduce/
  return tasks.reduce((promiseChain, currentTask) => {
    return promiseChain.then(chainResults =>
      new Promise(currentTask).then(currentResult =>
        [ ...chainResults, currentResult ]
      )
    );
  }, Promise.resolve([]))
}

