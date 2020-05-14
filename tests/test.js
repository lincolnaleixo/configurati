/* eslint-disable require-jsdoc */
process.env.NODE_ENV = 'DEVELOPMENT'
const GitHub = require('github-api')
const fetch = require('node-fetch')
const Configurat = require('../src/configurati')
const gDriveOptions = require('./gDriveOptions.js')
const githubRepoOptions = require('./githubRepoOptions.js')
const Cryptologist = require('../lib/cryptologist');

(async () => {
	let config
	if (process.argv.find((item) => item === '--nodeEnv')) {
		process.env.NODE_ENV = process.argv[process.argv.findIndex((item) => item === '--nodeEnv') + 1]
	} else {
		process.env.NODE_ENV = 'PRODUCTION'
		console.log('Using default NODE_ENV PRODUCTION')
	}
	if (process.argv.find((item) => item === '--gsheets')) {
		config = new Configurat('gsheets', gDriveOptions)
	} else if (process.argv.find((item) => item === '--github')) {
		config = new Configurat('githubRepo', githubRepoOptions)
	} else {
		console.log('No config type valid options')
		process.exit(0)
	}

	const cfg = await config.get()
	console.log(cfg)
})()

