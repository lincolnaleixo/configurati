/* eslint-disable require-jsdoc */
process.env.NODE_ENV = 'DEVELOPMENT'
const GitHub = require('github-api')
const fetch = require('node-fetch')
const Configurat = require('../src/configurati')
const gDriveOptions = require('./gDriveOptions.js')
const githubRepoOptions = require('./githubRepoOptions.js')
const type = 'githubRepo'
const config = new Configurat(type, githubRepoOptions)

async function test() {
	const cfg = await config.get()
	// await config.set(cfg)
	console.log(cfg)
}

test()
