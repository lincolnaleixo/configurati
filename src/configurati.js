/* eslint-disable complexity */
/* eslint-disable prefer-destructuring */
/* eslint-disable require-jsdoc */
const googleapis = require('googleapis')
const fs = require('fs')
const path = require('path')
const GitHub = require('github-api')
const fetch = require('node-fetch')
const Logger = require('logering')
const Google = require('./google.js')
const defaultConfig = require('../config/config.js')
const Cryptologist = require('../lib/cryptologist')

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
		if (options.password) this.crypto = new Cryptologist(options.password)
		this.type = type

		this.cacheMinutes = options.cacheMinutes
		this.cacheDir = defaultConfig.cacheFolder

		if (type === 'gsheets') {
			this.spreadsheetId = options.spreadsheetId
			this.sheets = googleapis.google.sheets('v4')
			this.sheetId = options.sheetId
			this.google = new Google(options.clientSecretPath, options.gdriveTokenPath)
		} else if (type === 'githubRepo') {
			this.token = options.token
			this.username = options.username
			this.repositoryName = options.repositoryName
		}
	}

	/**
	 * Convert google drive document to JSON
	 * @param {Object} values
	 */
	convertGdriveToJson(values) {
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
					jsonValues[categoryName][subCategoryName] = { }
				} else {
					subCategoryName = ''
					jsonValues[categoryName] = {}
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

	/**
	 *
	 * @param {string} rawConfig values from github repo content
	 */
	convertGithubRepoToJson(rawConfig) {
		const jsonValues = {}
		let categoryName = ''
		let subCategoryName = ''

		for (const line of rawConfig.split('\n')) {
			if (line.length === 0) continue

			// is category key row
			if (line[0] === '[' && line[line.length - 1] === ']') {
				categoryName = line.replace('[', '').replace(']', '')

				if (categoryName.indexOf('.') > -1) {
					[ categoryName, subCategoryName ] = categoryName.split('.')
					jsonValues[categoryName][subCategoryName] = { }
				} else {
					subCategoryName = ''
					jsonValues[categoryName] = {}
				}

				continue
			}

			// is attr + value row
			if (line.length > 1) {
				const attributeName = line.split('=')[0]
				const attributeValue = line.split('=')[1]
				if (subCategoryName !== '') {
					jsonValues[categoryName][subCategoryName][attributeName] = attributeValue
				} else { jsonValues[categoryName][attributeName] = attributeValue }
			}
		}

		return jsonValues
	}

	/**
	 * Convert Json to array method
	 * @param {Object} jsonValues
	 */
	convertJsonToGdrive(jsonValues) {
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

	/**
	 * Check if the cached is valid. If exists and if it's not expired
	 */
	isCacheValid() {
		const today = new Date()
		const configCachedFile = path.join(this.cacheDir, 'config.cached')

		if (!fs.existsSync(this.cacheDir)) {
			fs.mkdirSync(this.cacheDir)

			return false
		}

		if (!fs.existsSync(configCachedFile)) {
			this.logger.debug(`File ${configCachedFile} does not exists`)

			return false
		}

		const encryptedConfig = fs.readFileSync(configCachedFile).toString()
		const decryptedConfig = this.crypto.decrypt(encryptedConfig)
		const lastSavedTime = JSON.parse(decryptedConfig).cacheTime
		const diffTime = Math.abs(today - lastSavedTime)
		const diffMinutes = Math.ceil(diffTime / (1000 * 60))

		return this.cacheMinutes > diffMinutes
	}

	get() {
		if (this.type === 'githubRepo') return this.getConfigFromGithubRepo()
		if (this.type === 'gsheets') return this.getConfigFromGSheets()

		this.logger.error('No type specified')

		return Promise.resolve()
	}

	async getConfigFromGithubRepo() {
		if (!this.isCacheValid()) {
			this.logger.debug('No valid config cache, refreshing it')
			const cacheInfo = {}
			const gh = new GitHub({ token: this.token })
			const contents = await gh.getRepo(this.username, this.repositoryName)
				.getContents()
			const fileUrl = contents.data[0].download_url
			const response = await fetch(fileUrl)
			const rawConfig = await response.text()
			const jsonData = this.convertGithubRepoToJson(rawConfig)
			const today = new Date()

			cacheInfo.cacheTime = today.getTime().toString()
			cacheInfo.data = jsonData
			const toEncrypt = JSON.stringify(cacheInfo)
			const encryptedConfig = this.crypto.encrypt(toEncrypt)
			fs.writeFileSync(path.join(this.cacheDir, 'config.cached'),
				encryptedConfig)

			return cacheInfo.data
		}

		this.logger.debug('Config cache is valid')
		const encryptedConfig = fs.readFileSync(path.join(this.cacheDir, 'config.cached')).toString()
		const decryptedConfig = this.crypto.decrypt(encryptedConfig)

		return JSON.parse(decryptedConfig).data
	}

	async getConfigFromGSheets() {
		if (!this.isCacheValid()) {
			this.logger.debug('No valid config cache, refreshing it')
			const auth =	await this.google.selectAuth()
			const request = {
				spreadsheetId: this.spreadsheetId,
				range: `${this.sheetId}!A1:Z300`,
				auth,
			}
			const response = await this.sheets.spreadsheets.values.get(request)
			const rawConfig = response.data.values
			const jsonData = this.convertGdriveToJson(rawConfig)
			const today = new Date()
			const cacheInfo = {}
			cacheInfo.cacheTime = today.getTime()
				.toString()
			cacheInfo.data = jsonData
			const toEncrypt = JSON.stringify(cacheInfo)
			const encryptedConfig = this.crypto.encrypt(toEncrypt)
			fs.writeFileSync(path.join(this.cacheDir, 'config.cached'),
				encryptedConfig)

			return cacheInfo.data
		}

		this.logger.debug('Config cache is valid')
		const encryptedConfig = fs.readFileSync(path.join(this.cacheDir, 'config.cached')).toString()
		const decryptedConfig = this.crypto.decrypt(encryptedConfig)

		return JSON.parse(decryptedConfig).data
	}

	/**
	 * Set config data
	 * @param {Object} config
	 */
	async set(config) {
		const auth =	await this.google.selectAuth()
		const arrayValues = this.convertJsonToGdrive(config)

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
	// fs.writeFileSync(path.join(this.cacheDir, 'config.cached'), JSON.stringify(config))
	}

}

module.exports = Config
