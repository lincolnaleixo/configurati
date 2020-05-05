/* eslint-disable require-jsdoc */
process.env.NODE_ENV = 'DEVELOPMENT'
const GitHub = require('github-api')
const fetch = require('node-fetch')
const Configurat = require('../src/configurati')
const gDriveOptions = require('./gDriveOptions.js')
const githubRepoOptions = require('./githubRepoOptions.js')
const type = 'gsheets'
const config = new Configurat(type, gDriveOptions)
const Cryptologist = require('../lib/cryptologist')

async function test() {
	// const crypto = new Cryptologist()
	// const hw = encrypt('Some serious stuff')
	// console.log(hw)
	// console.log(decrypt(hw))
	// process.env.NODE_ENV = 'PRODUCTION'
	const cfg = await config.get()
	console.log(cfg)
	// await config.set(cfg)
	// const toEncrypt = JSON.stringify(cfg)
	// const encryptedConfig = crypto.encrypt(toEncrypt)
	// console.log(encryptedConfig)
	// console.log(crypto.decrypt(encryptedConfig))
}

test()
