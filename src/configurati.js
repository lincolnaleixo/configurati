const googleapis = require('googleapis')
const fs = require('fs')
const path = require('path')
const Google = require('./google.js')
const defaultConfig = require('./config.js')

class Config {

	/**
	 * Constructor
	 * @param  {String} type  type of config. valid: gsheets
	 * @param  {Object} options required. spreadsheetId, sheetId, clientSecretPath, gdriveTookenPath
	 */
	constructor(type, options) {

		if (process.env.NODE_ENV === undefined) process.env.NODE_ENV = "PRODUCTION"

		if (type === 'gsheets') {

			this.spreadsheetId = options.spreadsheetId
			this.sheets = googleapis.google.sheets('v4')
			this.sheetId = options.sheetId
			this.google = new Google(options.clientSecretPath, options.gdriveTokenPath)
			this.cacheMinutes = options.cacheMinutes
			this.cacheDir = defaultConfig.cacheFolder

		}

	}

	convertToJson(values) {

		const jsonValues = {}
		let configKey = ''

		for (const row of values) {

			if (row.length === 0) continue

			if (row.length === 1) {

				configKey = row[0]
					.replace('[', '')
					.replace(']', '')
				jsonValues[configKey] = {}

				continue

			}

			if (row.length > 1) {

				const attributeName = row[0]
				const attributeValue = row[1]
				jsonValues[configKey][attributeName] = attributeValue

			}

		}

		return jsonValues

	}

	convertJsonToArray(jsonValues) {

		const firstColumnValues = []
		const secondColumnValues = []
		let isFirstColumn = true

		for (const categoryKey in jsonValues) {

			if (!isFirstColumn) {

				firstColumnValues.push('')
				secondColumnValues.push('')

			}
			isFirstColumn = false

			firstColumnValues.push(`[${categoryKey}]`)
			secondColumnValues.push('')

			for (const attributeName in jsonValues[categoryKey]) {

				firstColumnValues.push(attributeName)
				secondColumnValues.push(jsonValues[categoryKey][attributeName])

			}

		}

		return {
			firstColumnValues,
			secondColumnValues,
		}

	}

	isCacheValid() {

		const today = new Date()
		const cacheFile = path.join(this.cacheDir, 'cache')

		if (!fs.existsSync(this.cacheDir)) {

			fs.mkdirSync(this.cacheDir)

			return false

		}

		if (!fs.existsSync(cacheFile)) return false

		const lastSavedTime = fs.readFileSync(path.join(this.cacheDir, 'cache'))

		const diffTime = Math.abs(today - lastSavedTime)
		const diffMinutes = Math.ceil(diffTime / (1000 * 60))

		return this.cacheMinutes > diffMinutes

	}

	async get() {

		let config = {}

		if (this.isCacheValid()) {

			console.log('Config cache is valid')
			config = fs.readFileSync(path.join(this.cacheDir, 'config.cached.json'))

			return JSON.parse(config)

		}

		console.log('No config cache')

		const auth =	await this.google.selectAuth()
		const request = {
			spreadsheetId: this.spreadsheetId,
			range: `${this.sheetId}!A1:Z300`,
			auth,
		}
		const response = await this.sheets.spreadsheets.values.get(request)
		const { values } = response.data

		const jsonData = this.convertToJson(values)

		const today = new Date()

		fs.writeFileSync(path.join(this.cacheDir, 'cache'), today.getTime())
		fs.writeFileSync(path.join(this.cacheDir, 'config.cached.json'), JSON.stringify(jsonData))

		return jsonData

	}

	async set(config) {

		const auth =	await this.google.selectAuth()
		const arrayValues = this.convertJsonToArray(config)

		let request = {
			spreadsheetId: this.spreadsheetId,
			range: 'A1',
			valueInputOption: 'USER_ENTERED',
			resource: {
				values: [ arrayValues.firstColumnValues ],
				majorDimension: 'COLUMNS',
			},
			auth,
		}

		await this.sheets.spreadsheets.values.update(request)

		request = {
			spreadsheetId: this.spreadsheetId,
			range: 'B1',
			valueInputOption: 'USER_ENTERED',
			resource: {
				values: [ arrayValues.secondColumnValues ],
				majorDimension: 'COLUMNS',
			},
			auth,
		}

		await this.sheets.spreadsheets.values.update(request)

		console.log('Config saved')

		// const { values } = response.data

		// const today = new Date()

		// fs.writeFileSync(path.join(this.cacheDir, 'cache'), today.getTime())
		// fs.writeFileSync(path.join(this.cacheDir, 'config.cached.json'), JSON.stringify(config))

	}

}

module.exports = Config
