const googleapis = require('googleapis')
const fs = require('fs')
const path = require('path')
const Google = require('./google.js')
const defaultConfig = require('../config/config.js')
const Logger = require('../lib/logger.js')

/**
 * Config class that sets defaults for configurati
 */
class Config {

	/**
	 * Constructor
	 * @param  {String} type  type of config. valid: gsheets
	 * @param  {Object} options required. spreadsheetId, sheetId, clientSecretPath, gdriveTookenPath
	 */
	constructor(type, options) {
		if (process.env.NODE_ENV === undefined) process.env.NODE_ENV = 'PRODUCTION'
		this.logger = new Logger('configurati')
		this.logger = this.logger.get()

		if (type === 'gsheets') {
			this.spreadsheetId = options.spreadsheetId
			this.sheets = googleapis.google.sheets('v4')
			this.sheetId = options.sheetId
			this.google = new Google(options.clientSecretPath, options.gdriveTokenPath)
			this.cacheMinutes = options.cacheMinutes
			this.cacheDir = defaultConfig.cacheFolder
		}
	}

	// TODO migrar para cawer
	/**
	 * Convert to JSON
	 * @param {Object} values
	 */
	convertToJson(values) {
		const jsonValues = {}
		let categoryName = ''
		let subCategoryName = ''

		for (const row of values) {
			if (row.length === 0) continue

			// is category key row
			if (row.length === 1) {
				categoryName = row[0]
					.replace('[', '')
					.replace(']', '')

				if (categoryName.indexOf('.') > -1) {
					[ categoryName, subCategoryName ] = categoryName.split('.')
					jsonValues[categoryName] = {}
					jsonValues[categoryName][subCategoryName] = { }
				} else {
					jsonValues[categoryName] = {}
					subCategoryName = ''
				}

				continue
			}

			// is attr + value row
			if (row.length > 1) {
				const attributeName = row[0]
				const attributeValue = row[1]
				if (subCategoryName !== '') {
					jsonValues[categoryName][subCategoryName][attributeName] = attributeValue
				} else { jsonValues[categoryName][attributeName] = attributeValue }
			}
		}

		return jsonValues
	}

	// TODO migrar para cawer
	/**
	 * Convert Json to array method
	 * @param {Object} jsonValues
	 */
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

	// TODO migrar para cawer
	/**
	 * Check if the cached is valid. If exists and if it's not expired
	 */
	isCacheValid() {
		const today = new Date()
		const configCachedFile = path.join(this.cacheDir, 'config.cached.json')

		if (!fs.existsSync(this.cacheDir)) {
			fs.mkdirSync(this.cacheDir)

			return false
		}

		if (!fs.existsSync(configCachedFile)) {
			this.logger.debug(`File ${configCachedFile} does not exists`)

			return false
		}

		const lastSavedTime = JSON.parse(fs.readFileSync(configCachedFile)).cacheTime
		const diffTime = Math.abs(today - lastSavedTime)
		const diffMinutes = Math.ceil(diffTime / (1000 * 60))

		return this.cacheMinutes > diffMinutes
	}

	/**
	 * Get config data
	 */
	async get() {
		let config = {}

		if (!this.isCacheValid()) {
			this.logger.debug('Warn: No config cache, refreshing it')

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
			const cacheInfo = {}
			cacheInfo.cacheTime = today.getTime()
				.toString()
			cacheInfo.data = jsonData

			fs.writeFileSync(path.join(this.cacheDir, 'config.cached.json'), JSON.stringify(cacheInfo))

			return cacheInfo.data
		}

		this.logger.debug('Config cache is valid')
		config = fs.readFileSync(path.join(this.cacheDir, 'config.cached.json'))

		return JSON.parse(config).data
	}

	/**
	 * Set config data
	 * @param {Object} config
	 */
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

		this.logger.debug('Config saved')

		// const { values } = response.data

		// const today = new Date()

	// fs.writeFileSync(path.join(this.cacheDir, 'cache'), today.getTime())
	// fs.writeFileSync(path.join(this.cacheDir, 'config.cached.json'), JSON.stringify(config))
	}

}

module.exports = Config
