'use strict'

const yargs = require('yargs')
const {plan, deploy} = require('../lib/commands')

const fileNameArg = yargs => {
  yargs.positional('fileName', {
    describe: 'the file to probe',
    default: '.'
  })
}

yargs
  .command(
    'plan [fileName]',
    fileNameArg,
    argv => {
      plan(argv.fileName)
    }
  )
  .command(
    'deploy [fileName]',
    fileNameArg,
    argv => {
      deploy(argv.fileName)
    }
  )

