#!/usr/bin/env node
'use strict'

const yargs = require('yargs')
const chalk = require('chalk')
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
    'see what steps are going to be made',
    fileNameArg,
    async (argv) => {
      const steps = await plan(argv.fileName)
      const grayEmoji = emoji =>
        process.stdout.isTTY
          ? chalk.gray(emoji)
          : ''
      for (const {type, name} of steps) {
        if (type === 'deploy') {
          console.log(grayEmoji('⬆ ') + chalk.green('deploy') + ' ' + name)
        }
        if (type === 'undeploy') {
          console.log(grayEmoji('💣 ') + chalk.red('undeploy'), name)
        }
      }
    }
  )
  .argv

yargs
  .command(
    'deploy [fileName]',
    'run a deployment or update',
    fileNameArg,
    async (argv) => {
      try {
        await deploy(argv.fileName)
      } catch (e) {
        console.error(e)
        process.exit(1)
      }
    }
  )
  .argv

