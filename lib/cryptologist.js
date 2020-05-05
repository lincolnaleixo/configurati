/* eslint-disable node/no-unpublished-require */
/* eslint-disable require-jsdoc */
const algorithm = 'aes-192-cbc'
const crypto = require('crypto')
// const key = crypto.randomBytes(32)
const { password } = require('../keys/cryptoKey.json')

class Cryptologist {
	encrypt(text) {
		const key = crypto.scryptSync(password, 'salt', 24)
		const iv = Buffer.alloc(16, 0) // Initialization vector.
		const cipher = crypto.createCipheriv(algorithm, key, iv)
		let encrypted = cipher.update(text)
		encrypted = Buffer.concat([ encrypted, cipher.final() ])

		return encrypted.toString('hex')
	}

	decrypt(encryptedText) {
		const key = crypto.scryptSync(password, 'salt', 24)
		const iv = Buffer.alloc(16, 0) // Initialization vector.
		const decipher = crypto.createDecipheriv(algorithm, key, iv)
		let decrypted = decipher.update(encryptedText, 'hex', 'utf8')
		decrypted += decipher.final('utf8')

		return decrypted.toString('hex')
	}

}

module.exports = Cryptologist
