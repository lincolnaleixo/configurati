
const googleapis = require('googleapis')
const jsonfile = require('jsonfile')
const Logger = require('logering')

/**
 * Google class to deal with authetication
 */
class Google {

	/**
	 * @param {object} clientSecretPath
	 * @param {object} gdriveTokenPath
	 */
	constructor(clientSecretPath, gdriveTokenPath) {
		this.logger = new Logger('google')
		this.logger = this.logger.get()
		this.clientSecret = jsonfile.readFileSync(clientSecretPath).installed
		this.gDriveToken = jsonfile.readFileSync(gdriveTokenPath)
		this.gdriveTokenPath = gdriveTokenPath

		this.oauth2Client = new googleapis.google.auth.OAuth2(this.clientSecret.client_id,
			this.clientSecret.client_secret,
			this.clientSecret.redirect_uris[0])
	}

	/**
	 * Select google authentication
	 */
	async selectAuth() {
		try {
			this.oauth2Client.setCredentials(this.gDriveToken)
			this.oauth2Client.forceRefreshOnFailure = true
			if (this.oauth2Client.isTokenExpiring()) {
				this.logger.warn('Token expiring, refreshing...')

				await this.oauth2Client.refreshAccessToken()
				const tokensRefreshed = this.oauth2Client.credentials

				this.gDriveToken.access_token = tokensRefreshed.access_token
				this.gDriveToken.expiry_date = tokensRefreshed.expiry_date

				jsonfile.writeFileSync(this.gdriveTokenPath, this.gDriveToken)
				this.oauth2Client.setCredentials(this.gDriveToken)

				this.logger.info('Gdrive token refreshed and updated!')
			}

			return this.oauth2Client
		} catch (err) {
			this.logger.error(`Error on Google - selectAuth: ${err}`)
		}

		return {}
	}

}

module.exports = Google
