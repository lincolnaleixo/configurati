const googleapis = require('googleapis')
const fs = require('fs')
const path = require('path')
const Google = require('./google.js')

class Config {

	/**
	 * Constructor
	 * @param  {String} type  type of config. valid: gsheets
	 * @param  {Object} options required. spreadsheetId, sheetId, clientSecretPath, gdriveTookenPath
	 */
	constructor(type, options) {

		if (type === 'gsheets') {

			this.spreadsheetId = options.spreadsheetId
			this.sheets = googleapis.google.sheets('v4')
			this.sheetId = options.sheetId
			this.google = new Google(options.clientSecretPath, options.gdriveTokenPath)
			this.cacheMinutes = options.cacheMinutes
			this.tempDir = './tmp'

		}

	}

	async get() {

		if (this.isCacheValid()) {

			console.log('Config cache is valid')
			const config = fs.readFileSync(path.join(this.tempDir, 'config.cached.json'))

			return JSON.parse(config)

		}

		console.log('No config cache')

		const config = {}
		const auth =	await this.google.selectAuth()
		const request = {
			spreadsheetId: this.spreadsheetId,
			range: `${this.sheetId}!A1:Z300`,
			auth,
		}
		const response = await this.sheets.spreadsheets.values.get(request)
		const { values } = response.data
		let configCategory

		for (let i = 0; i < values.length; i++) {

			const rows = values[i]

			if (rows.length === 0) { continue }

			if (rows[0].indexOf('[') > -1 && rows[0].indexOf(']') > -1) {

				configCategory = rows[0]
					.replace('[', '')
					.replace(']', '')
				config[configCategory] = {}

			} else if (rows[1]) {

				config[configCategory][rows[0]] = rows[1]

			}

		}

		const today = new Date()
		if (!fs.existsSync(this.tempDir)) fs.mkdirSync(this.tempDir)

		fs.writeFileSync(path.join(this.tempDir, 'cache'), today.getTime())
		fs.writeFileSync(path.join(this.tempDir, 'config.cached.json'), JSON.stringify(config))

		return config

	}

	isCacheValid() {

		const today = new Date()

		const lastSavedTime = fs.readFileSync(path.join(this.tempDir, 'cache'))

		const diffTime = Math.abs(today - lastSavedTime)
		const diffMinutes = Math.ceil(diffTime / (1000 * 60))

		return this.cacheMinutes > diffMinutes

	}

}

module.exports = Config
