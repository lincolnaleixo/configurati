/* eslint-disable node/no-unpublished-require */
/* eslint-disable require-jsdoc */
const algorithm = 'aes-192-cbc'
const crypto = require('crypto')
const fs = require('fs')
const path = require('path')
// const key = crypto.randomBytes(32)

class Cryptologist {

	/**
	 * @param {any} key
	 */
	constructor(key) {
		this.password = key
	}

	/**
	 * @param {string} text
	 */
	encrypt(text) {
		const key = crypto.scryptSync(this.password, 'salt', 24)
		const iv = Buffer.alloc(16, 0) // Initialization vector.
		const cipher = crypto.createCipheriv(algorithm, key, iv)
		let encrypted = cipher.update(text)
		encrypted = Buffer.concat([ encrypted, cipher.final() ])

		return encrypted.toString('hex')
	}

	/**
	 * @param {string} encryptedText
	 */
	decrypt(encryptedText) {
		try {
			const key = crypto.scryptSync(this.password, 'salt', 24)
			const iv = Buffer.alloc(16, 0) // Initialization vector.
			const decipher = crypto.createDecipheriv(algorithm, key, iv)
			let decrypted = decipher.update(encryptedText, 'hex', 'utf8')
			decrypted += decipher.final('utf8')

			return decrypted.toString()
		} catch (error) {
			if (error.toString().indexOf('bad decrypt') > -1) {
				throw new Error('Wrong password, delete cache file or type the correct password on config')
				// const appDir = path.dirname(require.main.filename)
				// // console.log(appDir)
				// const cachePath = path.join(appDir, '..', 'cache')
				// const cacheFilePath = path.join(cachePath, 'config.cached')
				// if (fs.existsSync(cacheFilePath)) fs.unlinkSync(cacheFilePath)
			}

			// return this.decrypt(encryptedText)
		}

		return ''
	}

}

module.exports = Cryptologist
