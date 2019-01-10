const chai = require("chai");
const expect = chai.expect

const PersistentCounter = require('../src/persistent_counter')
const rmdirRecursiveSync = require('rmdir-recursive').sync

const fs = require('fs')
const path = require('path')

const testFilesDir = path.resolve(__dirname, "..", "tempTestFiles")
const counterFile = path.resolve(testFilesDir, "test-counter")
let counter

describe('PulseProcessor', function() {

  beforeEach(function () {
    fs.mkdirSync(testFilesDir)
    counter = new PersistentCounter(counterFile)
  })

  afterEach(function() {
    rmdirRecursiveSync(testFilesDir)
  })

  it('can read empty file', function() {
    expect(counter.getCount()).to.equal(0)
  })

  it('can read invalid file', function() {
    fs.writeFileSync(counterFile, "bla")

    expect(counter.getCount()).to.equal(0)
  })

  it('can increment empty file', function() {
    counter.increment()
    expect(counter.getCount()).to.equal(1)
  })

  it('can increment invalid file', function() {
    fs.writeFileSync(counterFile, "bla")

    counter.increment()
    expect(counter.getCount()).to.equal(1)
  })

  it('increment returns the new count', function() {
    expect(counter.increment()).to.equal(1)
    expect(counter.increment()).to.equal(2)
  })

  it('new instances uses same file', function() {
    counter.increment()
    counter.increment()

    const counter2 = new PersistentCounter(counterFile)
    expect(counter2.getCount()).to.equal(2)
  })
})